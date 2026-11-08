import { expect, it } from 'vitest';
import type { Workout } from '@/types/workout';
import { findPreviousExercise } from './previousWorkout';

const exercise = { id: 'bench', name: 'Bench press', sets: [{ id: 'set-1', reps: 8, weight: 60.5 }] };
const current: Workout = { id: 'active', name: 'Today', unit: 'kg', startedAt: 5_000, finishedAt: null, exercises: [] };
const older: Workout = { id: 'older', name: 'Older workout', unit: 'kg', startedAt: 1_000, finishedAt: 2_000, exercises: [exercise] };
const recent: Workout = { ...older, id: 'recent', name: 'Recent workout', finishedAt: 4_000 };

it('selects the latest completed matching workout regardless of history array order', () => {
  const history = [older, recent];
  expect(findPreviousExercise(history, current, 'Bench press')).toMatchObject({ workoutId: 'recent', finishedAt: 4_000 });
  expect(history).toEqual([older, recent]);
});

it('excludes unfinished workouts and workouts finished after the current workout began', () => {
  const unfinished = { ...older, id: 'unfinished', finishedAt: null };
  const future = { ...older, id: 'future', finishedAt: 6_000 };
  expect(findPreviousExercise([unfinished, future, recent], current, 'Bench press')?.workoutId).toBe('recent');
  expect(findPreviousExercise([unfinished, future], current, 'Bench press')).toBeNull();
});

it('matches exact names and units without treating a different exercise or load unit as equivalent', () => {
  const pounds: Workout = { ...recent, unit: 'lb' };
  expect(findPreviousExercise([pounds], current, 'Bench press')).toBeNull();
  expect(findPreviousExercise([recent], current, 'bench press')).toBeNull();
  expect(findPreviousExercise([recent], current, 'Incline bench press')).toBeNull();
  expect(findPreviousExercise([], current, 'Bench press')).toBeNull();
});

it('uses a stable workout ID tie-break when two completion times are identical', () => {
  const first = { ...recent, id: 'a' };
  const second = { ...recent, id: 'b' };
  expect(findPreviousExercise([first, second], current, 'Bench press')?.workoutId).toBe('a');
  expect(findPreviousExercise([second, first], current, 'Bench press')?.workoutId).toBe('a');
});

it('skips empty exercises and retains the first logged block of an exactly repeated name', () => {
  const empty = { ...recent, exercises: [{ ...exercise, sets: [] }] };
  expect(findPreviousExercise([empty, older], current, 'Bench press')?.workoutId).toBe('older');
  const repeated = { ...recent, exercises: [exercise, { ...exercise, id: 'second-block', sets: [{ id: 'set-2', reps: 3, weight: 80 }] }] };
  expect(findPreviousExercise([repeated], current, 'Bench press')?.sets).toEqual([{ id: 'set-1', reps: 8, weight: 60.5 }]);
});

it('preserves zero loads and decimal precision without copying or modifying saved sets', () => {
  const source = { ...recent, exercises: [{ ...exercise, sets: [{ id: 'zero', reps: 5, weight: 0 }, { id: 'decimal', reps: 7, weight: 62.125 }] }] };
  const previous = findPreviousExercise([source], current, 'Bench press');
  expect(previous?.sets).toBe(source.exercises[0].sets);
  expect(previous?.sets).toEqual([{ id: 'zero', reps: 5, weight: 0 }, { id: 'decimal', reps: 7, weight: 62.125 }]);
});

it('keeps bodyweight and loaded entries of one name apart so previous values never mix', () => {
  const loaded = { ...recent, id: 'loaded', finishedAt: 4_500, exercises: [{ ...exercise, id: 'loaded-e', sets: [{ id: 'l', reps: 5, weight: 40 }] }] };
  const assisted = { ...older, id: 'assisted', exercises: [{ ...exercise, id: 'bw-e', bodyweight: true as const, sets: [{ id: 'a', reps: 8, weight: -20 }] }] };
  expect(findPreviousExercise([loaded, assisted], current, 'Bench press')?.workoutId).toBe('loaded');
  expect(findPreviousExercise([loaded, assisted], current, 'Bench press', 'regular', true)?.sets).toEqual([{ id: 'a', reps: 8, weight: -20 }]);
  expect(findPreviousExercise([loaded], current, 'Bench press', 'regular', true)).toBeNull();
  expect(findPreviousExercise([assisted], current, 'Bench press')).toBeNull();
});
