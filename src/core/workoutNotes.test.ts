import { expect, it } from 'vitest';
import type { Workout, WorkoutData, WorkoutRoutine } from '@/types/workout';
import { emptyWorkoutData, validateWorkoutData } from './workouts';
import { createWorkoutBackup, mergeWorkoutBackup, parseWorkoutBackup } from './workoutBackup';
import { mergeWorkoutSync, sameSyncData, syncSnapshot } from './workoutSync';
import { buildWorkoutProgress } from './workoutProgress';

function workout(extra: Record<string, unknown> = {}, finishedAt: number | null = 20): Workout {
  return { id: 'w', name: 'Upper', unit: 'kg', startedAt: 10, finishedAt, ...extra,
    exercises: [{ id: 'e', name: 'Bench press', targetSets: 3, targetReps: 5, targetWeight: 102.5,
      sets: [{ id: 's', reps: 5, weight: 60 }] }] } as Workout;
}
function routine(): WorkoutRoutine {
  return { id: 'r', name: 'Upper', unit: 'lb', exercises: [{ id: 're', name: 'Row', targetWeight: 0 }] };
}
function library(overrides: Partial<WorkoutData> = {}): WorkoutData { return { ...emptyWorkoutData(), ...overrides }; }
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

it('starts at schema4 and accepts notes and planned target weights', () => {
  expect(emptyWorkoutData().version).toBe(5);
  const data = library({ active: workout({ note: 'Felt strong.\n\tPause reps next week.' }, null),
    history: [{ ...workout({ note: 'Done' }), id: 'done' }], routines: [routine()] });
  expect(validateWorkoutData(data)).toBe(data);
});
it.each([
  ['empty note', ''], ['untrimmed note', ' note'], ['trailing newline', 'note\n'], ['long note', 'x'.repeat(1001)],
  ['carriage return', 'a\rb'], ['NUL', 'a\u0000b'], ['escape', 'a\u001bb'], ['DEL', 'a\u007fb'], ['C1 control', 'a\u0085b'],
  ['number', 5], ['null', null],
])('rejects an invalid workout note: %s', (_label, note) => {
  expect(() => validateWorkoutData(library({ active: workout({ note }, null) }))).toThrow();
});
it('accepts a note of exactly 1000 characters', () => {
  expect(validateWorkoutData(library({ active: workout({ note: 'x'.repeat(1000) }, null) }))).toBeTruthy();
});
it.each([-1, 10000.5, NaN, Infinity, '5', null])('rejects invalid target weight %s on workouts and routines', targetWeight => {
  const value = clone(library({ active: workout({}, null) }));
  (value.active!.exercises[0] as unknown as Record<string, unknown>).targetWeight = targetWeight;
  expect(() => validateWorkoutData(value)).toThrow();
  expect(() => validateWorkoutData(library({ routines: [{ ...routine(), exercises: [{ id: 'e', name: 'Row', targetWeight } as never] }] })))
    .toThrow(/target weight from 0 to 10000/);
});
it('accepts the inclusive target weight bounds', () => {
  for (const targetWeight of [0, 10000, 22.125]) {
    expect(validateWorkoutData(library({ routines: [{ ...routine(), exercises: [{ id: 'e', name: 'Row', targetWeight }] }] }))).toBeTruthy();
  }
});
it.each([1, 2, 3])('rejects schema4 fields in schema%s and leaves future versions untouched', version => {
  expect(() => validateWorkoutData({ ...library({ active: workout({ note: 'n' }, null) }), version })).toThrow();
  const target = clone(library({ active: workout({}, null) }));
  expect(() => validateWorkoutData({ ...target, version })).toThrow();
  if (version > 1) expect(() => validateWorkoutData({ ...library({ routines: [routine()] }), version })).toThrow();
  const future = { ...library(), version: 6 };
  expect(() => validateWorkoutData(future)).toThrow();
  expect(future.version).toBe(6);
});
it('reads strict schema3 by changing only its version digit, including at the exact size cap', () => {
  const legacy = { version: 3, revision: 2, active: null, history: [] as unknown[] };
  const snapshot = JSON.stringify(legacy);
  expect(validateWorkoutData(legacy)).toEqual({ ...legacy, version: 5 });
  expect(JSON.stringify(legacy)).toBe(snapshot);
  const record = (index: number) => ({ id: `w-${index}`, name: 'W', unit: 'kg', startedAt: 1, finishedAt: 2,
    exercises: [{ id: `e-${index}`, name: 'E', sets: Array.from({ length: 100 }, (_, i) => ({ id: `s-${i}`, reps: 1, weight: 1, kind: 'warmup' })) }] });
  const full = { version: 3, revision: 9, active: null, history: [record(0)] };
  while (JSON.stringify(full).length < 1_000_000) full.history.push(record(full.history.length));
  while (JSON.stringify(full).length > 1_000_000) full.history[full.history.length - 1].exercises[0].sets.pop();
  const last = full.history[full.history.length - 1];
  last.name += 'x'.repeat(Math.min(79, 1_000_000 - JSON.stringify(full).length));
  last.exercises[0].name += 'x'.repeat(Math.min(79, 1_000_000 - JSON.stringify(full).length));
  expect(JSON.stringify(full).length).toBe(1_000_000);
  const normalized = validateWorkoutData(full);
  expect(normalized.version).toBe(5);
  expect(JSON.stringify(normalized).length).toBe(1_000_000);
  expect(full.version).toBe(3);
});
it('keeps target weights out of actual-set progress', () => {
  const group = buildWorkoutProgress([workout()])[0];
  expect(group.heaviestSet.weight).toBe(60);
});
it('round-trips notes and target weights through backup and treats note/target-only differences as conflicts', () => {
  const data = library({ history: [workout({ note: 'Original' })], routines: [routine()] });
  const backup = parseWorkoutBackup(createWorkoutBackup(data, 1));
  expect(backup.data).toEqual(data);
  expect(mergeWorkoutBackup(emptyWorkoutData(), backup).data).toEqual({ ...data, revision: 0 });
  expect(mergeWorkoutBackup(data, backup)).toMatchObject({ data, duplicates: 2, addedWorkouts: 0 });
  expect(() => mergeWorkoutBackup(library({ history: [workout({ note: 'Edited' })], routines: [routine()] }), backup)).toThrow(/conflict/i);
  expect(() => mergeWorkoutBackup(library({ history: [workout()], routines: [routine()] }), backup)).toThrow(/conflict/i);
  const changedTarget = clone(data); (changedTarget.history[0].exercises[0] as { targetWeight: number }).targetWeight = 100;
  expect(() => mergeWorkoutBackup(changedTarget, backup)).toThrow(/conflict/i);
  const changedRoutine = library({ history: data.history, routines: [{ ...routine(), exercises: [{ id: 're', name: 'Row', targetWeight: 5 }] }] });
  expect(() => mergeWorkoutBackup(changedRoutine, backup)).toThrow(/conflict/i);
});
it('still restores schema3 backups into a schema4 library', () => {
  const legacy = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 0, data: { version: 3, revision: 3, active: null,
    history: [{ id: 'old', name: 'Old', unit: 'lb', startedAt: 1, finishedAt: 2,
      exercises: [{ id: 'e', name: 'Squat', sets: [{ id: 's', reps: 5, weight: 225, kind: 'warmup' }] }] }] } };
  const result = mergeWorkoutBackup(library({ history: [workout({ note: 'Mine' })] }), parseWorkoutBackup(JSON.stringify(legacy)));
  expect(result.addedWorkouts).toBe(1);
  expect(result.data.version).toBe(5);
  expect(result.data.history.map(w => w.id)).toEqual(['w', 'old']);
});
it('round-trips notes and target weights through sync and exposes concurrent note edits', () => {
  const base = library({ history: [workout({ note: 'Base' })], routines: [routine()] });
  expect(syncSnapshot(base)).toEqual(base);
  expect(sameSyncData(base, library({ history: [workout()], routines: [routine()] }))).toBe(false);
  const device = library({ history: [workout({ note: 'Device' })], routines: [routine()] });
  const cloud = library({ history: [workout({ note: 'Cloud' })], routines: [routine()] });
  const result = mergeWorkoutSync(base, device, cloud);
  expect(result.conflicts).toMatchObject([{ key: 'workout/w' }]);
  expect(mergeWorkoutSync(base, device, cloud, { 'workout/w': 'cloud' }).data.history[0].note).toBe('Cloud');
  expect(mergeWorkoutSync(base, base, cloud).data.history[0].note).toBe('Cloud');
  const removed = mergeWorkoutSync(base, library({ history: [workout()], routines: [routine()] }), base);
  expect(removed.conflicts).toEqual([]);
  expect(Object.prototype.hasOwnProperty.call(removed.data.history[0], 'note')).toBe(false);
  const targetCloud = library({ history: base.history, routines: [{ ...routine(), exercises: [{ id: 're', name: 'Row', targetWeight: 50 }] }] });
  const targetDevice = library({ history: base.history, routines: [{ ...routine(), exercises: [{ id: 're', name: 'Row', targetWeight: 45 }] }] });
  expect(mergeWorkoutSync(base, targetDevice, targetCloud).conflicts).toMatchObject([{ key: 'routine/r' }]);
});
it('merges a schema3 cloud library with a schema4 device library', () => {
  const cloud = { version: 3, revision: 0, active: null, history: [{ ...workout(), id: 'cloud',
    exercises: [{ id: 'e', name: 'Bench press', sets: [{ id: 's', reps: 5, weight: 60 }] }] }] } as unknown as WorkoutData;
  const result = mergeWorkoutSync(library(), library({ history: [workout({ note: 'Mine' })] }), cloud);
  expect(result.data.version).toBe(5);
  expect(result.data.history.map(w => w.id).sort()).toEqual(['cloud', 'w']);
});
