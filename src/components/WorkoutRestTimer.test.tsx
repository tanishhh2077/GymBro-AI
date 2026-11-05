import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkoutRestTimer } from './WorkoutRestTimer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const epoch = 1_800_000_000_000;
beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(epoch);
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<StrictMode><WorkoutRestTimer /></StrictMode>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks();
});
function remaining() { return container.querySelector('output[aria-label="Rest time remaining"]')?.textContent; }
function button(name: string) { return [...container.querySelectorAll('button')].find(el => el.textContent === name); }
async function click(name: string) {
  const el = button(name); expect(el, `Missing button: ${name}`).toBeTruthy();
  await act(async () => el!.click());
}
async function duration(seconds: number) {
  const select = container.querySelector('select'); expect(select).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, String(seconds));
    select!.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function jump(ms: number, event: 'focus' | 'visibilitychange' = 'focus') {
  await act(async () => {
    vi.setSystemTime(ms);
    (event === 'focus' ? window : document).dispatchEvent(new Event(event));
  });
}
it('starts idle with explicit session limits and does not count down automatically', async () => {
  expect(remaining()).toBe('1:30');
  expect(container.textContent).toContain('reload');
  expect(container.textContent).toContain('background alert');
  await act(async () => vi.advanceTimersByTime(120_000));
  expect(remaining()).toBe('1:30'); expect(vi.getTimerCount()).toBe(0);
});
it('uses the selected duration and rounds fractional seconds up', async () => {
  await duration(30); await click('Start rest timer');
  expect(container.querySelector('select')?.disabled).toBe(true);
  await act(async () => vi.advanceTimersByTime(1_500));
  await jump(epoch + 1_500);
  expect(remaining()).toBe('0:29');
  expect(container.querySelector('output')?.getAttribute('aria-live')).toBe('off');
  expect(container.querySelector('[role=status]')?.textContent).toBe('Resting…');
});
it('pauses at a fresh sub-second clock reading and resumes only the remaining time', async () => {
  await duration(30); await click('Start rest timer');
  vi.setSystemTime(epoch + 450); await click('Pause timer');
  expect(vi.getTimerCount()).toBe(0);
  expect(container.querySelector('select')?.disabled).toBe(true);
  await jump(epoch + 60_450); expect(remaining()).toBe('0:30');
  await click('Resume timer');
  await jump(epoch + 89_450); expect(remaining()).toBe('0:01');
  await jump(epoch + 90_000); expect(remaining()).toBe('0:00');
  expect(container.querySelector('[role=status]')?.textContent).toBe('Rest complete.');
  expect(vi.getTimerCount()).toBe(0);
});
it('catches up after delayed callbacks on visibility change without negative time', async () => {
  await click('Start rest timer');
  await jump(epoch + 120_000, 'visibilitychange');
  expect(remaining()).toBe('0:00');
  expect(container.querySelector('[role=status]')?.textContent).toBe('Rest complete.');
  expect(button('Pause timer')).toBeUndefined(); expect(vi.getTimerCount()).toBe(0);
});
it('treats pause after an unseen expiry as complete rather than resumable', async () => {
  await duration(30); await click('Start rest timer');
  vi.setSystemTime(epoch + 31_000); await click('Pause timer');
  expect(remaining()).toBe('0:00'); expect(button('Resume timer')).toBeUndefined();
  expect(container.querySelector('[role=status]')?.textContent).toBe('Rest complete.');
});
it('resets to the full chosen duration and allows changing or restarting it', async () => {
  await duration(120); await click('Start rest timer');
  await jump(epoch + 5_000); await click('Pause timer'); await click('Reset timer');
  expect(remaining()).toBe('2:00'); expect(container.querySelector('select')?.disabled).toBe(false);
  await duration(60); await click('Start rest timer'); await jump(epoch + 66_000);
  await click('Start rest timer'); expect(remaining()).toBe('1:00');
  await click('Reset timer'); expect(vi.getTimerCount()).toBe(0);
});
it('caps a backward-clock display at the selected duration', async () => {
  await click('Start rest timer'); await jump(epoch - 10_000);
  expect(remaining()).toBe('1:30');
});
it('cleans up its interval and event handlers on unmount under StrictMode', async () => {
  const addDocument = vi.spyOn(document, 'addEventListener');
  const removeDocument = vi.spyOn(document, 'removeEventListener');
  const addWindow = vi.spyOn(window, 'addEventListener');
  const removeWindow = vi.spyOn(window, 'removeEventListener');
  await click('Start rest timer'); expect(vi.getTimerCount()).toBe(1);
  const visibility = addDocument.mock.calls.find(([name]) => name === 'visibilitychange');
  const focus = addWindow.mock.calls.find(([name]) => name === 'focus');
  expect(visibility).toBeTruthy(); expect(focus).toBeTruthy();
  await act(async () => root.render(null));
  expect(vi.getTimerCount()).toBe(0);
  expect(removeDocument.mock.calls.some(([name, fn]) => name === 'visibilitychange' && fn === visibility![1])).toBe(true);
  expect(removeWindow.mock.calls.some(([name, fn]) => name === 'focus' && fn === focus![1])).toBe(true);
});
