import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let container: HTMLDivElement; let store: WorkoutStore; let now: number;
beforeEach(async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false); localStorage.clear();
  let id = 0; now = 1000;
  store = createWorkoutStore(createWorkoutRepository(new IDBFactory()), { id: () => `id${++id}`, now: () => now });
  await store.getState().load(); await store.getState().startWorkout('Upper', 'kg'); await store.getState().addExercise('Bench press');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<App workouts={store} />));
  await act(settle);
  await act(async () => findButton('Workout').click());
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); vi.restoreAllMocks(); });
function findButton(name: string) {
  const element = [...container.querySelectorAll('button')].find(value => value.getAttribute('aria-label') === name || value.textContent?.trim() === name);
  if (!element) throw new Error(`Missing button ${name}`); return element;
}
async function settle() {
  if (store.getState().busy) await new Promise<void>(resolve => {
    const off = store.subscribe(state => { if (!state.busy) { off(); resolve(); } });
  });
}
async function click(name: string) { await act(async () => { findButton(name).click(); await settle(); }); }
async function enter(label: string, value: string) {
  const source = [...container.querySelectorAll('label')].find(item => item.textContent === label);
  if (!source) throw new Error(`Missing label ${label}`);
  const input = document.getElementById(source.htmlFor) as HTMLInputElement | HTMLSelectElement;
  const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
it('opens a saved-workout summary only after a successful finish and reopens it from history', async () => {
  await enter('Reps', '8'); await enter('Weight (kg)', '60.5'); await click('Log set'); now = 181000;
  await click('Finish workout');
  expect(container.querySelector('h1')?.textContent).toBe('Workout complete');
  expect(container.textContent).toContain('484 kg'); expect(container.textContent).toContain('3m 0s');
  await click('View saved workout'); expect(container.querySelector('h1')?.textContent).toBe('Upper');
  await click('View summary'); expect(container.querySelector('h1')?.textContent).toBe('Workout complete');
});
it('keeps the active workout visible if finish fails', async () => {
  await click('Finish workout'); expect(container.querySelector('h1')?.textContent).toBe('Upper');
  expect(container.textContent).toContain('Log a set for each exercise');
});
it('logs, edits and repeats warm-ups with visible types and a correct completion breakdown', async () => {
  await enter('Set type', 'warmup'); await enter('Reps', '10'); await enter('Weight (kg)', '20'); await click('Log set');
  expect(store.getState().data.active!.exercises[0].sets[0].kind).toBe('warmup');
  await click('Repeat last set for Bench press');
  expect(store.getState().data.active!.exercises[0].sets[1].kind).toBe('warmup');
  await click('Edit set 1 for Bench press'); await enter('Set type', 'regular'); await click('Save set');
  expect(store.getState().data.active!.exercises[0].sets[0].kind).toBeUndefined();
  now = 181000; await click('Finish workout'); expect(container.textContent).toContain('Warm-up sets');
  expect(container.textContent).toContain('Regular sets'); expect(container.textContent).toContain('400 kg');
});
