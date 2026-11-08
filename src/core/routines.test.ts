import { expect, it } from 'vitest';
import { emptyWorkoutData, validateWorkoutData } from './workouts';

const routine = () => ({ id: 'r-1', name: 'Upper day', unit: 'kg', exercises: [
  { id: 're-1', name: 'Bench press', targetSets: 3, targetReps: 8 },
  { id: 're-2', name: 'Row' },
] });
const document = () => ({ ...emptyWorkoutData(), version: 2, routines: [routine()] });
it('accepts ordered routines with independent optional targets and explicit units', () => {
  expect(validateWorkoutData(document())).toEqual({ ...document(), version: 6 });
  const value = document();
  expect(validateWorkoutData({ ...value, routines: [{ ...routine(), unit: 'lb', exercises: [
    { id: 'e1', name: 'Bench', targetSets: 1 }, { id: 'e2', name: 'Row', targetReps: 1000 },
  ] }] })).toBeTruthy();
});
it('normalizes strict legacy data without mutating it or adding size overhead', () => {
  const legacy = { version: 1, revision: 7, active: null, history: [] };
  const snapshot = JSON.stringify(legacy);
  expect(validateWorkoutData(legacy)).toEqual({ ...legacy, version: 6 });
  expect(JSON.stringify(validateWorkoutData(legacy)).length).toBe(snapshot.length);
  expect(JSON.stringify(legacy)).toBe(snapshot);
  expect(Object.prototype.hasOwnProperty.call(validateWorkoutData(legacy), 'routines')).toBe(false);
});
it('accepts target snapshots separately from actual sets in active and finished workouts', () => {
  const exercise = { id: 'e1', name: 'Bench', targetSets: 3, targetReps: 8, sets: [] as {id: string; reps: number; weight: number}[] };
  const active = { id: 'w1', name: 'Day', unit: 'kg', startedAt: 1, finishedAt: null, exercises: [exercise] };
  expect(validateWorkoutData({ ...document(), active }).active?.exercises[0].sets).toEqual([]);
  expect(() => validateWorkoutData({ ...document(), history: [{ ...active, finishedAt: 2 }] })).toThrow();
  exercise.sets.push({ id: 's1', reps: 5, weight: 20 });
  expect(validateWorkoutData({ ...document(), history: [{ ...active, finishedAt: 2 }] }).history[0].exercises[0].sets).toHaveLength(1);
});
it.each([0, -1, 1.5, 101, NaN, null, undefined, '3'])('rejects a present invalid set target %s', targetSets => {
  expect(() => validateWorkoutData({ ...document(), routines: [{ ...routine(), exercises: [{ id: 'e1', name: 'Bench', targetSets }] }] })).toThrow();
});
it.each([0, -1, 1.5, 1001, Infinity, null, undefined, '8'])('rejects a present invalid rep target %s', targetReps => {
  expect(() => validateWorkoutData({ ...document(), routines: [{ ...routine(), exercises: [{ id: 'e1', name: 'Bench', targetReps }] }] })).toThrow();
});
it('rejects unknown keys, duplicate IDs, invalid units and empty routines without dropping them', () => {
  const value = document();
  for (const bad of [
    { ...value, routines: [{ ...routine(), video: 'blob:private' }] },
    { ...value, routines: [routine(), routine()] },
    { ...value, routines: [{ ...routine(), exercises: [routine().exercises[0], routine().exercises[0]] }] },
    { ...value, routines: [{ ...routine(), unit: 'stones' }] },
    { ...value, routines: [{ ...routine(), exercises: [] }] },
    { ...value, routines: undefined },
    { ...value, routines: [{ ...routine(), exercises: [{ ...routine().exercises[0], completed: true }] }] },
    { ...value, version: 7 },
    { ...value, version: 1 },
  ]) expect(() => validateWorkoutData(bad)).toThrow();
});
it('enforces routine and ordered exercise bounds without pruning', () => {
  expect(() => validateWorkoutData({ ...document(), routines: Array.from({ length: 101 }, (_, i) => ({ ...routine(), id: `r-${i}` })) })).toThrow();
  expect(() => validateWorkoutData({ ...document(), routines: [{ ...routine(), exercises: Array.from({ length: 101 }, (_, i) => ({ id: `e-${i}`, name: 'Bench' })) }] })).toThrow();
});
