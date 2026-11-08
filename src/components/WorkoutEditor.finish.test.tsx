import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { createUnsavedChanges, UnsavedChangesContext } from './unsavedChanges';
import { WorkoutEditor } from './WorkoutEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
const onFinished = vi.fn();

beforeEach(async () => {
  onFinished.mockReset();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const repository = createWorkoutRepository(new IDBFactory());
  await repository.save(0, { ...emptyWorkoutData(), active: {
    id: 'w1', name: 'Upper', unit: 'kg', startedAt: 1000, finishedAt: null,
    exercises: [
      { id: 'e1', name: 'Bench press', sets: [{ id: 's1', reps: 5, weight: 60 }] },
      { id: 'e2', name: 'Curl', sets: [] },
    ],
  } });
  store = createWorkoutStore(repository);
  await store.getState().load();
  await act(async () => root.render(<UnsavedChangesContext.Provider value={createUnsavedChanges()}>
    <WorkoutEditor store={store} onFinished={onFinished} />
  </UnsavedChangesContext.Provider>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const button = (name: string) => [...container.querySelectorAll('button')].find(el => el.textContent?.trim() === name);
async function settle() {
  for (let i = 0; i < 200 && store.getState().busy; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

it('explains next to Finish which exercises have no sets, instead of failing silently off screen', async () => {
  await act(async () => { button('Finish workout')!.click(); });
  await settle();
  const finish = button('Finish workout')!;
  const message = finish.parentElement!.querySelector('[role="alert"]');
  expect(message?.textContent).toContain('Curl has no logged sets');
  expect(store.getState().data.active).not.toBeNull();
  expect(onFinished).not.toHaveBeenCalled();
});

it('removes the empty exercises and finishes in one tap when the user asks', async () => {
  await act(async () => { button('Finish workout')!.click(); });
  await settle();
  await act(async () => { button('Remove empty exercise and finish')!.click(); });
  await settle();
  expect(store.getState().data.active).toBeNull();
  expect(store.getState().data.history[0].exercises.map(e => e.name)).toEqual(['Bench press']);
  expect(onFinished).toHaveBeenCalledWith('w1');
});
