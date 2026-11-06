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
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); });
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => { const off = store.subscribe(s => { if (!s.busy) { off(); resolve(); } }); });
}
async function render() { await act(async () => root.render(<App workouts={store} />)); await act(idle); }
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  if (!found) throw new Error(`Missing button: ${name}`); return found;
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); }
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
async function submit() {
  await act(async () => {
    container.querySelector('form[aria-label="Save routine"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await idle();
  });
}
async function draft() {
  await render(); await click('Routines'); await click('New routine');
  await fill('Routine name', 'Upper day'); await fill('Routine weight unit', 'kg');
  await fill('Exercise 1 name', 'Bench press'); await fill('Target sets for exercise 1', '3'); await fill('Target reps for exercise 1', '8');
  await click('Add routine exercise'); await fill('Exercise 2 name', 'Row'); await fill('Target reps for exercise 2', '12');
}
it('creates ordered targets and starts a workout with no completed sets or fabricated Home counts', async () => {
  await draft(); await click('Move exercise 2 up');
  expect((document.getElementById([...container.querySelectorAll('label')].find(e => e.textContent === 'Exercise 1 name')!.htmlFor) as HTMLInputElement).value).toBe('Row');
  await submit(); const template = store.getState().data.routines![0];
  expect(template.exercises.map(e => e.name)).toEqual(['Row', 'Bench press']);
  expect(template.exercises[0]).toMatchObject({ targetReps: 12 });
  await click('Start routine Upper day');
  expect(store.getState().data.active?.exercises.every(e => !e.sets.length)).toBe(true);
  expect(container.textContent).toContain('Planned target:'); expect(container.querySelector('tbody')).toBeNull();
  await click('Home'); expect([...container.querySelectorAll('dd')].map(el => el.textContent)).toEqual(['0', '0']);
});
it('edits and confirms deletion without rewriting the active snapshot or resetting its timer', async () => {
  await draft(); await submit(); await click('Start routine Upper day');
  await click('Start rest timer'); await click('Pause timer');
  const active = structuredClone(store.getState().data.active);
  await click('Routines'); expect(button('Start routine Upper day').disabled).toBe(true);
  await click('Edit routine Upper day'); await fill('Routine name', 'Edited day'); await fill('Routine weight unit', 'lb'); await submit();
  expect(store.getState().data.active).toEqual(active); expect(button('Resume timer')).toBeTruthy();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Delete routine Edited day'); expect(store.getState().data.routines).toHaveLength(1);
  confirm.mockReturnValue(true); await click('Delete routine Edited day'); expect(store.getState().data.routines).toEqual([]);
  expect(store.getState().data.active).toEqual(active); expect(button('Resume timer')).toBeTruthy();
});
it('retains all entered routine fields after a failed save and permits safe new-draft recovery', async () => {
  await draft(); vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await submit(); expect(store.getState().data.routines).toBeUndefined();
  expect([...container.querySelectorAll('input')].map(el => el.value)).toContain('Upper day');
  expect([...container.querySelectorAll('input')].map(el => el.value)).toContain('12');
  await click('Reload saved workouts'); await submit();
  expect(store.getState().data.routines![0].name).toBe('Upper day'); expect(button('New routine')).toBeTruthy();
});
it('preserves a stale edit but refuses to overwrite the newly loaded routine after reload', async () => {
  await draft(); await submit(); await click('Edit routine Upper day'); await fill('Routine name', 'My stale edit');
  const other = createWorkoutStore(repository); await other.getState().load();
  const saved = other.getState().data.routines![0];
  await other.getState().updateRoutine(saved.id, other.getState().data.revision, { name: 'Other tab edit', unit: saved.unit, exercises: saved.exercises.map(({name}) => ({name})) });
  await submit(); expect(store.getState().needsReload).toBe(true);
  await click('Reload saved workouts'); await submit();
  expect(container.textContent).toContain('Reopen this routine');
  expect([...container.querySelectorAll('input')].map(el => el.value)).toContain('My stale edit');
  expect((await repository.load()).routines![0].name).toBe('Other tab edit');
  await click('Cancel routine edit'); await click('Edit routine Other tab edit');
  await fill('Routine name', 'Fresh edit'); await submit();
  expect((await repository.load()).routines![0].name).toBe('Fresh edit');
});
it('rejects zero targets without silently saving a default or clearing the field', async () => {
  await draft(); await fill('Target sets for exercise 1', '0'); await submit();
  expect(container.textContent).toContain('set target from 1 to 100');
  expect(store.getState().data.routines).toBeUndefined();
  expect([...container.querySelectorAll('input')].map(el => el.value)).toContain('0');
});
it('does not claim an empty routine library when storage cannot be loaded', async () => {
  vi.spyOn(repository, 'load').mockRejectedValue(new Error('Unavailable')); await render(); await click('Routines');
  expect(button('New routine').disabled).toBe(true);
  expect(container.textContent).toContain('Open saved workouts to view routines');
  expect(container.textContent).not.toContain('Save a routine to reuse');
});

it('selects a library exercise for one routine row while retaining its targets and other rows', async () => {
  await draft();
  await act(async () => container.querySelector('summary')!.click());
  await fill('Search exercise library', 'lat pulldown'); await click('Use Lat pulldown');
  expect(store.getState().data.routines).toBeUndefined();
  await submit();
  expect(store.getState().data.routines![0].exercises).toMatchObject([
    { name: 'Lat pulldown', targetSets: 3, targetReps: 8 }, { name: 'Row', targetReps: 12 },
  ]);
});
