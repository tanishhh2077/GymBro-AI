import { IDBFactory } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { emptyWorkoutData, validateWorkoutData } from './workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { buildWorkoutProgress } from './workoutProgress';
import { findPreviousExercise } from './previousWorkout';
import { createWorkoutBackup, mergeWorkoutBackup, parseWorkoutBackup } from './workoutBackup';
import { mergeWorkoutSync } from './workoutSync';
import type { WorkoutData, Workout } from '@/types/workout';

function workout(): Workout {
  return { id: 'w', name: 'Workout', unit: 'kg', startedAt: 10, finishedAt: 20,
    exercises: [{ id: 'e', name: 'Bench press', sets: [
      { id: 'warm', reps: 20, weight: 100, kind: 'warmup' }, { id: 'work', reps: 8, weight: 60 },
    ] }] };
}
function data(): WorkoutData { return { ...emptyWorkoutData(), version: 3, history: [workout()] }; }
it.each([1, 2])('reads strict schema%s by changing only its version digit', version => {
  const original = { ...emptyWorkoutData(), version };
  expect(validateWorkoutData(original)).toEqual({ ...original, version: 4 });
  expect(original.version).toBe(version);
});
it('accepts schema3 labels and rejects labels in older schemas and unknown values', () => {
  expect(validateWorkoutData(data()).history[0].exercises[0].sets[0].kind).toBe('warmup');
  expect(() => validateWorkoutData({ ...data(), version: 2 })).toThrow();
  const bad = JSON.parse(JSON.stringify(data())); bad.history[0].exercises[0].sets[0].kind = 'drop';
  expect(() => validateWorkoutData(bad)).toThrow();
});
it('keeps warm-up sets out of progress and treats missing labels as regular', () => {
  const group = buildWorkoutProgress(data().history)[0];
  expect(group.loggedSetCount).toBe(1); expect(group.heaviestSet.setId).toBe('work');
  const source = workout(); const warmups = { ...source, exercises: [{ ...source.exercises[0], sets: [source.exercises[0].sets[0]] }] };
  expect(buildWorkoutProgress([warmups])).toEqual([]);
});
it('suggests previous values from the selected set type', () => {
  const current = { ...workout(), startedAt: 30, finishedAt: null };
  expect(findPreviousExercise([workout()], current, 'Bench press')?.sets.map(s => s.id)).toEqual(['work']);
  expect(findPreviousExercise([workout()], current, 'Bench press', 'warmup')?.sets.map(s => s.id)).toEqual(['warm']);
});
it('preserves set kinds through backup and detects a label-only restore conflict', () => {
  const backup = parseWorkoutBackup(createWorkoutBackup(data(), 100));
  expect(mergeWorkoutBackup(emptyWorkoutData(), backup).data.history[0].exercises[0].sets[0].kind).toBe('warmup');
  const source = workout(); const changed = { ...source, exercises: [{ ...source.exercises[0], sets: source.exercises[0].sets.map(s => ({ id: s.id, reps: s.reps, weight: s.weight })) }] };
  expect(() => mergeWorkoutBackup({ ...data(), history: [changed] }, backup)).toThrow(/conflict/i);
});
it('carries set kinds through sync and exposes concurrent type-versus-value edits', () => {
  const source = workout(); const base = { ...source, exercises: [{ ...source.exercises[0], sets: [{ id: 's', reps: 8, weight: 60 }] }] };
  const local = JSON.parse(JSON.stringify(base)); local.exercises[0].sets[0].kind = 'warmup';
  const remote = JSON.parse(JSON.stringify(base)); remote.exercises[0].sets[0].weight = 65;
  expect(mergeWorkoutSync({ ...data(), history: [base] }, { ...data(), history: [local] }, { ...data(), history: [remote] }).conflicts).toHaveLength(1);
});
it('merges current set kinds into a valid legacy schema2 device library', () => {
  const legacy = { ...emptyWorkoutData(), version: 2 as const };
  const result = mergeWorkoutSync(legacy, legacy, data());
  expect(result.data.version).toBe(4);
  expect(result.data.history[0].exercises[0].sets[0].kind).toBe('warmup');
});
it('saves, reloads and edits set kinds while preserving old call behavior', async () => {
  const repo = createWorkoutRepository(new IDBFactory()); let id = 0;
  const store = createWorkoutStore(repo, { id: () => `s${++id}`, now: () => 10 });
  await store.getState().load(); await store.getState().startWorkout('Workout', 'kg'); await store.getState().addExercise('Bench press');
  const exercise = store.getState().data.active!.exercises[0].id;
  await store.getState().addSet(exercise, 10, 20, 'warmup');
  const set = store.getState().data.active!.exercises[0].sets[0].id;
  await store.getState().updateSet(exercise, set, 12, 25);
  expect((await repo.load()).active?.exercises[0].sets[0].kind).toBe('warmup');
  await store.getState().updateSet(exercise, set, 8, 60, 'regular');
  expect((await repo.load()).active?.exercises[0].sets[0]).toEqual({ id: set, reps: 8, weight: 60 });
  expect((await store.getState().addSet(exercise, 8, 60, 'drop' as never)).ok).toBe(false);
});
