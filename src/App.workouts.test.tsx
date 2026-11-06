import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkoutError } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  repository = createWorkoutRepository(new IDBFactory()); store = createWorkoutStore(repository);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); });
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => { const off = store.subscribe(s => { if (!s.busy) { off(); resolve(); } }); });
}
async function render() { await act(async () => root.render(<App workouts={store} />)); await act(idle); }
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  if (!found) throw new Error(`Missing button: ${name}`); return found;
}
/** The analysis screen loads on first use; wait in separate act() scopes until it shows. */
async function settleLazy() {
  for (let i = 0; i < 100 && container.textContent?.includes('Opening video analysis'); i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); await settleLazy(); }
async function fill(name: string, value: string) {
  const label = [...container.querySelectorAll('label')].find(el => el.textContent?.trim() === name);
  const input = label && document.getElementById(label.htmlFor) as HTMLInputElement | HTMLSelectElement;
  if (!input) throw new Error(`Missing input: ${name}`);
  await act(async () => {
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit(name: string) {
  await act(async () => {
    container.querySelector(`form[aria-label="${name}"]`)!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await idle();
  });
}
async function draft() {
  await render(); await click('Start workout'); await fill('Workout name', 'Upper body');
  await fill('Weight unit', 'kg'); await submit('Start a workout');
  await fill('Exercise name', 'Bench press'); await submit('Add an exercise');
}
it('shows both Home actions and an actual saved workout after logging and finish', async () => {
  await draft(); await fill('Reps', '8'); await fill('Weight (kg)', '60.5'); await submit('Log a set for Bench press');
  expect(container.querySelector('tbody')?.textContent).toContain('60.5 kg');
  await click('Finish workout');
  expect(container.textContent).toContain('Workout saved.');
  expect(container.textContent).toContain('Upper body'); expect(button('Analyze video')).toBeTruthy();
  expect(store.getState().data.history[0].unit).toBe('kg');
});
it('preserves entered fields and confirmed state when a save fails', async () => {
  await draft(); vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await fill('Reps', '8'); await fill('Weight (kg)', '50'); await submit('Log a set for Bench press');
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Reload required');
  expect([...container.querySelectorAll('input')].map(el => el.value)).toContain('50');
  expect(store.getState().data.active?.exercises[0].sets).toEqual([]);
  expect(button('Reload saved workouts').disabled).toBe(false);
});
it('rejects invalid reps without recording a completed set', async () => {
  await draft(); await fill('Reps', '0'); await fill('Weight (kg)', '0'); await submit('Log a set for Bench press');
  expect(container.querySelector('[role=alert]')?.textContent).toContain('whole-number reps');
  expect(store.getState().data.active?.exercises[0].sets).toEqual([]);
});
it('requires confirmation before discarding the active workout', async () => {
  await draft(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Discard workout'); expect(store.getState().data.active).not.toBeNull();
  confirm.mockReturnValue(true); await click('Discard workout'); expect(store.getState().data.active).toBeNull();
});
it('keeps analysis usable when saved workout data cannot be opened', async () => {
  vi.spyOn(repository, 'load').mockRejectedValue(new Error('unavailable')); await render();
  expect(button('Start workout').disabled).toBe(true);
  await click('Analyze video');
  expect(container.querySelector('input[type=file]')).not.toBeNull();
  expect(container.textContent).toContain('could not be opened');
});

it('keeps the active workout timer through Home and Analyze navigation', async () => {
  await render(); expect(container.querySelector('output[aria-label="Rest time remaining"]')).toBeNull();
  await click('Start workout'); await fill('Workout name', 'Timer workout'); await submit('Start a workout');
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  await click('Start rest timer');
  await act(async () => vi.advanceTimersByTime(5_000));
  await click('Home'); expect(container.querySelector('output')?.textContent).toBe('1:25');
  await click('Analyze'); expect(container.querySelector('output')?.textContent).toBe('1:25');
  await click('Workout'); expect(container.querySelector('output')?.textContent).toBe('1:25');
});
it('removes the timer only after finish saves, then gives a new workout a fresh timer', async () => {
  await draft(); await fill('Reps', '5'); await fill('Weight (kg)', '20'); await submit('Log a set for Bench press');
  await click('Start rest timer');
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await click('Finish workout');
  expect(container.querySelector('output[aria-label="Rest time remaining"]')).not.toBeNull();
  await click('Reload saved workouts'); await click('Finish workout');
  expect(container.querySelector('output[aria-label="Rest time remaining"]')).toBeNull();
  await click('Start workout'); await fill('Workout name', 'Fresh workout'); await submit('Start a workout');
  expect(container.querySelector('output')?.textContent).toBe('1:30'); expect(button('Start rest timer')).toBeTruthy();
  vi.spyOn(window, 'confirm').mockReturnValue(true); await click('Discard workout');
  expect(container.querySelector('output[aria-label="Rest time remaining"]')).toBeNull();
});
