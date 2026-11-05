import { expect, it } from 'vitest';
import type { WeightUnit, Workout, WorkoutSet } from '@/types/workout';
import { buildWorkoutProgress } from './workoutProgress';

function loggedSet(id: string, reps: number, weight: number): WorkoutSet {
  return { id, reps, weight };
}

function workout(id: string, finishedAt: number | null, sets: readonly WorkoutSet[],
  options: { unit?: WeightUnit; exerciseName?: string } = {}): Workout {
  return {
    id,
    name: `Workout ${id}`,
    unit: options.unit ?? 'kg',
    startedAt: Math.max(0, (finishedAt ?? 1) - 1),
    finishedAt,
    exercises: [{ id: `${id}-exercise`, name: options.exerciseName ?? 'Bench press', sets }],
  };
}

it('produces empty progress until a completed workout has actual sets', () => {
  expect(buildWorkoutProgress([])).toEqual([]);
  expect(buildWorkoutProgress([workout('active', null, [loggedSet('s', 5, 50)])])).toEqual([]);
  const planned = workout('planned', 10, []);
  expect(buildWorkoutProgress([{ ...planned, exercises: [{ ...planned.exercises[0], targetSets: 3, targetReps: 8 }] }])).toEqual([]);
});

it('keeps exact names and units in separate groups', () => {
  const groups = buildWorkoutProgress([
    workout('kg', 10, [loggedSet('s', 5, 50)]),
    workout('lb', 20, [loggedSet('s', 5, 100)], { unit: 'lb' }),
    workout('case', 30, [loggedSet('s', 8, 20)], { exerciseName: 'bench press' }),
    workout('spacing', 40, [loggedSet('s', 8, 25)], { exerciseName: 'Bench  press' }),
  ]);
  expect(groups).toHaveLength(4);
  expect(groups.find(g => g.name === 'Bench press' && g.unit === 'kg')?.heaviestSet.weight).toBe(50);
  expect(groups.find(g => g.name === 'Bench press' && g.unit === 'lb')?.heaviestSet.weight).toBe(100);
});

it('keeps load and reps paired with the actual record source', () => {
  const group = buildWorkoutProgress([
    workout('heavy', 100, [loggedSet('heavy-set', 1, 100)]),
    workout('reps', 200, [loggedSet('reps-set', 12, 20)]),
  ])[0];
  expect(group.heaviestSet).toMatchObject({ weight: 100, reps: 1, workoutId: 'heavy', setId: 'heavy-set', finishedAt: 100 });
  expect(group.mostRepsSet).toMatchObject({ weight: 20, reps: 12, workoutId: 'reps', setId: 'reps-set', finishedAt: 200 });
  expect(group.loggedSetCount).toBe(2);
});

it('combines repeated exercise entries into one workout point and keeps per-weight rep records', () => {
  const first = workout('first', 100, [loggedSet('s1', 5, 50), loggedSet('s2', 3, 60)]);
  const repeated = { ...first, exercises: [...first.exercises, { id: 'extra', name: 'Bench press',
    sets: [loggedSet('s3', 8, 50)], targetSets: 100, targetReps: 1000 }] };
  const group = buildWorkoutProgress([workout('second', 200, [loggedSet('s1', 12, 40), loggedSet('s2', 6, 50)]), repeated])[0];
  expect(group.loggedSetCount).toBe(5);
  expect(group.workouts.map(p => [p.workoutId, p.weight, p.reps])).toEqual([['first', 60, 3], ['second', 50, 6]]);
  expect(group.repRecords.map(p => [p.weight, p.reps])).toEqual([[60, 3], [50, 8], [40, 12]]);
  expect(group.repRecords[1]).toMatchObject({ workoutId: 'first', exerciseId: 'extra', setId: 's3' });
});

it('chooses higher reps at the heaviest load and higher load at tied reps', () => {
  const group = buildWorkoutProgress([
    workout('a', 1, [loggedSet('s1', 5, 50), loggedSet('s2', 8, 50)]),
    workout('b', 2, [loggedSet('s1', 12, 10), loggedSet('s2', 12, 20)]),
  ])[0];
  expect(group.heaviestSet).toMatchObject({ weight: 50, reps: 8, setId: 's2' });
  expect(group.mostRepsSet).toMatchObject({ weight: 20, reps: 12, setId: 's2' });
});

it('resolves equal results by earliest finish and stable source identity regardless of input order', () => {
  const values = [
    workout('z', 10, [loggedSet('s', 8, 50)]),
    workout('a', 20, [loggedSet('s', 8, 50)]),
    workout('b', 10, [loggedSet('s', 8, 50)]),
  ];
  const forward = buildWorkoutProgress(values);
  expect(forward[0].heaviestSet.workoutId).toBe('b');
  expect(forward[0].repRecords[0].workoutId).toBe('b');
  expect(forward[0].workouts.map(w => w.workoutId)).toEqual(['b', 'z', 'a']);
  expect(buildWorkoutProgress([...values].reverse())).toEqual(forward);
});

it('uses stable entry/set identity when equal results occur in one workout', () => {
  const value = workout('one', 10, [loggedSet('z', 8, 50), loggedSet('a', 8, 50)]);
  const group = buildWorkoutProgress([value])[0];
  expect(group.heaviestSet.setId).toBe('a');
  expect(group.workouts[0].setId).toBe('a');
});

it('retains zero, fractional loads and supported numeric extremes', () => {
  const zero = buildWorkoutProgress([workout('zero', 0, [loggedSet('s', 5, 0)])])[0];
  expect(zero.heaviestSet).toMatchObject({ weight: 0, reps: 5, finishedAt: 0 });
  expect(zero.repRecords).toHaveLength(1);
  const value = 60.1234567890123;
  const group = buildWorkoutProgress([
    workout('fraction', 1, [loggedSet('s', 8, value)]),
    workout('max', 8.64e15, [loggedSet('s', 1000, 10000)]),
  ])[0];
  expect(group.repRecords[1].weight).toBe(value);
  expect(group.heaviestSet).toMatchObject({ weight: 10000, reps: 1000, finishedAt: 8.64e15 });
});

it('recomputes records after the source workout is removed', () => {
  const history = [workout('heavy', 1, [loggedSet('s', 5, 80)]), workout('light', 2, [loggedSet('s', 8, 40)])];
  expect(buildWorkoutProgress(history)[0].heaviestSet.weight).toBe(80);
  const remaining = buildWorkoutProgress(history.filter(w => w.id !== 'heavy'))[0];
  expect(remaining.heaviestSet).toMatchObject({ weight: 40, workoutId: 'light' });
  expect(remaining.loggedSetCount).toBe(1);
});

it('reads frozen history without changing its order or nested data', () => {
  const first = workout('later', 20, [loggedSet('s', 5, 50)]);
  const second = workout('earlier', 10, [loggedSet('s', 8, 40)]);
  for (const item of [first, second]) {
    item.exercises.forEach(e => { e.sets.forEach(Object.freeze); Object.freeze(e.sets); Object.freeze(e); });
    Object.freeze(item.exercises); Object.freeze(item);
  }
  const history = Object.freeze([first, second]);
  const before = JSON.stringify(history);
  expect(buildWorkoutProgress(history)[0].workouts[0].workoutId).toBe('earlier');
  expect(JSON.stringify(history)).toBe(before);
});

it('retains the full supported history without truncating chart points or records', () => {
  const history = Array.from({ length: 1000 }, (_, i) => workout(`w-${i}`, i + 1, [loggedSet('s', 5, i)]));
  const group = buildWorkoutProgress(history)[0];
  expect(group.workouts).toHaveLength(1000);
  expect(group.repRecords).toHaveLength(1000);
  expect(group.loggedSetCount).toBe(1000);
  expect(group.heaviestSet).toMatchObject({ weight: 999, workoutId: 'w-999' });
});
