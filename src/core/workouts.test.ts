import { describe, expect, it } from 'vitest';
import { emptyWorkoutData, validateWorkoutData } from './workouts';

function workout(finishedAt: number | null = null) {
  return { id: 'workout-1', name: 'Upper body', unit: 'kg', startedAt: 1000, finishedAt,
    exercises: [{ id: 'exercise-1', name: 'Bench press', sets: [{ id: 'set-1', reps: 8, weight: 60.5 }] }] };
}
const document = () => ({ version: 2, revision: 0, active: workout(), history: [] });

describe('workout storage boundary', () => {
  it('starts empty without fabricating workouts', () => {
    expect(emptyWorkoutData()).toEqual({ version: 3, revision: 0, active: null, history: [] });
    expect(validateWorkoutData(emptyWorkoutData())).toEqual(emptyWorkoutData());
  });
  it('accepts fractional loads, zero added load and explicit units', () => {
    const value = document();
    value.active.exercises[0].sets[0].weight = 0;
    expect(validateWorkoutData(value)).toEqual({ ...value, version: 3 });
    expect(validateWorkoutData({ ...value, active: { ...value.active, unit: 'lb' } })).toBeTruthy();
  });
  it('permits an empty active draft but requires sets in completed history', () => {
    expect(validateWorkoutData({ ...document(), active: { ...workout(), exercises: [] } })).toBeTruthy();
    expect(() => validateWorkoutData({ version: 1, revision: 0, active: null,
      history: [{ ...workout(2000), exercises: [] }] })).toThrow();
  });
  const invalid = [
    ['future schema', () => ({ ...document(), version: 4 })],
    ['negative revision', () => ({ ...document(), revision: -1 })],
    ['unknown media fields', () => ({ ...document(), video: 'blob:private' })],
    ['missing history', () => ({ version: 1, revision: 0, active: null })],
    ['unsupported units', () => ({ ...document(), active: { ...workout(), unit: 'stones' } })],
    ['empty name', () => ({ ...document(), active: { ...workout(), name: '' } })],
    ['untrimmed name', () => ({ ...document(), active: { ...workout(), name: ' Upper ' } })],
    ['long name', () => ({ ...document(), active: { ...workout(), name: 'x'.repeat(81) } })],
    ['bad timestamp', () => ({ ...document(), active: { ...workout(), startedAt: NaN } })],
    ['invalid date range', () => ({ ...document(), active: { ...workout(), startedAt: 9e15 } })],
    ['finished active draft', () => ({ ...document(), active: workout(2000) })],
    ['unfinished history', () => ({ version: 1, revision: 0, active: null, history: [workout()] })],
    ['backward clock', () => ({ version: 1, revision: 0, active: null, history: [workout(999)] })],
    ['duplicate workout', () => ({ version: 1, revision: 0, active: null, history: [workout(2000), workout(2000)] })],
  ] as const;
  it.each(invalid)('rejects %s', (_name, value) => {
    expect(() => validateWorkoutData(value())).toThrow();
  });
  it.each([0, -1, 1.5, 1001, NaN, Infinity])('rejects invalid reps %s', (reps) => {
    const value = document(); value.active.exercises[0].sets[0].reps = reps;
    expect(() => validateWorkoutData(value)).toThrow();
  });
  it.each([-1, 10001, NaN, Infinity])('rejects invalid weight %s', (weight) => {
    const value = document(); value.active.exercises[0].sets[0].weight = weight;
    expect(() => validateWorkoutData(value)).toThrow();
  });
  it('rejects duplicate entry and set IDs', () => {
    const value = document(); value.active.exercises.push(value.active.exercises[0]);
    expect(() => validateWorkoutData(value)).toThrow();
    const other = document(); other.active.exercises[0].sets.push(other.active.exercises[0].sets[0]);
    expect(() => validateWorkoutData(other)).toThrow();
  });
  it('bounds stored history/exercise/set counts without pruning', () => {
    expect(() => validateWorkoutData({ version: 1, revision: 0, active: null,
      history: Array.from({ length: 1001 }, (_, i) => ({ ...workout(2000), id: `w-${i}` })) })).toThrow();
    const value = document();
    value.active.exercises = Array.from({ length: 101 }, (_, i) => ({ id: `e-${i}`, name: 'Bench', sets: [] }));
    expect(() => validateWorkoutData(value)).toThrow();
    const other = document();
    other.active.exercises[0].sets = Array.from({ length: 101 }, (_, i) => ({ id: `s-${i}`, reps: 1, weight: 1 }));
    expect(() => validateWorkoutData(other)).toThrow();
  });
});
