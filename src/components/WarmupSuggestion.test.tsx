import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout } from '@/types/workout';
import { WorkoutEditor } from './WorkoutEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

const past: Workout = { id: 'old', name: 'Old', unit: 'lb', startedAt: 10, finishedAt: 20, exercises: [
  { id: 'o1', name: 'Bench press', sets: [{ id: 'a', reps: 5, weight: 185, kind: 'warmup' }, { id: 'b', reps: 5, weight: 225 }, { id: 'c', reps: 3, weight: 215 }] }] };
async function open(exercises: Workout['exercises'], history: Workout[] = []): Promise<WorkoutStore> {
  const repository = createWorkoutRepository(new IDBFactory());
  await repository.save(0, { ...emptyWorkoutData(), history,
    active: { id: 'w', name: 'Push', unit: 'lb', startedAt: 1000, finishedAt: null, exercises } });
  const store = createWorkoutStore(repository); await store.getState().load();
  await act(async () => root.render(<WorkoutEditor store={store} onFinished={() => {}} />));
  return store;
}
const byLabel = (text: string) => [...container.querySelectorAll('label')].find(l => l.textContent === text)!;
const input = (text: string) => document.getElementById(byLabel(text).htmlFor) as HTMLInputElement;
const btn = (name: string) => [...container.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') ?? b.textContent) === name)!;
async function type(el: HTMLInputElement, value: string) {
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const click = (name: string) => act(async () => { btn(name).click(); });
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });
const bench = (): Workout['exercises'] => [{ id: 'e', name: 'Bench press', sets: [] }];

it('prefills the heaviest Regular set, edits rows and logs them in order as Warm-up sets', async () => {
  const store = await open(bench(), [past]);
  await click('Suggest warm-up sets for Bench press');
  expect(container.textContent).toContain('A starting point you can change');
  expect(input('Working weight (lb)').value).toBe('225');
  expect(['Warm-up 1 reps', 'Warm-up 2 reps', 'Warm-up 3 reps'].map(l => input(l).value)).toEqual(['5', '3', '2']);
  expect(['Warm-up 1 weight (lb)', 'Warm-up 2 weight (lb)', 'Warm-up 3 weight (lb)'].map(l => input(l).value)).toEqual(['90', '135', '180']);
  await type(input('Warm-up 1 weight (lb)'), '95');
  await click('Remove warm-up row 2 for Bench press');
  await click('Add these warm-up sets'); await settle();
  const sets = store.getState().data.active!.exercises[0].sets;
  expect(sets.map(s => [s.reps, s.weight, s.kind])).toEqual([[5, 95, 'warmup'], [2, 180, 'warmup']]);
  expect(container.querySelector('form[aria-label="Warm-up suggestion for Bench press"]')).toBeNull();
  expect(container.textContent).toContain('Added 2 warm-up sets.');
});

it('builds from a typed working weight and explains a weight too light for a ramp', async () => {
  await open(bench());
  await click('Suggest warm-up sets for Bench press');
  expect(input('Working weight (lb)').value).toBe('');
  await type(input('Working weight (lb)'), '5');
  await click('Build suggestion');
  expect(container.textContent).toContain('too light for a ramp');
  await type(input('Working weight (lb)'), '0');
  await click('Build suggestion');
  expect(container.querySelector('[role="alert"]')!.textContent).toContain('working weight above 0');
});

it('stops at the first store failure, keeping logged sets and the remaining rows', async () => {
  const store = await open(bench());
  await click('Suggest warm-up sets for Bench press');
  await type(input('Working weight (lb)'), '100');
  await click('Build suggestion');
  await type(input('Warm-up 2 reps'), '0');
  await click('Add these warm-up sets'); await settle();
  expect(store.getState().data.active!.exercises[0].sets).toHaveLength(1);
  expect(container.querySelector('[role="alert"]')!.textContent).toBeTruthy();
  expect(container.textContent).toContain('Added 1 warm-up set before the problem.');
  expect(container.querySelectorAll('ol input').length).toBe(4);
});

it('is not offered for bodyweight exercises', async () => {
  await open([{ id: 'e', name: 'Pull-up', bodyweight: true, sets: [] }]);
  expect(container.textContent).not.toContain('Suggest warm-up sets');
});
