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

it('skips warmup-only workouts when querying regular sets and finds them when querying warmup sets', () => {
  const warmupSet = { id: 'w-1', reps: 10, weight: 20, kind: 'warmup' as const };
  const warmupOnly: Workout = { ...older, id: 'warmup-w', finishedAt: 4_500,
    exercises: [{ id: 'b-warm', name: 'Bench press', sets: [warmupSet] }] };
  expect(findPreviousExercise([older, warmupOnly], current, 'Bench press')?.workoutId).toBe('older');
  expect(findPreviousExercise([older, warmupOnly], current, 'Bench press', 'warmup')?.workoutId).toBe('warmup-w');
  expect(findPreviousExercise([warmupOnly], current, 'Bench press')).toBeNull();
});

it('filters mixed sets to return only the requested kind and preserves array identity when all sets match', () => {
  const mixedSets = [
    { id: 'w1', reps: 10, weight: 20, kind: 'warmup' as const },
    { id: 'r1', reps: 8, weight: 60 },
    { id: 'r2', reps: 8, weight: 60 },
  ];
  const mixedWorkout: Workout = { ...older, id: 'mixed', finishedAt: 3_000,
    exercises: [{ id: 'bench-mixed', name: 'Bench press', sets: mixedSets }] };

  const regular = findPreviousExercise([mixedWorkout], current, 'Bench press', 'regular');
  expect(regular?.sets).toEqual([mixedSets[1], mixedSets[2]]);
  expect(regular?.sets).not.toBe(mixedSets);

  const warmups = findPreviousExercise([mixedWorkout], current, 'Bench press', 'warmup');
  expect(warmups?.sets).toEqual([mixedSets[0]]);
  expect(warmups?.sets).not.toBe(mixedSets);

  const pureWarmupSets = [{ id: 'pw1', reps: 12, weight: 20, kind: 'warmup' as const }];
  const pureWarmupWorkout: Workout = { ...older, id: 'pure-w', finishedAt: 3_500,
    exercises: [{ id: 'bench-pw', name: 'Bench press', sets: pureWarmupSets }] };
  const pureResult = findPreviousExercise([pureWarmupWorkout], current, 'Bench press', 'warmup');
  expect(pureResult?.sets).toBe(pureWarmupSets);
});

it('returns null when history has no matching workouts, exercises, or valid timestamps', () => {
  expect(findPreviousExercise([], current, 'Bench press', 'warmup', true)).toBeNull();
  const noExercises: Workout = { ...older, id: 'empty-ex', exercises: [] };
  expect(findPreviousExercise([noExercises], current, 'Bench press')).toBeNull();
  const differentName: Workout = { ...older, id: 'diff-name', exercises: [{ id: 'sq', name: 'Squat', sets: [{ id: 's1', reps: 5, weight: 100 }] }] };
  expect(findPreviousExercise([differentName], current, 'Bench press')).toBeNull();
  const allUnfinished: Workout = { ...older, id: 'unfin', finishedAt: null };
  expect(findPreviousExercise([allUnfinished], current, 'Bench press')).toBeNull();
  const allFuture: Workout = { ...older, id: 'fut', finishedAt: current.startedAt + 1 };
  expect(findPreviousExercise([allFuture], current, 'Bench press')).toBeNull();
});

it('matches a workout completed at the exact millisecond the current workout started', () => {
  const boundaryWorkout: Workout = { ...older, id: 'boundary', finishedAt: current.startedAt };
  expect(findPreviousExercise([boundaryWorkout], current, 'Bench press')?.workoutId).toBe('boundary');

  const afterBoundary: Workout = { ...older, id: 'after', finishedAt: current.startedAt + 1 };
  expect(findPreviousExercise([afterBoundary], current, 'Bench press')).toBeNull();
});

it('strictly isolates history by unit when workouts have mixed units across time', () => {
  const lbWorkout: Workout = { ...recent, id: 'lb-recent', unit: 'lb', finishedAt: 4_500 };
  const kgWorkout: Workout = { ...older, id: 'kg-older', unit: 'kg', finishedAt: 2_000 };
  expect(findPreviousExercise([lbWorkout, kgWorkout], current, 'Bench press')?.workoutId).toBe('kg-older');
  const currentLb: Workout = { ...current, unit: 'lb' };
  expect(findPreviousExercise([lbWorkout, kgWorkout], currentLb, 'Bench press')?.workoutId).toBe('lb-recent');
  expect(findPreviousExercise([kgWorkout], currentLb, 'Bench press')).toBeNull();
});

it('selects strictly by recency regardless of weights and breaks equal timestamp ties by workoutId', () => {
  const lighterRecent: Workout = { ...recent, id: 'recent-light', finishedAt: 4_000,
    exercises: [{ id: 'b1', name: 'Bench press', sets: [{ id: 's1', reps: 5, weight: 50 }] }] };
  const heavierOlder: Workout = { ...older, id: 'older-heavy', finishedAt: 2_000,
    exercises: [{ id: 'b2', name: 'Bench press', sets: [{ id: 's2', reps: 5, weight: 120 }] }] };
  expect(findPreviousExercise([lighterRecent, heavierOlder], current, 'Bench press')?.sets[0].weight).toBe(50);

  const equalRecent: Workout = { ...recent, id: 'rec-eq', finishedAt: 4_000,
    exercises: [{ id: 'b3', name: 'Bench press', sets: [{ id: 's3', reps: 5, weight: 100 }] }] };
  const equalOlder: Workout = { ...older, id: 'old-eq', finishedAt: 2_000,
    exercises: [{ id: 'b4', name: 'Bench press', sets: [{ id: 's4', reps: 5, weight: 100 }] }] };
  expect(findPreviousExercise([equalOlder, equalRecent], current, 'Bench press')?.workoutId).toBe('rec-eq');

  const tieA: Workout = { ...recent, id: 'tie-a', finishedAt: 3_000,
    exercises: [{ id: 'b5', name: 'Bench press', sets: [{ id: 's5', reps: 5, weight: 100 }] }] };
  const tieB: Workout = { ...recent, id: 'tie-b', finishedAt: 3_000,
    exercises: [{ id: 'b6', name: 'Bench press', sets: [{ id: 's6', reps: 5, weight: 100 }] }] };
  expect(findPreviousExercise([tieB, tieA], current, 'Bench press')?.workoutId).toBe('tie-a');

  const equalSetsWorkout: Workout = { ...recent, id: 'eq-sets', finishedAt: 3_500,
    exercises: [{ id: 'b7', name: 'Bench press', sets: [
      { id: 'set-a', reps: 5, weight: 100 },
      { id: 'set-b', reps: 5, weight: 100 },
      { id: 'set-c', reps: 5, weight: 100 },
    ] }] };
  expect(findPreviousExercise([equalSetsWorkout], current, 'Bench press')?.sets).toEqual([
    { id: 'set-a', reps: 5, weight: 100 },
    { id: 'set-b', reps: 5, weight: 100 },
    { id: 'set-c', reps: 5, weight: 100 },
  ]);
});

it('accurately handles extreme values, decimal loads, and assistance weights', () => {
  const maxValuesWorkout: Workout = { ...recent, id: 'max-val', finishedAt: 3_000,
    exercises: [{ id: 'b-max', name: 'Bench press', sets: [{ id: 's-max', reps: 1000, weight: 10000 }] }] };
  expect(findPreviousExercise([maxValuesWorkout], current, 'Bench press')?.sets).toEqual([
    { id: 's-max', reps: 1000, weight: 10000 },
  ]);

  const microplatesWorkout: Workout = { ...recent, id: 'micro', finishedAt: 3_000,
    exercises: [{ id: 'b-micro', name: 'Bench press', sets: [{ id: 's-micro', reps: 1, weight: 0.125 }] }] };
  expect(findPreviousExercise([microplatesWorkout], current, 'Bench press')?.sets).toEqual([
    { id: 's-micro', reps: 1, weight: 0.125 },
  ]);

  const assistanceWorkout: Workout = { ...recent, id: 'assist', finishedAt: 3_000,
    exercises: [{ id: 'bw-assist', name: 'Pull-up', bodyweight: true, sets: [{ id: 's-as', reps: 5, weight: -1000 }] }] };
  expect(findPreviousExercise([assistanceWorkout], current, 'Pull-up', 'regular', true)?.sets).toEqual([
    { id: 's-as', reps: 5, weight: -1000 },
  ]);
});

it('isolates bodyweight warmups from loaded warmups and matches explicit bodyweight false', () => {
  const explicitFalse: Workout = { ...recent, id: 'exp-false', finishedAt: 3_000,
    exercises: [{ id: 'b-false', name: 'Dips', bodyweight: false as unknown as true, sets: [{ id: 'sf', reps: 8, weight: 20 }] }] };
  expect(findPreviousExercise([explicitFalse], current, 'Dips')?.workoutId).toBe('exp-false');
  expect(findPreviousExercise([explicitFalse], current, 'Dips', 'regular', true)).toBeNull();

  const bwWarmup: Workout = { ...recent, id: 'bw-warm', finishedAt: 3_500,
    exercises: [{ id: 'bw-w', name: 'Dips', bodyweight: true as const, sets: [{ id: 's-bw-w', reps: 10, weight: 0, kind: 'warmup' }] }] };
  const loadedWarmup: Workout = { ...recent, id: 'loaded-warm', finishedAt: 3_200,
    exercises: [{ id: 'ld-w', name: 'Dips', sets: [{ id: 's-ld-w', reps: 10, weight: 10, kind: 'warmup' }] }] };

  expect(findPreviousExercise([bwWarmup, loadedWarmup], current, 'Dips', 'warmup', true)?.workoutId).toBe('bw-warm');
  expect(findPreviousExercise([bwWarmup, loadedWarmup], current, 'Dips', 'warmup', false)?.workoutId).toBe('loaded-warm');
});

it('skips a warmup-only block to find a subsequent regular block of the same name within one workout', () => {
  const multiBlock: Workout = { ...recent, id: 'multi-block', finishedAt: 3_000,
    exercises: [
      { id: 'block-1', name: 'Bench press', sets: [{ id: 'w1', reps: 10, weight: 20, kind: 'warmup' }] },
      { id: 'block-2', name: 'Bench press', sets: [{ id: 'r1', reps: 5, weight: 80 }] },
    ] };
  expect(findPreviousExercise([multiBlock], current, 'Bench press', 'regular')?.sets).toEqual([
    { id: 'r1', reps: 5, weight: 80 },
  ]);
  expect(findPreviousExercise([multiBlock], current, 'Bench press', 'warmup')?.sets).toEqual([
    { id: 'w1', reps: 10, weight: 20, kind: 'warmup' },
  ]);
});
