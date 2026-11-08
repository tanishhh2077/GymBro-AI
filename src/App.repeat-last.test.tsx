import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout, WorkoutData } from '@/types/workout';
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

const finished = (id: string, name: string, finishedAt: number): Workout => ({
  id, name, unit: 'kg', startedAt: finishedAt - 1000, finishedAt,
  exercises: [{ id: `${id}-e`, name: 'Bench press', targetSets: 3, sets: [{ id: `${id}-s`, reps: 5, weight: 80 }] }],
});
async function render(data: WorkoutData) {
  await repository.save(0, data);
  await act(async () => root.render(<App workouts={store} />));
  await act(async () => { await store.getState().load(); });
}
const find = (name: string) => [...container.querySelectorAll('button')]
  .find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);

it('repeats the most recent finished workout from Home with no logged sets', async () => {
  await render({ ...emptyWorkoutData(), history: [finished('old', 'Older day', 100_000), finished('new', 'Newest day', 200_000)] });
  expect(find('Repeat last workout')).toBeTruthy();
  await act(async () => { find('Repeat last workout')!.click(); });
  // Saving goes through IndexedDB, so wait in separate act() scopes until the workout exists.
  for (let i = 0; i < 500 && !store.getState().data.active; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }

  const active = store.getState().data.active!;
  expect(active.name).toBe('Newest day');
  expect(active.exercises.map(e => e.name)).toEqual(['Bench press']);
  expect(active.exercises[0].sets).toEqual([]);
  expect(container.querySelector('h1')?.textContent).toBe('Newest day');
});

it('offers no repeat without a finished workout or while a workout is active', async () => {
  await render(emptyWorkoutData());
  expect(find('Repeat last workout')).toBeUndefined();

  await act(async () => { await store.getState().startWorkout('In progress', 'kg'); });
  await act(async () => { await store.getState().addExercise('Squat'); });
  await act(async () => { await store.getState().addSet(store.getState().data.active!.exercises[0].id, 5, 100); });
  await act(async () => { await store.getState().finishWorkout(); });
  expect(find('Repeat last workout')).toBeTruthy();

  await act(async () => { await store.getState().startWorkout('Another', 'kg'); });
  expect(find('Repeat last workout')).toBeUndefined();
});
