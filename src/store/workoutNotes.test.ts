import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, expect, it } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import type { Workout, WorkoutData } from '@/types/workout';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

let repository: ReturnType<typeof createWorkoutRepository>;
let ids: number;
let clock: number;
const finished: Workout = { id: 'done', name: 'Push day', unit: 'lb', startedAt: 100, finishedAt: 200, exercises: [
  { id: 'e1', name: 'Bench press', targetSets: 3, targetReps: 5, targetWeight: 185, sets: [{ id: 's1', reps: 5, weight: 185 }] },
  { id: 'e2', name: 'Dip', sets: [{ id: 's2', reps: 10, weight: 0, kind: 'warmup' }] },
] };
async function open(data: WorkoutData = { ...emptyWorkoutData(), history: [finished] }) {
  await repository.save(0, data);
  const store = createWorkoutStore(repository, { id: () => `id-${++ids}`, now: () => clock });
  await store.getState().load();
  return store;
}
beforeEach(() => { repository = createWorkoutRepository(new IDBFactory()); ids = 0; clock = 1000; });

it('saves, trims and removes a note on active and finished workouts', async () => {
  const store = await open(), s = store.getState();
  expect(await s.setWorkoutNote('done', '  Elbows flared on set 3.\n\tTry a narrower grip.  ')).toEqual({ ok: true });
  expect((await repository.load()).history[0].note).toBe('Elbows flared on set 3.\n\tTry a narrower grip.');
  await s.startWorkout('Today', 'kg');
  const active = store.getState().data.active!.id;
  expect(await s.setWorkoutNote(active, 'Short on time')).toEqual({ ok: true });
  expect((await repository.load()).active?.note).toBe('Short on time');
  expect(await s.setWorkoutNote(active, '   ')).toEqual({ ok: true });
  expect(Object.prototype.hasOwnProperty.call((await repository.load()).active, 'note')).toBe(false);
  expect((await repository.load()).history[0].exercises).toEqual(finished.exercises);
});
it('treats an unchanged note as a no-op without a write', async () => {
  const store = await open(); await store.getState().setWorkoutNote('done', 'Same');
  const revision = store.getState().data.revision;
  expect(await store.getState().setWorkoutNote('done', ' Same ')).toEqual({ ok: true });
  expect(store.getState().data.revision).toBe(revision);
});
it.each([
  ['x'.repeat(1001), /1000 characters/], ['a\u0007b', /control characters/], ['a\rb', /control characters/],
])('rejects an invalid note before writing', async (note, message) => {
  const store = await open(); const before = await repository.load();
  const result = await store.getState().setWorkoutNote('done', note);
  expect(result.ok).toBe(false); expect(!result.ok && result.message).toMatch(message);
  expect(await repository.load()).toEqual(before); expect(store.getState().needsReload).toBe(false);
});
it('refuses a note for an unknown or deleted workout', async () => {
  const store = await open();
  expect(await store.getState().setWorkoutNote('missing', 'n')).toEqual({ ok: false, message: 'This workout is no longer available.' });
  await store.getState().deleteWorkout('done');
  expect((await store.getState().setWorkoutNote('done', 'n')).ok).toBe(false);
});
it('keeps a note when a finished workout is corrected', async () => {
  const store = await open(); await store.getState().setWorkoutNote('done', 'Keep me');
  const input = { name: 'Corrected', exercises: finished.exercises.map(e => ({ id: e.id, sets: e.sets })) };
  expect(await store.getState().correctCompletedWorkout('done', store.getState().data.revision, input)).toEqual({ ok: true });
  expect((await repository.load()).history[0]).toMatchObject({ name: 'Corrected', note: 'Keep me' });
  expect((await repository.load()).history[0].exercises[0].targetWeight).toBe(185);
});
it('saves routine target weights and copies all targets into a started workout', async () => {
  const store = await open(emptyWorkoutData()), s = store.getState();
  expect(await s.createRoutine({ name: 'Plan', unit: 'kg', exercises: [
    { name: 'Squat', targetSets: 5, targetReps: 5, targetWeight: 102.5 }, { name: 'Row' },
  ] })).toEqual({ ok: true });
  const routine = store.getState().data.routines![0];
  expect(routine.exercises[0].targetWeight).toBe(102.5);
  expect(Object.prototype.hasOwnProperty.call(routine.exercises[1], 'targetWeight')).toBe(false);
  await s.startRoutine(routine.id);
  expect(store.getState().data.active!.exercises[0]).toMatchObject({ targetSets: 5, targetReps: 5, targetWeight: 102.5, sets: [] });
  expect(await s.updateRoutine(routine.id, store.getState().data.revision, { name: 'Plan', unit: 'kg', exercises: [{ name: 'Squat', targetWeight: 110 }] }))
    .toEqual({ ok: true });
  expect(store.getState().data.routines![0].exercises[0].targetWeight).toBe(110);
  expect(store.getState().data.active!.exercises[0].targetWeight).toBe(102.5);
  const bad = await s.updateRoutine(routine.id, store.getState().data.revision, { name: 'Plan', unit: 'kg', exercises: [{ name: 'Squat', targetWeight: 10001 }] });
  expect(bad).toEqual({ ok: false, message: 'Enter a target weight from 0 to 10000, or leave it blank.' });
});
it('moves active exercises up and down while preserving logged sets and IDs', async () => {
  const store = await open(emptyWorkoutData()), s = store.getState();
  await s.startWorkout('Day', 'kg'); await s.addExercise('A'); await s.addExercise('B'); await s.addExercise('C');
  const [a, b, c] = store.getState().data.active!.exercises.map(e => e.id);
  await s.addSet(a, 5, 50, 'warmup');
  expect(await s.moveExercise(a, 'down')).toEqual({ ok: true });
  expect(store.getState().data.active!.exercises.map(e => e.id)).toEqual([b, a, c]);
  expect(await s.moveExercise(c, 'up')).toEqual({ ok: true });
  expect((await repository.load()).active!.exercises.map(e => e.id)).toEqual([b, c, a]);
  expect((await repository.load()).active!.exercises[2].sets).toMatchObject([{ reps: 5, weight: 50, kind: 'warmup' }]);
  const revision = store.getState().data.revision;
  expect(await s.moveExercise(b, 'up')).toEqual({ ok: false, message: 'This exercise is already first.' });
  expect(await s.moveExercise(a, 'down')).toEqual({ ok: false, message: 'This exercise is already last.' });
  expect(await s.moveExercise('missing', 'up')).toEqual({ ok: false, message: 'This exercise is no longer in the active workout.' });
  expect((await s.moveExercise(a, 'sideways' as never)).ok).toBe(false);
  expect(store.getState().data.revision).toBe(revision);
  await s.discardWorkout();
  expect(await s.moveExercise(a, 'up')).toEqual({ ok: false, message: 'Start a workout first.' });
});
it('repeats a finished workout as a fresh empty plan without changing the source', async () => {
  const store = await open(); await store.getState().setWorkoutNote('done', 'Source note');
  const source = structuredClone(store.getState().data.history[0]);
  clock = 5000;
  expect(await store.getState().repeatWorkout('done')).toEqual({ ok: true });
  const repeated = (await repository.load()).active!;
  expect(repeated).toEqual({ id: expect.any(String), name: 'Push day', unit: 'lb', startedAt: 5000, finishedAt: null, exercises: [
    { id: expect.any(String), name: 'Bench press', targetSets: 3, targetReps: 5, targetWeight: 185, sets: [] },
    { id: expect.any(String), name: 'Dip', sets: [] },
  ] });
  const fresh = [repeated.id, ...repeated.exercises.map(e => e.id)];
  expect(new Set(fresh).size).toBe(3);
  expect(fresh.some(id => ['done', 'e1', 'e2', 's1', 's2'].includes(id))).toBe(false);
  expect((await repository.load()).history[0]).toEqual(source);
  expect(await store.getState().repeatWorkout('done')).toEqual({ ok: false,
    message: 'Finish or discard the active workout before repeating another.' });
  await store.getState().discardWorkout();
  expect(await store.getState().repeatWorkout('missing')).toEqual({ ok: false, message: 'This saved workout is no longer available.' });
});
