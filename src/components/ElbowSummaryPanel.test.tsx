import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ElbowClipSummary } from '@/core/elbowSummary';
import { ElbowSummaryPanel } from './ElbowSummaryPanel';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement, root: Root;
const seek = vi.fn();
// Synthetic supplied summaries, not detected human poses.
function summary(): ElbowClipSummary {
  return { totalSamples: 3,
    left: { measurableSamples: 2, unavailableSamples: 1,
      lowest: { degrees: 0, time: 0, frameIndex: 0 },
      highest: { degrees: 130, time: 1.234567, frameIndex: 37 } },
    right: { measurableSamples: 0, unavailableSamples: 3, lowest: null, highest: null } };
}
function render(value = summary()) { act(() => root.render(<ElbowSummaryPanel summary={value} onSeek={seek} />)); }
function button(label: string) { return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!; }
beforeEach(() => { seek.mockClear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('ElbowSummaryPanel', () => {
  it('shows independent sample counts and observed degrees/timestamps', () => {
    render();
    expect(container.querySelector('[aria-label="Clip measurement summary"]')).not.toBeNull();
    expect(container.textContent).toContain('2 of 3 sampled positions measurable');
    expect(container.textContent).toContain('0 of 3 sampled positions measurable');
    expect(button('Jump to lowest left elbow angle').textContent).toContain('0° at 0.000 s');
    expect(button('Jump to highest left elbow angle').textContent).toContain('130° at 1.235 s');
  });
  it('jumps to exact media time including zero rather than rounded display time', () => {
    render();
    act(() => button('Jump to lowest left elbow angle').click());
    act(() => button('Jump to highest left elbow angle').click());
    expect(seek.mock.calls).toEqual([[0], [1.234567]]);
  });
  it('disables missing-side actions without inventing a zero-degree angle', () => {
    render();
    for (const extremum of ['lowest', 'highest']) {
      const target = button(`Jump to ${extremum} right elbow angle`);
      expect(target.disabled).toBe(true);
      expect(target.textContent).toContain('Unavailable');
      expect(target.textContent).not.toContain('0°');
      act(() => target.click());
    }
    expect(seek).not.toHaveBeenCalled();
    expect(button('Jump to lowest left elbow angle').disabled).toBe(false);
  });
  it('handles no observations with all extrema unavailable', () => {
    const value = summary(); value.totalSamples = 0;
    value.left = { measurableSamples: 0, unavailableSamples: 0, lowest: null, highest: null };
    value.right = { ...value.left }; render(value);
    expect(container.textContent).toContain('0 of 0 sampled positions measurable');
    expect(container.querySelectorAll('button:disabled')).toHaveLength(4);
  });
  it('supports a single observed value as both extrema', () => {
    const value = summary(); value.totalSamples = 1;
    value.left = { measurableSamples: 1, unavailableSamples: 0,
      lowest: { degrees: 180, time: .123, frameIndex: 4 }, highest: { degrees: 180, time: .123, frameIndex: 4 } };
    value.right.unavailableSamples = 1; render(value);
    act(() => button('Jump to highest left elbow angle').click());
    expect(seek).toHaveBeenLastCalledWith(.123);
    expect(container.textContent).toContain('1 of 1 sampled positions measurable');
  });
  it('explains missing evidence and limits without labeling sample availability as confidence', () => {
    render();
    expect(container.textContent).toContain('Missing samples are excluded');
    expect(container.textContent).toContain('tracking errors');
    expect(container.textContent).toContain('not per-repetition range of motion');
    expect(container.textContent).not.toMatch(/confidence|form score/i);
  });
  it('replaces displayed extrema and callbacks when given a new summary', () => {
    render();
    const value = summary(); value.left.highest = { degrees: 150, time: 2.5, frameIndex: 70 };
    render(value);
    expect(button('Jump to highest left elbow angle').textContent).toContain('150° at 2.500 s');
    expect(container.textContent).not.toContain('130°');
    act(() => button('Jump to highest left elbow angle').click());
    expect(seek).toHaveBeenLastCalledWith(2.5);
  });
});
