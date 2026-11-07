import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
function button(name: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  if (!found) throw new Error(`Missing button: ${name}`); return found;
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); }
async function settle() { for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); await idle(); }); }
function field(name: string, scope: ParentNode = container) {
  const label = [...scope.querySelectorAll('label')].find(el => el.textContent?.trim() === name);
  const input = label && document.getElementById(label.htmlFor) as HTMLInputElement | HTMLSelectElement;
  if (!input) throw new Error(`Missing input: ${name}`);
  return input;
}
async function fill(name: string, value: string, scope: ParentNode = container) {
  const input = field(name, scope);
  await act(async () => {
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function check(name: string, scope: ParentNode = container) {
  await act(async () => { (field(name, scope) as HTMLInputElement).click(); await idle(); });
}
async function submit(name: string) {
  await act(async () => {
    container.querySelector(`form[aria-label="${name}"]`)!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await idle();
  });
}
function section(name: string) { return container.querySelector<HTMLElement>(`section[aria-label="${name}"]`)!; }
async function draft(...exercises: string[]) {
  await render(); await click('Start workout'); await fill('Workout name', 'Upper body');
  await fill('Weight unit', 'kg'); await submit('Start a workout');
  for (const name of exercises) { await fill('Exercise name', name); await submit('Add an exercise'); }
}
async function log(exercise: string, reps: string, weight: string, rpe = '') {
  const scope = section(exercise);
  await fill('Reps', reps, scope);
  const loaded = [...scope.querySelectorAll('label')].some(el => el.textContent?.trim() === 'Weight (kg)');
  await fill(loaded ? 'Weight (kg)' : 'Added weight (kg)', weight, scope);
  await fill('RPE', rpe, scope); await submit(`Log a set for ${exercise}`);
}

it('logs optional RPE, shows it with both units and clears it when an edit leaves it blank', async () => {
  await draft('Bench press');
  expect(field('RPE')).toMatchObject({ min: '1', max: '10', step: '0.5', required: false });
  await log('Bench press', '8', '60', '8.5'); await log('Bench press', '6', '60');
  const [rated, plain] = store.getState().data.active!.exercises[0].sets;
  expect(rated.rpe).toBe(8.5); expect(plain).not.toHaveProperty('rpe');
  const rows = [...section('Bench press').querySelectorAll('tbody tr')].map(row => row.textContent);
  expect(rows[0]).toContain('60 kg'); expect(rows[0]).toContain('≈ 132.5 lb'); expect(rows[0]).toContain('8.5');
  expect(rows[1]).toContain('None');
  await click('Edit set 1 for Bench press');
  expect((field('RPE') as HTMLInputElement).value).toBe('8.5');
  await fill('RPE', ''); await submit('Log a set for Bench press');
  expect(store.getState().data.active!.exercises[0].sets[0]).not.toHaveProperty('rpe');
  await fill('Reps', '5'); await fill('Weight (kg)', '60'); await fill('RPE', '7.3'); await submit('Log a set for Bench press');
  expect(container.textContent).toContain('Enter an RPE from 1 to 10 in steps of 0.5');
  expect(store.getState().data.active!.exercises[0].sets).toHaveLength(2);
});

it('logs added and assisted bodyweight loads and keeps bodyweight on while an assisted set exists', async () => {
  await draft('Pull-up');
  await check('Bodyweight exercise');
  expect(store.getState().data.active!.exercises[0].bodyweight).toBe(true);
  expect(field('Added weight (kg)')).toMatchObject({ min: '-1000' });
  expect(container.textContent).toContain('Use 0 for bodyweight only, a negative number for assistance');
  await log('Pull-up', '8', '0'); await log('Pull-up', '6', '-20', '9'); await log('Pull-up', '5', '10');
  const text = section('Pull-up').querySelector('tbody')!.textContent;
  expect(text).toContain('Bodyweight'); expect(text).toContain('−20 kg assist'); expect(text).toContain('+10 kg');
  await check('Bodyweight exercise');
  expect(store.getState().data.active!.exercises[0].bodyweight).toBe(true);
  expect(container.textContent).toContain('Change assisted (negative weight) sets to 0 or more');
  expect((field('Bodyweight exercise') as HTMLInputElement).checked).toBe(true);
});

it('groups neighbouring exercises as a labelled superset that moves as one block, then ungroups', async () => {
  await draft('Bench press', 'Row', 'Curl');
  expect(button('Group as superset').disabled).toBe(true);
  await check('Select Bench press for superset'); await check('Select Row for superset');
  await click('Group as superset');
  const group = container.querySelector<HTMLElement>('[role="group"][aria-label="Superset A"]')!;
  expect(group).toBeTruthy();
  expect([...group.querySelectorAll('section[aria-label]')].map(s => s.getAttribute('aria-label'))).toEqual(['Bench press', 'Row']);
  const [bench, row] = store.getState().data.active!.exercises;
  expect(bench.superset).toBeDefined(); expect(row.superset).toBe(bench.superset);
  expect(button('Move Row down').disabled).toBe(false);
  await click('Move Curl up');
  expect(store.getState().data.active!.exercises.map(e => e.name)).toEqual(['Curl', 'Bench press', 'Row']);
  expect(document.activeElement).toBe(button('Move Curl down'));
  await click('Ungroup Superset A');
  expect(container.querySelector('[role="group"][aria-label^="Superset"]')).toBeNull();
  expect(store.getState().data.active!.exercises.some(e => e.superset !== undefined)).toBe(false);
});

it('shows RPE, bodyweight, supersets and alternate units in the summary, history detail and correction view', async () => {
  await draft('Bench press', 'Pull-up');
  await check('Bodyweight exercise', section('Pull-up'));
  await log('Bench press', '8', '60', '8'); await log('Pull-up', '6', '-20');
  await check('Select Bench press for superset'); await check('Select Pull-up for superset');
  await click('Group as superset');
  await click('Finish workout');
  expect(container.textContent).toContain('Workout complete');
  expect(container.textContent).toContain('480 kg');
  expect(container.textContent).toContain('Bodyweight exercises are left out');
  expect(container.textContent).toContain('Superset A');
  expect(container.textContent).toContain('≈ 132.5 lb'); expect(container.textContent).toContain('RPE 8');
  expect(container.textContent).toContain('−20 kg assist');
  await click('View saved workout');
  const detail = container.textContent!;
  expect(detail).toContain('Superset A'); expect(detail).toContain('≈ 132.5 lb'); expect(detail).toContain('−20 kg assist');
  await click('Edit completed workout');
  expect((field('Exercise 1 set 1 RPE') as HTMLInputElement).value).toBe('8');
  expect(field('Exercise 2 set 1 added weight (kg)')).toMatchObject({ min: '-1000' });
  await fill('Exercise 1 set 1 RPE', ''); await fill('Exercise 2 set 1 RPE', '9.5');
  await click('Save corrections'); await settle();
  const [bench, pull] = store.getState().data.history[0].exercises;
  expect(bench.sets[0]).not.toHaveProperty('rpe'); expect(pull.sets[0]).toMatchObject({ weight: -20, rpe: 9.5 });
});

it('saves routine supersets and bodyweight, keeps them through an edit and starts them in a workout', async () => {
  await render(); await click('Routines'); await click('New routine');
  await fill('Routine name', 'Pull day'); await fill('Routine weight unit', 'kg');
  await fill('Exercise 1 name', 'Row'); await fill('Target weight for exercise 1 (kg)', '50');
  await click('Add routine exercise'); await fill('Exercise 2 name', 'Pull-up');
  await click('Add routine exercise'); await fill('Exercise 3 name', 'Curl');
  await check('Bodyweight exercise for exercise 2');
  await check('Select exercise 1 for superset'); await check('Select exercise 2 for superset');
  await click('Group as superset');
  expect(container.querySelector('[role="group"][aria-label="Superset A"]')).toBeTruthy();
  await click('Move exercise 3 up');
  await act(async () => { container.querySelector('form[aria-label="Save routine"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await idle(); });
  const saved = store.getState().data.routines![0];
  expect(saved.exercises.map(e => e.name)).toEqual(['Curl', 'Row', 'Pull-up']);
  expect(saved.exercises[1].superset).toBeDefined(); expect(saved.exercises[2].superset).toBe(saved.exercises[1].superset);
  expect(saved.exercises[2].bodyweight).toBe(true); expect(saved.exercises[1].targetWeight).toBe(50);
  await click('Edit routine Pull day'); await fill('Routine name', 'Pull day 2');
  await act(async () => { container.querySelector('form[aria-label="Save routine"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await idle(); });
  const edited = store.getState().data.routines![0];
  expect(edited.name).toBe('Pull day 2');
  expect(edited.exercises[2]).toMatchObject({ name: 'Pull-up', bodyweight: true });
  expect(edited.exercises[1]).toMatchObject({ targetWeight: 50 });
  expect(edited.exercises[2].superset).toBe(edited.exercises[1].superset);
  expect(container.textContent).toContain('Superset A');
  await click('Start routine Pull day 2');
  expect(container.querySelector('[role="group"][aria-label="Superset A"]')).toBeTruthy();
  expect((field('Bodyweight exercise', section('Pull-up')) as HTMLInputElement).checked).toBe(true);
});
