import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoseResult } from '@/types';
import { ElbowTimeline } from './ElbowTimeline';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
const seek = vi.fn();

// Deliberately synthetic supplied observations; this never stands in for inference.
function pose(): PoseResult {
  return { width: 200, height: 100, duration: 2, fps: 30, delegate: 'GPU',
    coverage: { totalFrames: 3, framesWithPose: 3, detectionRate: 1, meanVisibility: 1 },
    frames: [0, .3, .8].map((time, index) => {
      const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1 }));
      for (const offset of [0, 1]) {
        landmarks[11 + offset] = { x: .2, y: .4, z: 0, visibility: 1 };
        landmarks[13 + offset] = { x: .2, y: .6, z: 0, visibility: 1 };
        landmarks[15 + offset] = { x: .4, y: .6, z: 0, visibility: 1 };
      }
      return { index: index + 7, time, landmarks, worldLandmarks: null };
    }) };
}
function render(p = pose(), time = 0) {
  act(() => root.render(<ElbowTimeline pose={p} time={time} onSeek={seek} />));
}
function button(label: string) { return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!; }
const left = () => container.querySelector('[aria-label="Left elbow angle"]')!;
beforeEach(() => {
  seek.mockClear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('ElbowTimeline', () => {
  it('shows estimated degrees, actual observation identity and honest limits', () => {
    render(pose(), .3);
    expect(left().textContent).toBe('90°');
    expect(container.textContent).toContain('0.300 s');
    expect(container.textContent).toContain('Observation 8');
    expect(container.textContent).toContain('not a technique assessment');
    expect(container.textContent).toContain('not validated');
  });
  it('delegates previous/next jumps to raw timestamps rather than index/FPS', () => {
    render(pose(), .3);
    act(() => button('Previous angle sample').click());
    act(() => button('Next angle sample').click());
    expect(seek.mock.calls).toEqual([[0], [.8]]);
    render(pose(), 0);
    expect(button('Previous angle sample').disabled).toBe(true);
  });
  it('preserves exact missing data instead of displaying a neighboring value', () => {
    const p = pose(); p.frames[1].landmarks = null;
    render(p, .3);
    expect(left().textContent).toBe('Unavailable');
    expect(container.textContent).toContain('No pose in this observation');
    expect(container.textContent).toContain('Observation 8');
  });
  it('does not hold the last measurement across a long unobserved interval', () => {
    render(pose(), 1.5);
    expect(left().textContent).toBe('Unavailable');
    expect(container.textContent).toContain('No nearby observation');
  });
  it('breaks plotted lines at missingness and gaps, rendering isolated points', () => {
    const p = pose(); p.frames[2].landmarks = null;
    render(p);
    expect(container.querySelectorAll('polyline')).toHaveLength(0);
    expect(container.querySelectorAll('circle')).toHaveLength(4);
  });
  it('shows a readable empty state and disables navigation for a no-pose result', () => {
    const p = pose(); for (const f of p.frames) f.landmarks = null;
    render(p);
    expect(container.textContent).toContain('No measurable elbow observations');
    expect(left().textContent).toBe('Unavailable');
    expect(button('Previous angle sample').disabled).toBe(true);
    expect(button('Next angle sample').disabled).toBe(true);
  });
  it('keeps sides independent and explains visibility failures', () => {
    const p = pose(); p.frames[0].landmarks![11].visibility = 0;
    render(p);
    expect(left().textContent).toBe('Unavailable');
    expect(container.querySelector('[aria-label="Right elbow angle"]')?.textContent).toBe('90°');
    expect(container.textContent).toContain('Required joints are obscured');
  });
  it('handles malformed result metadata without throwing into the player', () => {
    render({ ...pose(), width: 0 });
    expect(container.textContent).toContain('Angle data unavailable for this result');
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
  it('replaces series data without retaining old sample identity or values', () => {
    render();
    const p = pose(); p.frames[0].landmarks = null; p.frames[0].index = 1;
    render(p);
    expect(left().textContent).toBe('Unavailable');
    expect(container.textContent).toContain('Observation 1');
  });
});
