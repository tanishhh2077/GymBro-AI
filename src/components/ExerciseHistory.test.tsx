import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { Workout } from '@/types/workout';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { ExerciseHistory } from './ExerciseHistory';
import { WorkoutEditor } from './WorkoutEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); });

const saved: Workout = { id: 'saved', name: 'Yesterday', unit: 'kg', startedAt: 1_000, finishedAt: 2_000,
  exercises: [{ id: 'bench', name: 'Bench press', sets: [{ id: 'set', reps: 8, weight: 62.125 }] }] };
async function render(history: readonly Workout[] = [saved], name = 'Bench press') {
  await act(async () => root.render(<ExerciseHistory history={history} name={name} unit="kg" startedAt={5_000} />));
}
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(el => el.textContent === name);
  expect(found, name).toBeTruthy();
  return found!;
}
async function click(name: string) { await act(async () => button(name).click()); }
async function input(label: string, value: string) {
  const field = [...container.querySelectorAll('input')].find(el => el.labels?.[0]?.textContent === label);
  expect(field, label).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
    field!.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return field!;
}

it('starts collapsed and exposes its labelled history only when expanded', async () => {
  await render();
  expect(button('Exercise history').getAttribute('aria-expanded')).toBe('false');
  expect(container.textContent).not.toContain('Yesterday');
  await click('Exercise history');
  const panel = document.getElementById(button('Exercise history').getAttribute('aria-controls')!);
  const region = panel?.querySelector('section[aria-labelledby]');
  expect(region).toBeTruthy();
  expect(document.getElementById(region!.getAttribute('aria-labelledby')!)?.textContent).toBe('Recent exercise history');
  expect(panel?.textContent).toContain('Recent exercise history');
  expect(panel?.textContent).toContain('Yesterday');
  expect(panel?.textContent).toContain(new Date(2_000).toLocaleDateString());
  expect(panel?.textContent).toContain('8 reps × 62.125 kg');
  expect(panel?.textContent).toContain('Regular');
  expect(panel?.textContent).toContain('finished by the start of this workout');
  await click('Exercise history');
  expect(button('Exercise history').getAttribute('aria-expanded')).toBe('false');
  expect(container.textContent).not.toContain('Yesterday');
});

it('shows all duplicate-name blocks including warm-ups and zero loads', async () => {
  await render([{ ...saved, exercises: [...saved.exercises,
    { id: 'second', name: 'Bench press', sets: [{ id: 'warmup', kind: 'warmup', reps: 5, weight: 0 }] }] }]);
  await click('Exercise history');
  expect(container.textContent).toContain('Entry 1');
  expect(container.textContent).toContain('Entry 2');
  expect(container.textContent).toContain('8 reps × 62.125 kg');
  expect(container.textContent).toContain('Warm-up');
  expect(container.textContent).toContain('5 reps × 0 kg');
});

it('shows an honest empty state for exact-name and unit misses', async () => {
  await render([saved], 'bench press'); await click('Exercise history');
  expect(container.textContent).toContain('No completed sets');
  expect(container.textContent).not.toContain('Yesterday');
});

it('pages a thousand workouts in bounded groups and resets on source changes', async () => {
  const history = Array.from({ length: 1000 }, (_, index) => ({ ...saved, id: `workout-${index}`, name: `Session ${index}`, startedAt: 0, finishedAt: index + 1 }));
  await render(history); await click('Exercise history');
  expect(container.querySelectorAll('article')).toHaveLength(5);
  expect(container.querySelector('article')?.textContent).toContain('Session 999');
  expect(button('Newer workouts').disabled).toBe(true);
  await click('Older workouts');
  expect(container.querySelectorAll('article')).toHaveLength(5);
  expect(container.querySelector('article')?.textContent).toContain('Session 994');
  await click('Newer workouts');
  expect(container.querySelector('article')?.textContent).toContain('Session 999');
  await click('Older workouts');
  await render(history.slice(0, 3));
  expect(container.querySelectorAll('article')).toHaveLength(3);
  expect(container.querySelector('article')?.textContent).toContain('Session 2');
  expect(button('Older workouts').disabled).toBe(true);
  await render([]);
  expect(container.querySelectorAll('article')).toHaveLength(0);
  expect(container.textContent).toContain('No completed sets');
});

it('keeps set drafts, calculator and previous-value actions intact without writes', async () => {
  const repository = createWorkoutRepository(new IDBFactory());
  let id = 0;
  let now = 1_000;
  const store = createWorkoutStore(repository, { id: () => `id-${++id}`, now: () => now++ });
  await store.getState().load();
  await store.getState().startWorkout('Yesterday', 'kg');
  await store.getState().addExercise('Bench press');
  await store.getState().addSet(store.getState().data.active!.exercises[0].id, 8, 60);
  await store.getState().finishWorkout();
  await store.getState().startWorkout('Today', 'kg');
  await store.getState().addExercise('Bench press');
  await act(async () => root.render(<WorkoutEditor store={store} onFinished={() => {}} />));
  const before = JSON.stringify(store.getState().data);
  const reps = await input('Reps', '7');
  const weight = await input('Weight (kg)', '63.5');
  await click('Exercise history'); await click('Exercise history');
  expect(reps.value).toBe('7'); expect(weight.value).toBe('63.5');
  expect([...container.querySelectorAll('summary')].some(el => el.textContent === 'Plate calculator')).toBe(true);
  expect(container.querySelector('[aria-label="Use previous set 1 for Bench press"]')).not.toBeNull();
  expect(JSON.stringify(store.getState().data)).toBe(before);
  expect(await repository.load()).toEqual(store.getState().data);
  await click('Exercise history');
  const savedId = store.getState().data.history[0].id;
  await act(async () => { await store.getState().deleteWorkout(savedId); });
  expect(container.textContent).toContain('No completed sets');
  expect(reps.value).toBe('7'); expect(weight.value).toBe('63.5');
  await act(async () => { await store.getState().load(); });
  expect(container.textContent).toContain('No completed sets');
  expect(reps.value).toBe('7'); expect(weight.value).toBe('63.5');
  const current = store.getState().data;
  const original = JSON.parse(before) as typeof current;
  await repository.save(current.revision, { ...current, history: original.history });
  await act(async () => { await store.getState().load(); });
  expect(container.textContent).toContain('Yesterday');
  expect(reps.value).toBe('7'); expect(weight.value).toBe('63.5');
});

it('lists bodyweight and loaded entries of one name separately, with added and assisted loads labelled', async () => {
  const pulls: Workout = { ...saved, exercises: [{ id: 'loaded', name: 'Pull-up', sets: [{ id: 'l', reps: 5, weight: 40 }] },
    { id: 'bw', name: 'Pull-up', bodyweight: true, sets: [{ id: 'a', reps: 8, weight: -20 }, { id: 'b', reps: 6, weight: 0 }] }] };
  await act(async () => root.render(<ExerciseHistory history={[pulls]} name="Pull-up" unit="kg" bodyweight startedAt={5_000} />));
  await click('Exercise history');
  expect(container.textContent).toContain('8 reps × −20 kg assist'); expect(container.textContent).toContain('6 reps × Bodyweight');
  expect(container.textContent).not.toContain('40 kg');
  await render([pulls], 'Pull-up');
  expect(container.textContent).toContain('5 reps × 40 kg'); expect(container.textContent).not.toContain('assist');
});

it('offers previous values only from entries with the same bodyweight setting', async () => {
  const repository = createWorkoutRepository(new IDBFactory());
  let id = 0, now = 1_000;
  const store = createWorkoutStore(repository, { id: () => `id-${++id}`, now: () => now++ });
  await store.getState().load();
  await store.getState().startWorkout('Yesterday', 'kg');
  await store.getState().addExercise('Pull-up');
  await store.getState().addSet(store.getState().data.active!.exercises[0].id, 5, 40);
  await store.getState().finishWorkout();
  await store.getState().startWorkout('Today', 'kg');
  await store.getState().addExercise('Pull-up');
  await act(async () => root.render(<WorkoutEditor store={store} onFinished={() => {}} />));
  expect(container.querySelector('[aria-label="Use previous set 1 for Pull-up"]')).not.toBeNull();
  await act(async () => { await store.getState().setExerciseBodyweight(store.getState().data.active!.exercises[0].id, true); });
  expect(container.querySelector('[aria-label="Use previous set 1 for Pull-up"]')).toBeNull();
});
