import { describe, expect, it } from 'vitest';
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

describe('buildExerciseHistory edge cases', () => {
  it('breaks ties among multiple workouts with identical finish times by ascending workoutId', () => {
    const time = 3000;
    const history = [
      { ...older, id: 'w-charlie', finishedAt: time },
      { ...older, id: 'w-alpha', finishedAt: time },
      { ...older, id: 'w-bravo', finishedAt: time },
    ];
    const result = buildExerciseHistory(history, 5000, 'Bench press', 'kg');
    expect(result.map(e => e.workoutId)).toEqual(['w-alpha', 'w-bravo', 'w-charlie']);
  });

  it('filters out exercises with empty sets even if targets are specified', () => {
    const workoutWithTargetOnly: Workout = {
      ...older,
      id: 'target-only',
      exercises: [
        {
          id: 'target-ex',
          name: 'Bench press',
          targetSets: 4,
          targetReps: 10,
          targetWeight: 80,
          sets: [],
        },
      ],
    };
    expect(buildExerciseHistory([workoutWithTargetOnly], 5000, 'Bench press', 'kg')).toEqual([]);
  });

  it('filters out empty exercise blocks but retains non-empty blocks within the same workout', () => {
    const workoutWithMixed: Workout = {
      ...older,
      id: 'mixed-ex',
      exercises: [
        { id: 'empty-block', name: 'Bench press', sets: [] },
        { id: 'valid-block', name: 'Bench press', sets: [{ id: 's1', reps: 5, weight: 100 }] },
      ],
    };
    const result = buildExerciseHistory([workoutWithMixed], 5000, 'Bench press', 'kg');
    expect(result).toHaveLength(1);
    expect(result[0].exercises).toHaveLength(1);
    expect(result[0].exercises[0].id).toBe('valid-block');
  });

  it('retains warm-up-only exercise blocks and preserves set kinds and RPE', () => {
    const warmupExercise = {
      id: 'bench-warmup',
      name: 'Bench press',
      sets: [
        { id: 's-warm-1', reps: 10, weight: 40, kind: 'warmup' as const },
        { id: 's-warm-2', reps: 5, weight: 60, kind: 'warmup' as const, rpe: 6 },
      ],
    };
    const workoutWithWarmups: Workout = {
      ...older,
      id: 'warmup-workout',
      exercises: [warmupExercise],
    };
    const result = buildExerciseHistory([workoutWithWarmups], 5000, 'Bench press', 'kg');
    expect(result).toHaveLength(1);
    expect(result[0].exercises[0].sets).toEqual(warmupExercise.sets);
  });

  it('preserves superset identifiers and extracts only matching exercise from superset blocks', () => {
    const supersetId = 'ss-chest-back';
    const workoutWithSuperset: Workout = {
      ...older,
      id: 'superset-workout',
      exercises: [
        {
          id: 'bench-in-ss',
          name: 'Bench press',
          superset: supersetId,
          sets: [{ id: 's1', reps: 8, weight: 90 }],
        },
        {
          id: 'row-in-ss',
          name: 'Barbell row',
          superset: supersetId,
          sets: [{ id: 's2', reps: 8, weight: 80 }],
        },
      ],
    };

    // Querying Bench press returns only bench-in-ss with superset retained
    const benchResult = buildExerciseHistory([workoutWithSuperset], 5000, 'Bench press', 'kg');
    expect(benchResult).toHaveLength(1);
    expect(benchResult[0].exercises).toHaveLength(1);
    expect(benchResult[0].exercises[0].id).toBe('bench-in-ss');
    expect(benchResult[0].exercises[0].superset).toBe(supersetId);

    // Querying Barbell row returns only row-in-ss with superset retained
    const rowResult = buildExerciseHistory([workoutWithSuperset], 5000, 'Barbell row', 'kg');
    expect(rowResult).toHaveLength(1);
    expect(rowResult[0].exercises).toHaveLength(1);
    expect(rowResult[0].exercises[0].id).toBe('row-in-ss');
    expect(rowResult[0].exercises[0].superset).toBe(supersetId);
  });

  it('separates bodyweight and loaded exercise history with identical names', () => {
    const pullupLoaded = {
      id: 'pu-loaded',
      name: 'Pull-up',
      sets: [{ id: 's1', reps: 5, weight: 20 }],
    };
    const pullupBw = {
      id: 'pu-bw',
      name: 'Pull-up',
      bodyweight: true as const,
      sets: [{ id: 's2', reps: 8, weight: 0 }],
    };
    const workout: Workout = {
      ...older,
      id: 'pu-workout',
      exercises: [pullupLoaded, pullupBw],
    };

    // Loaded query (bodyweight = false or omitted)
    const loadedResult = buildExerciseHistory([workout], 5000, 'Pull-up', 'kg');
    expect(loadedResult).toHaveLength(1);
    expect(loadedResult[0].exercises.map(e => e.id)).toEqual(['pu-loaded']);

    // Bodyweight query (bodyweight = true)
    const bwResult = buildExerciseHistory([workout], 5000, 'Pull-up', 'kg', true);
    expect(bwResult).toHaveLength(1);
    expect(bwResult[0].exercises.map(e => e.id)).toEqual(['pu-bw']);
  });
});

