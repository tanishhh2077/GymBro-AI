import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, expect, it } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import type { Workout, WorkoutData, WorkoutExercise } from '@/types/workout';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

let repository: ReturnType<typeof createWorkoutRepository>;
let ids: number;
let clock: number;
const exercise = (id: string, extra: Partial<WorkoutExercise> = {}): WorkoutExercise => ({ id, name: `Ex ${id}`, sets: [], ...extra });
function draft(exercises: WorkoutExercise[]): Workout {
  return { id: 'live', name: 'Today', unit: 'kg', startedAt: 100, finishedAt: null, exercises };
}
async function open(data: Partial<WorkoutData> = {}) {
  await repository.save(0, { ...emptyWorkoutData(), ...data });
  const store = createWorkoutStore(repository, { id: () => `id-${++ids}`, now: () => clock });
  await store.getState().load();
  return store;
}
const order = (store: Awaited<ReturnType<typeof open>>) =>
  store.getState().data.active!.exercises.map(e => e.superset ? `${e.id}:${e.superset}` : e.id);
async function rejected(promise: Promise<{ ok: boolean; message?: string }>, message: RegExp) {
  const result = await promise;
  expect(result.ok).toBe(false);
  expect(!result.ok && (result as { message: string }).message).toMatch(message);
}
beforeEach(() => { repository = createWorkoutRepository(new IDBFactory()); ids = 0; clock = 1000; });

it('adds, keeps, changes and clears RPE on sets without affecting other fields', async () => {
  const store = await open({ active: draft([exercise('a')]) }), s = store.getState();
  expect(await s.addSet('a', 5, 60, 'regular', 8.5)).toEqual({ ok: true });
  expect(await s.addSet('a', 5, 60)).toEqual({ ok: true });
  let sets = (await repository.load()).active!.exercises[0].sets;
  expect(sets[0]).toEqual({ id: 'id-1', reps: 5, weight: 60, rpe: 8.5 });
  expect(Object.prototype.hasOwnProperty.call(sets[1], 'rpe')).toBe(false);
  expect(await s.updateSet('a', 'id-1', 6, 60)).toEqual({ ok: true });
  expect((await repository.load()).active!.exercises[0].sets[0].rpe).toBe(8.5);
  expect(await s.updateSet('a', 'id-1', 6, 60, 'warmup', 9)).toEqual({ ok: true });
  expect((await repository.load()).active!.exercises[0].sets[0]).toEqual({ id: 'id-1', reps: 6, weight: 60, kind: 'warmup', rpe: 9 });
  expect(await s.updateSet('a', 'id-1', 6, 60, undefined, null)).toEqual({ ok: true });
  sets = (await repository.load()).active!.exercises[0].sets;
  expect(sets[0]).toEqual({ id: 'id-1', reps: 6, weight: 60, kind: 'warmup' });
});
it.each([0, 10.5, 7.3, Number.NaN])('rejects RPE %s before writing', async rpe => {
  const store = await open({ active: draft([exercise('a', { sets: [{ id: 's', reps: 1, weight: 1 }] })]) });
  const before = await repository.load();
  await rejected(store.getState().addSet('a', 5, 60, 'regular', rpe), /RPE from 1 to 10 in steps of 0\.5/);
  await rejected(store.getState().updateSet('a', 's', 5, 60, undefined, rpe), /RPE/);
  expect(await repository.load()).toEqual(before);
});
it('keeps, changes or clears RPE when a completed workout is corrected', async () => {
  const done: Workout = { id: 'done', name: 'Done', unit: 'kg', startedAt: 1, finishedAt: 2, exercises: [
    exercise('a', { sets: [{ id: 's1', reps: 5, weight: 60, rpe: 8 }, { id: 's2', reps: 5, weight: 60, rpe: 9 }, { id: 's3', reps: 5, weight: 60, rpe: 7 }] })] };
  const store = await open({ history: [done] });
  const input = { name: 'Done', exercises: [{ id: 'a', sets: [{ id: 's1', reps: 5, weight: 60 }, { id: 's2', reps: 5, weight: 60, rpe: 6.5 },
    { id: 's3', reps: 5, weight: 60, rpe: null }] }] };
  expect(await store.getState().correctCompletedWorkout('done', store.getState().data.revision, input)).toEqual({ ok: true });
  expect((await repository.load()).history[0].exercises[0].sets).toEqual([
    { id: 's1', reps: 5, weight: 60, rpe: 8 }, { id: 's2', reps: 5, weight: 60, rpe: 6.5 }, { id: 's3', reps: 5, weight: 60 }]);
});
it('groups neighbouring exercises into a superset and ungroups them', async () => {
  const store = await open({ active: draft([exercise('a'), exercise('b'), exercise('c'), exercise('d')]) }), s = store.getState();
  expect(await s.groupSuperset(['c', 'b'])).toEqual({ ok: true });
  expect(order(store)).toEqual(['a', 'b:id-1', 'c:id-1', 'd']);
  expect((await repository.load()).active).toEqual(store.getState().data.active);
  await rejected(s.groupSuperset(['c', 'd']), /already in a superset/);
  await rejected(s.groupSuperset(['a', 'd']), /next to each other/);
  await rejected(s.groupSuperset(['a']), /at least two exercises/);
  await rejected(s.groupSuperset(['a', 'a']), /at least two exercises/);
  await rejected(s.groupSuperset(['a', 'missing']), /no longer in the active workout/);
  expect(await s.ungroupSuperset('id-1')).toEqual({ ok: true });
  expect(order(store)).toEqual(['a', 'b', 'c', 'd']);
  expect(Object.prototype.hasOwnProperty.call((await repository.load()).active!.exercises[1], 'superset')).toBe(false);
  await rejected(s.ungroupSuperset('id-1'), /superset is no longer/);
  expect(await s.groupSuperset(['a', 'b', 'c'])).toEqual({ ok: true });
  expect(order(store)).toEqual(['a:id-2', 'b:id-2', 'c:id-2', 'd']);
});
it('moves a grouped exercise with its whole superset and never splits a group', async () => {
  const store = await open({ active: draft([exercise('a'), exercise('b', { superset: 'g' }), exercise('c', { superset: 'g' }),
    exercise('d'), exercise('e', { superset: 'h' }), exercise('f', { superset: 'h' })]) }), s = store.getState();
  expect(await s.moveExercise('c', 'up')).toEqual({ ok: true });
  expect(order(store)).toEqual(['b:g', 'c:g', 'a', 'd', 'e:h', 'f:h']);
  await rejected(s.moveExercise('b', 'up'), /already first/);
  expect(await s.moveExercise('d', 'down')).toEqual({ ok: true });
  expect(order(store)).toEqual(['b:g', 'c:g', 'a', 'e:h', 'f:h', 'd']);
  expect(await s.moveExercise('a', 'down')).toEqual({ ok: true });
  expect(order(store)).toEqual(['b:g', 'c:g', 'e:h', 'f:h', 'a', 'd']);
  expect(await s.moveExercise('e', 'up')).toEqual({ ok: true });
  expect(order(store)).toEqual(['e:h', 'f:h', 'b:g', 'c:g', 'a', 'd']);
  await rejected(s.moveExercise('d', 'down'), /already last/);
  expect((await repository.load()).active).toEqual(store.getState().data.active);
});
it('dissolves a two-member superset when one member is removed and keeps larger groups', async () => {
  const store = await open({ active: draft([exercise('a', { superset: 'g' }), exercise('b', { superset: 'g' }),
    exercise('c', { superset: 'h' }), exercise('d', { superset: 'h' }), exercise('e', { superset: 'h' })]) }), s = store.getState();
  expect(await s.removeExercise('a')).toEqual({ ok: true });
  expect(order(store)).toEqual(['b', 'c:h', 'd:h', 'e:h']);
  expect(await s.removeExercise('d')).toEqual({ ok: true });
  expect(order(store)).toEqual(['b', 'c:h', 'e:h']);
});
it('switches bodyweight on an exercise, allows assistance and refuses switching off over negative sets', async () => {
  const store = await open({ active: draft([exercise('a', { sets: [{ id: 's', reps: 8, weight: 0 }] })]) }), s = store.getState();
  await rejected(s.addSet('a', 8, -20), /weight from 0 to 10000/);
  expect(await s.setExerciseBodyweight('a', true)).toEqual({ ok: true });
  const revision = store.getState().data.revision;
  expect(await s.setExerciseBodyweight('a', true)).toEqual({ ok: true });
  expect(store.getState().data.revision).toBe(revision);
  expect(await s.addSet('a', 8, -20)).toEqual({ ok: true });
  await rejected(s.addSet('a', 8, -1000.5), /added weight from -1000 to 10000/);
  expect((await repository.load()).active!.exercises[0]).toMatchObject({ bodyweight: true, sets: [{ weight: 0 }, { weight: -20 }] });
  await rejected(s.setExerciseBodyweight('a', false), /assisted/);
  expect(await s.updateSet('a', 'id-1', 8, 10)).toEqual({ ok: true });
  expect(await s.setExerciseBodyweight('a', false)).toEqual({ ok: true });
  expect(Object.prototype.hasOwnProperty.call((await repository.load()).active!.exercises[0], 'bodyweight')).toBe(false);
  await rejected(s.setExerciseBodyweight('missing', true), /no longer in the active workout/);
});
it('lets a completed bodyweight set be corrected to assistance but not a plain one', async () => {
  const done: Workout = { id: 'done', name: 'Done', unit: 'kg', startedAt: 1, finishedAt: 2, exercises: [
    exercise('a', { bodyweight: true, sets: [{ id: 's1', reps: 5, weight: 0 }] }), exercise('b', { sets: [{ id: 's2', reps: 5, weight: 10 }] })] };
  const store = await open({ history: [done] });
  const input = (a: number, b: number) => ({ name: 'Done', exercises: [{ id: 'a', sets: [{ id: 's1', reps: 5, weight: a }] }, { id: 'b', sets: [{ id: 's2', reps: 5, weight: b }] }] });
  expect(await store.getState().correctCompletedWorkout('done', store.getState().data.revision, input(-15, 10))).toEqual({ ok: true });
  await rejected(store.getState().correctCompletedWorkout('done', store.getState().data.revision, input(-15, -10)), /weight from 0 to 10000/);
});
it('repeats a workout and starts a routine with fresh superset IDs and copied bodyweight flags', async () => {
  const done: Workout = { id: 'done', name: 'Done', unit: 'kg', startedAt: 1, finishedAt: 2, exercises: [
    exercise('a', { superset: 'g', sets: [{ id: 's1', reps: 5, weight: 60, rpe: 8 }] }),
    exercise('b', { superset: 'g', bodyweight: true, sets: [{ id: 's2', reps: 8, weight: -20 }] })] };
  const store = await open({ history: [done] }), s = store.getState();
  expect(await s.repeatWorkout('done')).toEqual({ ok: true });
  expect(store.getState().data.active!.exercises).toEqual([
    { id: 'id-2', name: 'Ex a', superset: 'id-3', sets: [] }, { id: 'id-4', name: 'Ex b', superset: 'id-3', bodyweight: true, sets: [] }]);
  await s.discardWorkout();
  expect(await s.createRoutine({ name: 'Plan', unit: 'lb', exercises: [{ name: 'Row', superset: 'x' }, { name: 'Pull-up', superset: 'x', bodyweight: true },
    { name: 'Dip', bodyweight: true }] })).toEqual({ ok: true });
  const routine = store.getState().data.routines![0];
  expect(routine.exercises.map(e => [e.superset ?? null, e.bodyweight ?? null])).toEqual([[routine.exercises[0].superset, null],
    [routine.exercises[0].superset, true], [null, true]]);
  expect(routine.exercises[0].superset).not.toBe('x');
  expect(await s.startRoutine(routine.id)).toEqual({ ok: true });
  const started = store.getState().data.active!.exercises;
  expect(started.map(e => e.bodyweight ?? null)).toEqual([null, true, true]);
  expect(started[0].superset).toBe(started[1].superset);
  expect(started[0].superset).not.toBe(routine.exercises[0].superset);
  expect(started[2].superset).toBeUndefined();
});
it('edits routine supersets and bodyweight through create and update with specific errors', async () => {
  const store = await open(), s = store.getState();
  await rejected(s.createRoutine({ name: 'Plan', unit: 'kg', exercises: [{ name: 'Row', superset: 'x' }, { name: 'Dip' }] }), /two or more neighbouring/);
  await rejected(s.createRoutine({ name: 'Plan', unit: 'kg', exercises: [{ name: 'Row', superset: 'x' }, { name: 'Dip' }, { name: 'Pull', superset: 'x' }] }),
    /two or more neighbouring/);
  await rejected(s.createRoutine({ name: 'Plan', unit: 'kg', exercises: [{ name: 'Row', superset: 'bad label' }, { name: 'Dip', superset: 'bad label' }] }),
    /superset label/);
  expect(await s.createRoutine({ name: 'Plan', unit: 'kg', exercises: [{ name: 'Row' }, { name: 'Dip' }] })).toEqual({ ok: true });
  const id = store.getState().data.routines![0].id;
  expect(await s.updateRoutine(id, store.getState().data.revision, { name: 'Plan', unit: 'kg',
    exercises: [{ name: 'Row', superset: 'p' }, { name: 'Dip', superset: 'p', bodyweight: true }] })).toEqual({ ok: true });
  const saved = (await repository.load()).routines![0];
  expect(saved.exercises[1]).toMatchObject({ name: 'Dip', bodyweight: true, superset: saved.exercises[0].superset });
});
it('creates, updates and deletes goals with bounds, uniqueness and revision checks', async () => {
  const store = await open(), s = store.getState();
  expect(await s.createGoal({ name: ' Pull-up ', unit: 'kg', bodyweight: true, weight: -10, reps: 5 })).toEqual({ ok: true });
  expect((await repository.load()).goals).toEqual([{ id: 'id-1', name: 'Pull-up', unit: 'kg', bodyweight: true, weight: -10, reps: 5, createdAt: 1000 }]);
  expect(await s.createGoal({ name: 'Pull-up', unit: 'kg', bodyweight: false, weight: 20, reps: 5 })).toEqual({ ok: true });
  expect(Object.prototype.hasOwnProperty.call(store.getState().data.goals![1], 'bodyweight')).toBe(false);
  await rejected(s.createGoal({ name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 0, reps: 3 }), /already have a goal for "Pull-up" in kg \(bodyweight\)/);
  await rejected(s.createGoal({ name: 'Bench', unit: 'kg', weight: -5, reps: 3 }), /weight from 0 to 10000/);
  await rejected(s.createGoal({ name: 'Bench', unit: 'kg', weight: 100, reps: 0 }), /reps from 1 to 1000/);
  await rejected(s.createGoal({ name: 'Bench', unit: 'st' as never, weight: 100, reps: 1 }), /kg or lb/);
  await rejected(s.createGoal({ name: '  ', unit: 'kg', weight: 100, reps: 1 }), /1 to 80 characters/);
  const revision = store.getState().data.revision;
  clock = 5000;
  expect(await s.updateGoal('id-1', revision, { name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 0, reps: 8 })).toEqual({ ok: true });
  expect(store.getState().data.goals![0]).toEqual({ id: 'id-1', name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 0, reps: 8, createdAt: 1000 });
  await rejected(s.updateGoal('id-1', revision, { name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 0, reps: 9 }), /changed/);
  await rejected(s.updateGoal('id-1', store.getState().data.revision, { name: 'Pull-up', unit: 'kg', weight: 0, reps: 9 }), /already have a goal/);
  const unchanged = store.getState().data.revision;
  expect(await s.updateGoal('id-1', unchanged, { name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 0, reps: 8 })).toEqual({ ok: true });
  expect(store.getState().data.revision).toBe(unchanged);
  expect(await s.deleteGoal('id-1')).toEqual({ ok: true });
  await rejected(s.deleteGoal('id-1'), /goal is no longer available/);
  await rejected(s.updateGoal('id-1', store.getState().data.revision, { name: 'X', unit: 'kg', weight: 0, reps: 1 }), /goal is no longer available/);
  expect((await repository.load()).goals!.map(g => g.id)).toEqual(['id-2']);
});
it('refuses a 101st goal', async () => {
  const goals = Array.from({ length: 100 }, (_, i) => ({ id: `g${i}`, name: `E${i}`, unit: 'kg' as const, weight: 1, reps: 1, createdAt: 1 }));
  const store = await open({ goals });
  await rejected(store.getState().createGoal({ name: 'New', unit: 'kg', weight: 1, reps: 1 }), /100 goals/);
});
