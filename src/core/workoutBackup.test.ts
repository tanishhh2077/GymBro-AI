import { expect, it } from 'vitest';
import type { Workout, WorkoutData, WorkoutRoutine } from '@/types/workout';
import { emptyWorkoutData, validateWorkoutData } from './workouts';
import { createWorkoutBackup, mergeWorkoutBackup, parseWorkoutBackup } from './workoutBackup';

function workout(id: string, finishedAt: number | null = 20): Workout {
  return { id, name: 'Upper 💪', unit: 'kg', startedAt: 10, finishedAt,
    exercises: [{ id: 'exercise', name: 'Bench press', targetSets: 3, targetReps: 8,
      sets: [{ id: 'set', reps: 8, weight: 22.125 }] }] };
}
function routine(id: string): WorkoutRoutine {
  return { id, name: 'Upper', unit: 'lb', exercises: [{ id: 'entry', name: 'Row', targetReps: 12 }] };
}
function library(overrides: Partial<WorkoutData> = {}): WorkoutData {
  return { ...emptyWorkoutData(), ...overrides };
}
function backup(data: WorkoutData) { return parseWorkoutBackup(createWorkoutBackup(data, 1000)); }

it('round-trips history, active workout, routines, targets, units and exact values', () => {
  const data = library({ revision: 99, active: workout('active', null), history: [workout('done')], routines: [routine('r')] });
  const text = createWorkoutBackup(data, 1000);
  expect(JSON.parse(text)).toMatchObject({ format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 1000 });
  expect(parseWorkoutBackup(text).data).toEqual(data);
  expect(createWorkoutBackup(data, 1000)).toBe(text);
});
it('supports empty libraries and strict legacy v1 data without adding defaults', () => {
  expect(backup(library()).data).toEqual(library());
  const legacy = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 0,
    data: { version: 1, revision: 7, active: null, history: [] } };
  expect(parseWorkoutBackup(JSON.stringify(legacy)).data).toEqual(library({ revision: 7 }));
});
it.each(['', '{', 'null', '[]', '{"format":"other"}'])('rejects malformed backup text %s', text => {
  expect(() => parseWorkoutBackup(text)).toThrow();
});
it('rejects unsupported envelopes and unknown or media-bearing fields', () => {
  const good = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 1000, data: library() };
  for (const bad of [
    { ...good, format: 'other' }, { ...good, version: 2 }, { ...good, exportedAt: -1 },
    { ...good, exportedAt: 8.64e15 + 1 }, { ...good, video: 'blob:private' },
    { ...good, data: { ...library(), pose: [] } },
    { ...good, data: { ...library(), history: [{ ...workout('w'), video: 'secret' }] } },
  ]) expect(() => parseWorkoutBackup(JSON.stringify(bad))).toThrow();
  expect(() => createWorkoutBackup(library(), NaN)).toThrow();
});
it('rejects excessive file text and invalid library data before merge', () => {
  expect(() => parseWorkoutBackup(' '.repeat(4 * 1024 * 1024 + 1))).toThrow(/4 MiB/);
  expect(() => parseWorkoutBackup('界'.repeat(1_400_000))).toThrow(/4 MiB/);
  expect(() => createWorkoutBackup(library({ history: [workout('same'), workout('same')] }), 0)).toThrow();
});
it('merges additions with destination revision and preserves inputs', () => {
  const current = library({ revision: 4, history: [workout('local')], routines: [routine('local-r')] });
  const incoming = backup(library({ revision: 900, active: workout('active', null),
    history: [workout('remote')], routines: [routine('remote-r')] }));
  const snapshot = JSON.stringify([current, incoming]);
  const result = mergeWorkoutBackup(current, incoming);
  expect(result).toMatchObject({ addedWorkouts: 1, addedRoutines: 1, addedActive: true, duplicates: 0 });
  expect(result.data.revision).toBe(4);
  expect(result.data.history.map(w => w.id)).toEqual(['local', 'remote']);
  expect(result.data.active).toEqual(incoming.data.active);
  expect(result.data.routines).toHaveLength(2);
  expect(JSON.stringify([current, incoming])).toBe(snapshot);
});
it('skips identical records regardless of object property order and returns the current no-op object', () => {
  const current = library({ revision: 2, active: workout('active', null), history: [workout('done')], routines: [routine('r')] });
  const reordered = JSON.parse(JSON.stringify(current), (_key, value) =>
    value && !Array.isArray(value) && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse()) : value);
  const result = mergeWorkoutBackup(current, backup(reordered));
  expect(result).toMatchObject({ addedWorkouts: 0, addedRoutines: 0, addedActive: false, duplicates: 3 });
  expect(result.data).toBe(current);
});
it('rejects different values with the same workout or routine ID atomically', () => {
  const current = library({ history: [workout('done')], routines: [routine('r')] });
  const changedWorkout = { ...workout('done'), name: 'Changed' };
  expect(() => mergeWorkoutBackup(current, backup(library({ history: [workout('new'), changedWorkout] })))).toThrow(/conflict/i);
  expect(() => mergeWorkoutBackup(current, backup(library({ routines: [{ ...routine('r'), unit: 'kg' }] })))).toThrow(/conflict/i);
  expect(current.history).toHaveLength(1);
});
it('treats changed exercise order as a record conflict', () => {
  const source = { ...workout('done'), exercises: [workout('done').exercises[0],
    { id: 'row', name: 'Row', sets: [{ id: 'row-set', reps: 5, weight: 0 }] }] };
  expect(() => mergeWorkoutBackup(library({ history: [source] }), backup(library({
    history: [{ ...source, exercises: [...source.exercises].reverse() }],
  })))).toThrow(/conflict/i);
});
it('rejects different active workouts and active/finished ID collisions', () => {
  expect(() => mergeWorkoutBackup(library({ active: workout('a', null) }), backup(library({ active: workout('b', null) })))).toThrow(/active workout/i);
  expect(() => mergeWorkoutBackup(library({ active: workout('w', null) }), backup(library({ history: [workout('w')] })))).toThrow(/conflict/i);
  expect(() => mergeWorkoutBackup(library({ history: [workout('w')] }), backup(library({ active: workout('w', null) })))).toThrow(/conflict/i);
});
it('keeps an identical active workout object while adding history', () => {
  const current = library({ active: workout('a', null) });
  const result = mergeWorkoutBackup(current, backup(library({ active: workout('a', null), history: [workout('done')] })));
  expect(result.data.active).toBe(current.active);
  expect(result.duplicates).toBe(1);
});
it('rejects aggregate count and final-size overflow', () => {
  const full = library({ history: Array.from({ length: 1000 }, (_, index) => workout(`w-${index}`)) });
  expect(() => mergeWorkoutBackup(full, backup(library({ history: [workout('new')] })))).toThrow();
  const largeWorkout = (id: string): Workout => ({ ...workout(id), exercises: Array.from({ length: 100 }, (_, index) => ({
    id: `e-${index}`, name: 'E'.repeat(80), sets: Array.from({ length: 65 }, (_, set) => ({ id: `s-${index}-${set}`, reps: 1000, weight: 10000 })),
  })) });
  const large = library({ history: [largeWorkout('one'), largeWorkout('two')] });
  validateWorkoutData(large);
  const incoming = backup(library({ history: [largeWorkout('three'), largeWorkout('four')] }));
  expect(JSON.stringify({ ...large, history: [...large.history, ...incoming.data.history] }).length).toBeGreaterThan(1_000_000);
  expect(() => mergeWorkoutBackup(large, incoming)).toThrow();
});
it('rejects aggregate routine overflow and supports maximum numeric values', () => {
  const full = library({ routines: Array.from({ length: 100 }, (_, index) => routine(`r-${index}`)) });
  expect(() => mergeWorkoutBackup(full, backup(library({ routines: [routine('new')] })))).toThrow();
  const extreme = { ...workout('max', 8.64e15), exercises: [{ id: 'e', name: 'Bench',
    sets: [{ id: 's', reps: 1000, weight: 10000 }, { id: 'zero', reps: 1, weight: 0 }] }] };
  expect(backup(library({ history: [extreme] })).data.history[0]).toEqual(extreme);
});
