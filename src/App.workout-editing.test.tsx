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
  localStorage.clear();
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
/** Corrections and a changed note save as two commits; wait past both. */
async function settle() { for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); await idle(); }); }
function field(name: string) {
  const label = [...container.querySelectorAll('label')].find(el => el.textContent?.trim() === name);
  const input = label && document.getElementById(label.htmlFor) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (!input) throw new Error(`Missing input: ${name}`);
  return input;
}
async function fill(name: string, value: string) {
  const input = field(name);
  await act(async () => {
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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
async function draft(...exercises: string[]) {
  await render(); await click('Start workout'); await fill('Workout name', 'Upper body');
  await fill('Weight unit', 'kg'); await submit('Start a workout');
  for (const name of exercises.length ? exercises : ['Bench press']) { await fill('Exercise name', name); await submit('Add an exercise'); }
}
async function finished(name: string, finishedAt: number, note?: string) {
  let now = finishedAt - 1000;
  const timed = createWorkoutStore(repository, { id: () => crypto.randomUUID().replace(/-/g, ''), now: () => now });
  await timed.getState().load();
  await timed.getState().startWorkout(name, 'kg');
  await timed.getState().addExercise('Bench press');
  await timed.getState().addSet(timed.getState().data.active!.exercises[0].id, 8, 60);
  if (note) await timed.getState().setWorkoutNote(timed.getState().data.active!.id, note);
  now = finishedAt; await timed.getState().finishWorkout();
}
async function openSaved(name: string) {
  const row = [...container.querySelectorAll('ul button')].find(el => el.querySelector('span')?.textContent === name) as HTMLButtonElement | undefined;
  if (!row) throw new Error(`Missing saved workout: ${name}`);
  await act(async () => { row.click(); await idle(); });
}
function exerciseOrder() {
  return [...container.querySelectorAll('form[aria-label^="Log a set for "]')].map(form => form.getAttribute('aria-label')!.slice('Log a set for '.length));
}

it('saves an active workout note explicitly, keeps text after a failed save and shows it after finishing', async () => {
  await draft();
  await fill('Workout note', 'Felt strong');
  expect(container.textContent).toContain('11 / 1000 characters');
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'disk'));
  await click('Save note');
  expect((field('Workout note') as HTMLTextAreaElement).value).toBe('Felt strong');
  expect(store.getState().data.active?.note).toBeUndefined();
  await act(async () => { await store.getState().load(); });
  await click('Save note');
  expect(store.getState().data.active?.note).toBe('Felt strong');
  expect(container.textContent).toContain('Note saved.');
  expect(field('Workout note')).toHaveProperty('maxLength', 1000);
  await fill('Reps', '8'); await fill('Weight (kg)', '60'); await submit('Log a set for Bench press');
  await click('Finish workout');
  expect(container.textContent).toContain('Workout note');
  expect(container.textContent).toContain('Felt strong');
  await click('View saved workout');
  expect(container.textContent).toContain('Felt strong');
});

it('edits a finished workout note through the correction view and removes it when blank', async () => {
  await finished('Push', 5_000, 'Old note'); await render();
  await click('View workout history'); await openSaved('Push');
  expect(container.textContent).toContain('Old note');
  await click('Edit completed workout');
  expect((field('Workout note') as HTMLTextAreaElement).value).toBe('Old note');
  await fill('Workout note', 'New note'); await click('Save corrections'); await settle();
  expect(store.getState().data.history[0].note).toBe('New note');
  expect(container.textContent).toContain('New note');
  await click('Edit completed workout'); await fill('Workout note', '  '); await click('Save corrections'); await settle();
  expect(store.getState().data.history[0]).not.toHaveProperty('note');
});

it('moves active exercises with their logged sets and keeps focus on the moved control', async () => {
  await draft('Bench press', 'Row', 'Curl');
  await fill('Reps', '8'); await fill('Weight (kg)', '60'); await submit('Log a set for Bench press');
  expect(button('Move Bench press up').disabled).toBe(true);
  expect(button('Move Curl down').disabled).toBe(true);
  await click('Move Bench press down');
  expect(exerciseOrder()).toEqual(['Row', 'Bench press', 'Curl']);
  expect(store.getState().data.active!.exercises[1].sets).toHaveLength(1);
  expect(document.activeElement).toBe(button('Move Bench press down'));
  await click('Move Bench press down');
  expect(exerciseOrder()).toEqual(['Row', 'Curl', 'Bench press']);
  // Down is now disabled, so focus stays on the same exercise's other move control.
  expect(document.activeElement).toBe(button('Move Bench press up'));
});

it('repeats a finished workout into a fresh active workout with previous-value hints', async () => {
  await finished('Push', 5_000); await render();
  await click('View workout history'); await openSaved('Push');
  await click('Repeat workout');
  const active = store.getState().data.active!;
  expect(active.name).toBe('Push'); expect(active.exercises[0].sets).toEqual([]);
  expect(container.querySelector('h1')?.textContent).toBe('Push');
  expect(container.textContent).toContain('Previous workout');
});

it('explains an active workout blocks Repeat and offers to resume it', async () => {
  await finished('Push', 5_000); await render();
  await click('Start workout'); await fill('Workout name', 'Today'); await submit('Start a workout');
  await click('Home'); await click('View workout history'); await openSaved('Push');
  await click('Repeat workout');
  expect(container.textContent).toContain('Finish or discard the active workout before repeating another.');
  await click('Resume workout');
  expect(container.querySelector('h1')?.textContent).toBe('Today');
});

it('saves optional routine target weights and shows them apart from logged sets', async () => {
  await render(); await click('Routines'); await click('New routine');
  await fill('Routine name', 'Heavy day');
  await fill('Exercise 1 name', 'Bench press'); await fill('Target sets for exercise 1', '3');
  await fill('Target reps for exercise 1', '8'); await fill('Target weight for exercise 1 (lb)', '135');
  await click('Add routine exercise'); await fill('Exercise 2 name', 'Row');
  await submit('Save routine');
  const [bench, row] = store.getState().data.routines![0].exercises;
  expect(bench.targetWeight).toBe(135); expect(row).not.toHaveProperty('targetWeight');
  expect(container.textContent).toContain('3 sets · 8 reps per set · 135 lb');
  await click('Start routine Heavy day');
  expect(container.textContent).toContain('Planned target: 3 sets · 8 reps per set · 135 lb.');
  expect(container.querySelector('tbody')).toBeNull();
});

it('asks before navigation discards typed set values and never asks for unchanged or saved forms', async () => {
  await draft();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Home'); expect(confirm).not.toHaveBeenCalled(); await click('Workout');
  await fill('Reps', '8');
  await click('Home');
  expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
  expect((field('Reps') as HTMLInputElement).value).toBe('8');
  const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  await fill('Weight (kg)', '60'); await submit('Log a set for Bench press');
  confirm.mockClear(); await click('Home');
  expect(confirm).not.toHaveBeenCalled(); expect(container.querySelector('h1')?.textContent).toBe('Your training.');
  const clean = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
});

it('asks before leaving a changed note, start form, routine editor or correction', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await finished('Push', 5_000); await render();
  await click('Start workout'); await fill('Workout name', 'Legs');
  await click('Routines'); expect(confirm).toHaveBeenCalledTimes(1);
  confirm.mockReturnValue(true); await click('Routines'); confirm.mockReturnValue(false);
  await click('New routine'); await fill('Routine name', 'Draft');
  await click('Cancel routine edit'); expect(confirm).toHaveBeenCalledTimes(3);
  expect(container.querySelector('h1')?.textContent).toBe('New routine');
  confirm.mockReturnValue(true); await click('Cancel routine edit'); confirm.mockReturnValue(false);
  await click('Home'); await click('View workout history'); await openSaved('Push'); await click('Edit completed workout');
  await fill('Exercise 1 set 1 reps', '9'); confirm.mockClear();
  await click('Cancel workout edit'); expect(confirm).toHaveBeenCalledTimes(1);
  expect(container.querySelector('h1')?.textContent).toBe('Edit completed workout');
  confirm.mockReturnValue(true); await click('Cancel workout edit'); confirm.mockReturnValue(false);
  await click('Workout'); await submit('Start a workout');
  await fill('Workout note', 'Unsaved'); confirm.mockClear();
  await click('Home'); expect(confirm).toHaveBeenCalledTimes(1);
  await click('Save note'); confirm.mockClear(); await click('Home');
  expect(confirm).not.toHaveBeenCalled();
});

it('suggests distinct previous workout names, most recent first, while allowing a custom name', async () => {
  await finished('Push', 5_000); await finished('Pull', 9_000); await finished('Push', 12_000);
  await render(); await click('Start workout');
  const input = field('Workout name') as HTMLInputElement;
  const list = document.getElementById(input.getAttribute('list') ?? '');
  expect([...list!.querySelectorAll('option')].map(o => o.value)).toEqual(['Push', 'Pull']);
  await fill('Workout name', 'Brand new day'); await submit('Start a workout');
  expect(store.getState().data.active?.name).toBe('Brand new day');
});

it('keeps an existing routine target weight when the routine is edited for another reason', async () => {
  await store.getState().load();
  await store.getState().createRoutine({ name: 'Synced day', unit: 'kg', exercises: [{ name: 'Squat', targetWeight: 100 }] });
  await render(); await click('Routines'); await click('Edit routine Synced day');
  expect((field('Target weight for exercise 1 (kg)') as HTMLInputElement).value).toBe('100');
  await fill('Routine name', 'Renamed day'); await submit('Save routine');
  expect(store.getState().data.routines![0]).toMatchObject({ name: 'Renamed day', exercises: [{ name: 'Squat', targetWeight: 100 }] });
});

it('saves a note typed before logging a set but refuses to overwrite a note changed underneath the draft', async () => {
  await draft();
  await fill('Workout note', 'Typed first');
  await fill('Reps', '8'); await fill('Weight (kg)', '60'); await submit('Log a set for Bench press');
  await click('Save note');
  expect(store.getState().data.active?.note).toBe('Typed first');
  await fill('Workout note', 'My draft');
  // Simulates a sync or restore changing the stored note while this draft is open.
  await act(async () => { await store.getState().setWorkoutNote(store.getState().data.active!.id, 'From the cloud'); });
  expect((field('Workout note') as HTMLTextAreaElement).value).toBe('My draft');
  await click('Save note');
  expect(container.textContent).toContain('Saved workouts changed. Reopen the note before saving.');
  expect(store.getState().data.active?.note).toBe('From the cloud');
  expect((field('Workout note') as HTMLTextAreaElement).value).toBe('My draft');
  await click('Load current note');
  expect((field('Workout note') as HTMLTextAreaElement).value).toBe('From the cloud');
});
