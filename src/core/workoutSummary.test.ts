import { expect, it } from 'vitest';
import { summarizeWorkout, workoutDuration } from './workoutSummary';
import type { Workout } from '@/types/workout';

const workout = (): Workout => ({ id: 'w', name: 'Upper', unit: 'kg', startedAt: 1000, finishedAt: 181000,
  exercises: [{ id: 'e', name: 'Bench press', sets: [
    { id: 'warm', reps: 10, weight: 20, kind: 'warmup' }, { id: 'work', reps: 8, weight: 60.5 },
  ] }] });
it('derives elapsed time, exercise and set counts and entered-load volume', () => {
  expect(summarizeWorkout(workout())).toEqual({ durationMs: 180000, exercises: 1, sets: 2,
    regular: 1, warmups: 1, volume: 684, bodyweightSets: 0, unit: 'kg' });
});
it('keeps zero loads and zero elapsed time as actual saved values', () => {
  const source = workout();
  const result = summarizeWorkout({ ...source, unit: 'lb', finishedAt: source.startedAt,
    exercises: [{ ...source.exercises[0], sets: [{ id: 's', reps: 10, weight: 0 }] }] });
  expect(result).toMatchObject({ durationMs: 0, volume: 0, unit: 'lb', regular: 1 });
});
it('rejects active, malformed and backwards-clock sources', () => {
  expect(() => summarizeWorkout({ ...workout(), finishedAt: null })).toThrow();
  expect(() => summarizeWorkout({ ...workout(), finishedAt: 999 })).toThrow();
  expect(() => summarizeWorkout({ ...workout(), video: 'private' } as never)).toThrow();
});
it.each([[0, '0s'], [59999, '59s'], [60000, '1m 0s'], [3661000, '1h 1m 1s']])('formats elapsed milliseconds %s', (value, label) => {
  expect(workoutDuration(value as number)).toBe(label);
});

it('leaves bodyweight exercises out of load volume and counts their sets separately', () => {
  const source = workout();
  const result = summarizeWorkout({ ...source, exercises: [...source.exercises,
    { id: 'p', name: 'Pull-up', bodyweight: true, sets: [{ id: 'assist', reps: 8, weight: -20 }, { id: 'only', reps: 6, weight: 0 },
      { id: 'added', reps: 5, weight: 10 }] }] });
  expect(result).toMatchObject({ sets: 5, regular: 4, warmups: 1, volume: 684, bodyweightSets: 3 });
  expect(summarizeWorkout(source).bodyweightSets).toBe(0);
});

it('summarizes warm-up-only workouts, counting all sets as warmups and zero regular while computing volume', () => {
  const warmupWorkout: Workout = {
    id: 'wu-only', name: 'Warmup day', unit: 'kg', startedAt: 1000, finishedAt: 61000,
    exercises: [{
      id: 'e1', name: 'Bench press', sets: [
        { id: 'w1', reps: 10, weight: 20, kind: 'warmup' },
        { id: 'w2', reps: 5, weight: 40, kind: 'warmup' },
      ],
    }],
  };
  const summary = summarizeWorkout(warmupWorkout);
  expect(summary).toEqual({
    durationMs: 60000,
    exercises: 1,
    sets: 2,
    regular: 0,
    warmups: 2,
    volume: 400,
    bodyweightSets: 0,
    unit: 'kg',
  });
});

it('computes zero volume for pure bodyweight workouts regardless of positive or negative loads', () => {
  const bodyweightWorkout: Workout = {
    id: 'bw-workout', name: 'Calisthenics', unit: 'kg', startedAt: 1000, finishedAt: 121000,
    exercises: [
      {
        id: 'pullup', name: 'Pull-up', bodyweight: true, sets: [
          { id: 's1', reps: 5, weight: -20, kind: 'warmup' },
          { id: 's2', reps: 8, weight: 0 },
          { id: 's3', reps: 5, weight: 15 },
        ],
      },
      {
        id: 'dip', name: 'Dip', bodyweight: true, sets: [
          { id: 's4', reps: 10, weight: 0 },
          { id: 's5', reps: 6, weight: 25 },
        ],
      },
    ],
  };
  const summary = summarizeWorkout(bodyweightWorkout);
  expect(summary).toEqual({
    durationMs: 120000,
    exercises: 2,
    sets: 5,
    regular: 4,
    warmups: 1,
    volume: 0,
    bodyweightSets: 5,
    unit: 'kg',
  });
});

it('rejects workouts with no exercises or exercises with no sets', () => {
  const noExercises: Workout = { id: 'w-empty', name: 'Empty', unit: 'kg', startedAt: 1000, finishedAt: 2000, exercises: [] };
  expect(() => summarizeWorkout(noExercises)).toThrow();

  const emptySets: Workout = {
    id: 'w-nosets', name: 'No sets', unit: 'kg', startedAt: 1000, finishedAt: 2000,
    exercises: [{ id: 'e1', name: 'Bench press', sets: [] }],
  };
  expect(() => summarizeWorkout(emptySets)).toThrow();
});

it('accumulates volume accurately with equal weights across multiple sets and exercises', () => {
  const equalWeightsWorkout: Workout = {
    id: 'eq-w', name: '5x5 Session', unit: 'kg', startedAt: 1000, finishedAt: 301000,
    exercises: [
      {
        id: 'e1', name: 'Bench press', sets: [
          { id: 's1', reps: 5, weight: 100 },
          { id: 's2', reps: 5, weight: 100 },
          { id: 's3', reps: 5, weight: 100 },
        ],
      },
      {
        id: 'e2', name: 'Squat', sets: [
          { id: 's4', reps: 5, weight: 100 },
          { id: 's5', reps: 5, weight: 100 },
        ],
      },
    ],
  };
  const summary = summarizeWorkout(equalWeightsWorkout);
  expect(summary.sets).toBe(5);
  expect(summary.volume).toBe(2500);
});

it('handles boundary loads, maximum reps, and decimal weights accurately', () => {
  const extremeWorkout: Workout = {
    id: 'w-ext', name: 'Extreme', unit: 'lb', startedAt: 1000, finishedAt: 61000,
    exercises: [
      {
        id: 'heavy', name: 'Deadlift', sets: [
          { id: 'max-set', reps: 1000, weight: 10000 },
        ],
      },
      {
        id: 'micro', name: 'Curls', sets: [
          { id: 'micro-1', reps: 10, weight: 2.5 },
          { id: 'micro-2', reps: 8, weight: 1.25 },
        ],
      },
    ],
  };
  const summary = summarizeWorkout(extremeWorkout);
  expect(summary.unit).toBe('lb');
  expect(summary.volume).toBe(10000035);
  expect(summary.exercises).toBe(2);
  expect(summary.sets).toBe(3);
});

it('rejects explicit bodyweight: false since the schema requires true or omitted', () => {
  const loadedWithExplicitFalse: Workout = {
    id: 'w-false', name: 'Loaded', unit: 'kg', startedAt: 1000, finishedAt: 61000,
    exercises: [{
      id: 'e1', name: 'Bench press', bodyweight: false as unknown as true, sets: [
        { id: 's1', reps: 5, weight: 80 },
      ],
    }],
  };
  expect(() => summarizeWorkout(loadedWithExplicitFalse)).toThrow();
});

it.each([
  [1, '0s'],
  [999, '0s'],
  [1000, '1s'],
  [120000, '2m 0s'],
  [3600000, '1h 0m 0s'],
  [7200000, '2h 0m 0s'],
  [86400000, '24h 0m 0s'],
  [360930000, '100h 15m 30s'],
])('formats edge duration milliseconds %s to %s', (value, label) => {
  expect(workoutDuration(value as number)).toBe(label);
});
