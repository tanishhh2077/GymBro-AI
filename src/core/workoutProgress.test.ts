import { describe, expect, it } from 'vitest';
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

describe('buildWorkoutProgress edge cases', () => {
  it('excludes warm-up sets completely from progress, PRs, and workout points', () => {
    // Only warm-up sets -> no progress groups generated
    const warmupOnly = workout('w1', 1000, [
      { id: 's1', reps: 10, weight: 150, kind: 'warmup' },
      { id: 's2', reps: 12, weight: 160, kind: 'warmup' },
    ]);
    expect(buildWorkoutProgress([warmupOnly])).toEqual([]);

    // Heavy warm-up with lighter regular set -> only regular set counted
    const mixed = workout('w2', 2000, [
      { id: 's-warm', reps: 10, weight: 200, kind: 'warmup' },
      { id: 's-reg', reps: 5, weight: 80, kind: 'regular' },
    ]);
    const groups = buildWorkoutProgress([mixed]);
    expect(groups).toHaveLength(1);
    expect(groups[0].loggedSetCount).toBe(1);
    expect(groups[0].heaviestSet).toMatchObject({ setId: 's-reg', weight: 80, reps: 5 });
    expect(groups[0].mostRepsSet).toMatchObject({ setId: 's-reg', weight: 80, reps: 5 });
    expect(groups[0].workouts).toHaveLength(1);
    expect(groups[0].workouts[0]).toMatchObject({ setId: 's-reg' });
    expect(groups[0].repRecords).toHaveLength(1);
    expect(groups[0].repRecords[0]).toMatchObject({ setId: 's-reg' });

    // One workout purely warm-up, one regular -> only regular workout appears in workouts
    const combined = buildWorkoutProgress([warmupOnly, mixed]);
    expect(combined[0].workouts.map(w => w.workoutId)).toEqual(['w2']);
  });

  it('handles empty workouts, exercises without sets, and uncompleted workouts', () => {
    const emptyEx: Workout = {
      id: 'empty-ex',
      name: 'Empty Exercises',
      unit: 'kg',
      startedAt: 0,
      finishedAt: 1000,
      exercises: [],
    };
    const emptySets: Workout = {
      id: 'empty-sets',
      name: 'Empty Sets',
      unit: 'kg',
      startedAt: 0,
      finishedAt: 1000,
      exercises: [{ id: 'e1', name: 'Bench press', sets: [] }],
    };
    const uncompleted: Workout = {
      id: 'uncompleted',
      name: 'Uncompleted',
      unit: 'kg',
      startedAt: 0,
      finishedAt: null,
      exercises: [{ id: 'e1', name: 'Bench press', sets: [loggedSet('s1', 5, 100)] }],
    };
    expect(buildWorkoutProgress([emptyEx, emptySets, uncompleted])).toEqual([]);
  });

  it('resolves ties in heaviestSet and mostRepsSet deterministically', () => {
    // heaviestSet: tied weight & reps -> earlier finish wins
    const earlierVsLater = [
      workout('late', 2000, [loggedSet('s-late', 5, 100)]),
      workout('early', 1000, [loggedSet('s-early', 5, 100)]),
    ];
    expect(buildWorkoutProgress(earlierVsLater)[0].heaviestSet).toMatchObject({
      workoutId: 'early',
      setId: 's-early',
    });

    // heaviestSet: tied weight, reps, AND finishedAt across workouts -> source string wins
    const sameTime = [
      workout('w-b', 1000, [loggedSet('s1', 5, 100)]),
      workout('w-a', 1000, [loggedSet('s1', 5, 100)]),
    ];
    expect(buildWorkoutProgress(sameTime)[0].heaviestSet).toMatchObject({
      workoutId: 'w-a',
    });

    // mostRepsSet: tied reps & weight -> earlier finish wins
    const repTie = [
      workout('late', 2000, [loggedSet('s-late', 12, 50)]),
      workout('early', 1000, [loggedSet('s-early', 12, 50)]),
    ];
    expect(buildWorkoutProgress(repTie)[0].mostRepsSet).toMatchObject({
      workoutId: 'early',
      setId: 's-early',
    });

    // mostRepsSet: tied reps, weight, AND finishedAt -> source string wins
    const repTimeTie = [
      workout('w-y', 1000, [loggedSet('s1', 12, 50)]),
      workout('w-x', 1000, [loggedSet('s1', 12, 50)]),
    ];
    expect(buildWorkoutProgress(repTimeTie)[0].mostRepsSet).toMatchObject({
      workoutId: 'w-x',
    });
  });

  it('resolves ties in per-workout best set and per-weight rep records', () => {
    // Within one workout: two identical sets -> setId breaks tie
    const withinWorkout = workout('w1', 1000, [
      loggedSet('s-z', 5, 100),
      loggedSet('s-a', 5, 100),
    ]);
    const group = buildWorkoutProgress([withinWorkout])[0];
    expect(group.workouts[0].setId).toBe('s-a');
    expect(group.repRecords[0].setId).toBe('s-a');

    // Across workouts for repRecords: same weight and reps -> earlier finish wins
    const crossRepRecords = [
      workout('w-later', 2000, [loggedSet('s2', 8, 80)]),
      workout('w-earlier', 1000, [loggedSet('s1', 8, 80)]),
    ];
    expect(buildWorkoutProgress(crossRepRecords)[0].repRecords[0]).toMatchObject({
      workoutId: 'w-earlier',
      setId: 's1',
    });
  });

  it('orders assisted bodyweight loads mathematically (less assistance is heavier)', () => {
    const bwWorkout: Workout = {
      id: 'bw-1',
      name: 'Bodyweight Workout',
      unit: 'kg',
      startedAt: 0,
      finishedAt: 1000,
      exercises: [{
        id: 'e1',
        name: 'Pull-up',
        bodyweight: true,
        sets: [
          loggedSet('s-assist-heavy', 5, -20),
          loggedSet('s-assist-light', 5, -5),
          loggedSet('s-unassisted', 5, 0),
          loggedSet('s-weighted', 5, 10),
        ],
      }],
    };
    const groups = buildWorkoutProgress([bwWorkout]);
    expect(groups).toHaveLength(1);
    expect(groups[0].bodyweight).toBe(true);
    // +10kg is heaviest
    expect(groups[0].heaviestSet).toMatchObject({ setId: 's-weighted', weight: 10 });
    // repRecords sorted descending by weight: 10, 0, -5, -20
    expect(groups[0].repRecords.map(r => r.weight)).toEqual([10, 0, -5, -20]);
  });

  it('orders progress groups by name, then unit, then loaded before bodyweight', () => {
    const w1: Workout = {
      id: 'w1',
      name: 'Mixed',
      unit: 'kg',
      startedAt: 0,
      finishedAt: 1000,
      exercises: [
        { id: 'e1', name: 'Squat', sets: [loggedSet('s1', 5, 100)] },
        { id: 'e2', name: 'Pull-up', bodyweight: true, sets: [loggedSet('s2', 5, 0)] },
        { id: 'e3', name: 'Pull-up', sets: [loggedSet('s3', 5, 20)] },
        { id: 'e4', name: 'Bench press', sets: [loggedSet('s4', 5, 80)] },
      ],
    };
    const wLb: Workout = {
      id: 'w2',
      name: 'Pounds',
      unit: 'lb',
      startedAt: 0,
      finishedAt: 2000,
      exercises: [
        { id: 'e5', name: 'Bench press', sets: [loggedSet('s5', 5, 180)] },
      ],
    };
    const groups = buildWorkoutProgress([w1, wLb]);
    expect(groups.map(g => [g.name, g.unit, g.bodyweight ?? false])).toEqual([
      ['Bench press', 'kg', false],
      ['Bench press', 'lb', false],
      ['Pull-up', 'kg', false],
      ['Pull-up', 'kg', true],
      ['Squat', 'kg', false],
    ]);
  });
});

