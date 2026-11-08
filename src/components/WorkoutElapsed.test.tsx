import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkoutElapsed } from './WorkoutElapsed';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let container: HTMLDivElement;
beforeEach(() => { vi.useFakeTimers(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('ticks each second from the start time, pauses while hidden and releases its timer on unmount', async () => {
  let clock = 100_000;
  const now = () => clock;
  await act(async () => root.render(<WorkoutElapsed startedAt={100_000 - 65_000} now={now} />));
  expect(container.textContent).toContain('Time so far 1:05');
  clock += 1000; await act(async () => { vi.advanceTimersByTime(1000); });
  expect(container.textContent).toContain('1:06');
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(vi.getTimerCount()).toBe(0);
  clock += 60_000;
  visibility.mockReturnValue('visible');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(container.textContent).toContain('2:06');
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => root.unmount());
  expect(vi.getTimerCount()).toBe(0);
  root = createRoot(container);
});

it('shows nothing when the clock reads before the start', async () => {
  await act(async () => root.render(<WorkoutElapsed startedAt={5000} now={() => 1000} />));
  expect(container.textContent).toBe('');
});
