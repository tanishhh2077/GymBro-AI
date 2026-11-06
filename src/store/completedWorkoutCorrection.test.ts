import { IDBFactory } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';
import { resolveSetLink } from '@/core/setLinks';
import { summarizeWorkout } from '@/core/workoutSummary';
import { buildWorkoutProgress } from '@/core/workoutProgress';

async function setup() {
  const repository = createWorkoutRepository(new IDBFactory());
  const workout = { id: 'w', name: 'Upper', unit: 'kg' as const, startedAt: 100, finishedAt: 200,
    exercises: [{ id: 'e', name: 'Bench press', targetReps: 8, sets: [{ id: 's', reps: 8, weight: 60 }] }] };
  await repository.save(0, { ...emptyWorkoutData(), history: [workout] });
  const store = createWorkoutStore(repository); await store.getState().load();
  const input = { name: 'Corrected', exercises: [{ id: 'e', sets: [{ id: 's', reps: 9, weight: 65, kind: 'warmup' as const }] }] };
  return { repository, store, workout, input };
}

it('atomically corrects only name and actual values while preserving identity and dates', async () => {
  const { store, repository, workout, input } = await setup();
  expect(await store.getState().correctCompletedWorkout('w', 1, input)).toEqual({ ok: true });
  expect((await repository.load()).history[0]).toEqual({ ...workout, name: 'Corrected',
    exercises: [{ ...workout.exercises[0], sets: input.exercises[0].sets }] });
  expect(store.getState().data.revision).toBe(2);
});

it('rejects stale drafts after reload and other-tab conflicts without overwriting', async () => {
  const { store, repository, input } = await setup();
  const other = createWorkoutStore(repository); await other.getState().load();
  await other.getState().correctCompletedWorkout('w', 1, { ...input, name: 'Other tab' });
  expect((await store.getState().correctCompletedWorkout('w', 1, input)).ok).toBe(false);
  expect(store.getState().needsReload).toBe(true);
  await store.getState().load();
  expect((await store.getState().correctCompletedWorkout('w', 1, input)).ok).toBe(false);
  expect((await repository.load()).history[0].name).toBe('Other tab');
});

it('rejects changed structure, invalid values and missing finished workouts before writes', async () => {
  const { store, repository, input } = await setup();
  const save = vi.spyOn(repository, 'save');
  for (const change of [ { ...input, exercises: [] },
    { ...input, name: ' ' },
    { ...input, exercises: [{ id: 'e', sets: [] }] },
    { ...input, exercises: [{ id: 'e', sets: [{ id: 'other', reps: 9, weight: 65 }] }] },
    { ...input, exercises: [{ id: 'e', sets: [{ id: 's', reps: 0, weight: 65 }] }] } ]) {
    expect((await store.getState().correctCompletedWorkout('w', 1, change)).ok).toBe(false);
  }
  expect((await store.getState().correctCompletedWorkout('missing', 1, input)).ok).toBe(false);
  expect(save).not.toHaveBeenCalled();
});

it('keeps memory unchanged when saving fails', async () => {
  const { store, repository, input } = await setup(); const before = store.getState().data;
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('disk'));
  expect((await store.getState().correctCompletedWorkout('w', 1, input)).ok).toBe(false);
  expect(store.getState().data).toBe(before);
  expect(store.getState().needsReload).toBe(true);
});

it('recomputes derived summaries and records, resolves session links and leaves active data alone', async () => {
  const { store, input } = await setup();
  await store.getState().startWorkout('In progress', 'lb');
  const before = store.getState().data;
  expect(buildWorkoutProgress(before.history)[0].heaviestSet.weight).toBe(60);
  await store.getState().correctCompletedWorkout('w', before.revision, input);
  let data = store.getState().data;
  expect(data.active).toEqual(before.active);
  expect(summarizeWorkout(data.history[0])).toMatchObject({ volume: 585, warmups: 1, regular: 0 });
  expect(buildWorkoutProgress(data.history)).toEqual([]);
  expect(resolveSetLink(data, { workoutId: 'w', exerciseId: 'e', setId: 's' })?.set).toMatchObject({ reps: 9, weight: 65, kind: 'warmup' });
  await store.getState().correctCompletedWorkout('w', data.revision, { ...input,
    exercises: [{ id: 'e', sets: [{ id: 's', reps: 10, weight: 0, kind: 'regular' }] }] });
  data = store.getState().data;
  expect(buildWorkoutProgress(data.history)[0].heaviestSet).toMatchObject({ weight: 0, reps: 10, workoutName: 'Corrected' });
  expect(data.history[0].exercises[0].sets[0]).not.toHaveProperty('kind');
});
