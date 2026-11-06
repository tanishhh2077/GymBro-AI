import { expect, it } from 'vitest';
import type { Workout } from '@/types/workout';
import { buildExerciseHistory } from './exerciseHistory';

const exercise = { id: 'bench', name: 'Bench press', sets: [{ id: 'set-1', reps: 8, weight: 60.125 }] };
const older: Workout = { id: 'older', name: 'Older workout', unit: 'kg', startedAt: 1_000, finishedAt: 2_000, exercises: [exercise] };
const recent: Workout = { ...older, id: 'recent', name: 'Recent workout', finishedAt: 4_000 };

it('orders completed matching workouts newest first without changing source order', () => {
  const history = [older, recent];
  expect(buildExerciseHistory(history, 5_000, 'Bench press', 'kg').map(entry => entry.workoutId)).toEqual(['recent', 'older']);
  expect(history).toEqual([older, recent]);
});

it('matches the exact exercise name and unit', () => {
  const pounds = { ...recent, id: 'pounds', unit: 'lb' as const };
  const differentCase = { ...recent, id: 'case', exercises: [{ ...exercise, name: 'bench press' }] };
  const differentSpacing = { ...recent, id: 'spacing', exercises: [{ ...exercise, name: 'Bench  press' }] };
  expect(buildExerciseHistory([pounds, differentCase, differentSpacing, older], 5_000, 'Bench press', 'kg')
    .map(entry => entry.workoutId)).toEqual(['older']);
});

it('includes the start-time boundary and excludes unfinished and later completed workouts', () => {
  const boundary = { ...recent, id: 'boundary', finishedAt: 5_000 };
  const later = { ...recent, id: 'later', finishedAt: 5_001 };
  const unfinished = { ...recent, id: 'unfinished', finishedAt: null };
  expect(buildExerciseHistory([unfinished, later, boundary], 5_000, 'Bench press', 'kg')
    .map(entry => entry.workoutId)).toEqual(['boundary']);
});

it('breaks equal finish times by ascending workout ID regardless of input order', () => {
  const a = { ...recent, id: 'a' };
  const b = { ...recent, id: 'b' };
  expect(buildExerciseHistory([b, a], 5_000, 'Bench press', 'kg').map(entry => entry.workoutId)).toEqual(['a', 'b']);
  expect(buildExerciseHistory([a, b], 5_000, 'Bench press', 'kg').map(entry => entry.workoutId)).toEqual(['a', 'b']);
});

it('retains all repeated exercise blocks, their order and kinds with exact actual values', () => {
  const second = { ...exercise, id: 'bench-2', sets: [{ id: 'zero', reps: 3, weight: 0, kind: 'warmup' as const }] };
  const source = { ...recent, exercises: [{ ...exercise, id: 'empty', sets: [], targetSets: 10, targetReps: 20 }, exercise, second] };
  const before = JSON.stringify(source);
  const result = buildExerciseHistory([source], 5_000, 'Bench press', 'kg');
  expect(result).toEqual([{ workoutId: 'recent', workoutName: 'Recent workout', finishedAt: 4_000, exercises: [exercise, second] }]);
  expect(result[0].exercises[0].sets).toBe(exercise.sets);
  expect(JSON.stringify(source)).toBe(before);
});

it('returns empty history for planned-only and empty exercise blocks', () => {
  const planned = { ...recent, exercises: [{ ...exercise, sets: [], targetSets: 3, targetReps: 8 }] };
  expect(buildExerciseHistory([planned], 5_000, 'Bench press', 'kg')).toEqual([]);
  expect(buildExerciseHistory([], 5_000, 'Bench press', 'kg')).toEqual([]);
});

it('reads a thousand workouts and reflects deletion on a fresh derivation', () => {
  const history = Array.from({ length: 1000 }, (_, index) => ({ ...older, id: `workout-${index}`, startedAt: 0, finishedAt: index + 1 }));
  const result = buildExerciseHistory(history, 5_000, 'Bench press', 'kg');
  expect(result).toHaveLength(1000);
  expect(result[0].workoutId).toBe('workout-999');
  expect(buildExerciseHistory(history.slice(0, -1), 5_000, 'Bench press', 'kg')[0].workoutId).toBe('workout-998');
});
