import { describe, expect, it } from 'vitest';
import type { Workout, WorkoutExercise, WorkoutGoal, WorkoutSet } from '@/types/workout';
import { goalProgress } from './goalProgress';

function makeWorkout(
  id: string,
  finishedAt: number | null,
  exercises: WorkoutExercise[],
  unit: 'kg' | 'lb' = 'kg',
): Workout {
  return { id, name: `Workout ${id}`, unit, startedAt: 0, finishedAt, exercises };
}

function makeExercise(
  id: string,
  name: string,
  sets: WorkoutSet[],
  bodyweight = false,
): WorkoutExercise {
  return { id, name, sets, ...(bodyweight ? { bodyweight: true as const } : {}) };
}

function makeGoal(overrides: Partial<WorkoutGoal> = {}): WorkoutGoal {
  return {
    id: 'goal-1',
    name: 'Bench press',
    unit: 'kg',
    weight: 100,
    reps: 5,
    createdAt: 0,
    ...overrides,
  };
}

describe('goalProgress edge cases', () => {
  it('returns none for empty history, null finishedAt, empty exercises, or empty sets', () => {
    const goal = makeGoal();
    expect(goalProgress([], goal)).toEqual({ status: 'none' });

    const activeWorkout = makeWorkout('w1', null, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 10, weight: 150 }]),
    ]);
    expect(goalProgress([activeWorkout], goal)).toEqual({ status: 'none' });

    const noExercises = makeWorkout('w2', 1000, []);
    expect(goalProgress([noExercises], goal)).toEqual({ status: 'none' });

    const noSets = makeWorkout('w3', 1000, [
      makeExercise('e1', 'Bench press', []),
    ]);
    expect(goalProgress([noSets], goal)).toEqual({ status: 'none' });
  });

  it('completely ignores warm-up sets', () => {
    const goal = makeGoal({ weight: 100, reps: 5 });
    const warmupOnly = makeWorkout('w1', 1000, [
      makeExercise('e1', 'Bench press', [
        { id: 's1', reps: 10, weight: 150, kind: 'warmup' },
        { id: 's2', reps: 12, weight: 200, kind: 'warmup' },
      ]),
    ]);
    expect(goalProgress([warmupOnly], goal)).toEqual({ status: 'none' });

    const mixedWorkout = makeWorkout('w2', 2000, [
      makeExercise('e1', 'Bench press', [
        { id: 's1', reps: 10, weight: 150, kind: 'warmup' },
        { id: 's2', reps: 5, weight: 90 },
      ]),
    ]);
    const result = goalProgress([mixedWorkout], goal);
    expect(result).toMatchObject({
      status: 'closest',
      set: { setId: 's2', weight: 90, reps: 5 },
      weightShortfall: 10,
      repsShortfall: 0,
    });
  });

  it('enforces unit matching strictly', () => {
    const kgGoal = makeGoal({ unit: 'kg', weight: 100, reps: 5 });
    const lbWorkout = makeWorkout('w1', 1000, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 10, weight: 250 }]),
    ], 'lb');
    expect(goalProgress([lbWorkout], kgGoal)).toEqual({ status: 'none' });

    const lbGoal = makeGoal({ unit: 'lb', weight: 200, reps: 5 });
    const kgWorkout = makeWorkout('w2', 1000, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 10, weight: 200 }]),
    ], 'kg');
    expect(goalProgress([kgWorkout], lbGoal)).toEqual({ status: 'none' });
  });

  it('matches exercise name exactly, rejecting casing and whitespace differences', () => {
    const goal = makeGoal({ name: 'Bench press' });
    const history = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'bench press', [{ id: 's1', reps: 5, weight: 100 }]),
        makeExercise('e2', 'Bench Press', [{ id: 's2', reps: 5, weight: 100 }]),
        makeExercise('e3', 'Bench press ', [{ id: 's3', reps: 5, weight: 100 }]),
        makeExercise('e4', ' Bench press', [{ id: 's4', reps: 5, weight: 100 }]),
      ]),
    ];
    expect(goalProgress(history, goal)).toEqual({ status: 'none' });
  });

  it('separates bodyweight and loaded exercises strictly', () => {
    const loadedGoal = makeGoal({ name: 'Pull-up', bodyweight: undefined, weight: 20, reps: 5 });
    const bodyweightWorkout = makeWorkout('w1', 1000, [
      makeExercise('e1', 'Pull-up', [{ id: 's1', reps: 10, weight: 25 }], true),
    ]);
    expect(goalProgress([bodyweightWorkout], loadedGoal)).toEqual({ status: 'none' });

    const bwGoal = makeGoal({ name: 'Pull-up', bodyweight: true, weight: 10, reps: 5 });
    const loadedWorkout = makeWorkout('w2', 1000, [
      makeExercise('e1', 'Pull-up', [{ id: 's1', reps: 10, weight: 50 }], false),
    ]);
    expect(goalProgress([loadedWorkout], bwGoal)).toEqual({ status: 'none' });
  });

  it('handles bodyweight assistance (negative loads) and zero load properly', () => {
    const assistGoal = makeGoal({
      name: 'Pull-up',
      bodyweight: true,
      weight: -10,
      reps: 5,
    });

    // -5kg assistance is heavier (less assistance) than -10kg assistance
    const heavierAssist = makeWorkout('w1', 1000, [
      makeExercise('e1', 'Pull-up', [{ id: 's1', reps: 5, weight: -5 }], true),
    ]);
    expect(goalProgress([heavierAssist], assistGoal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's1', weight: -5, reps: 5 },
    });

    // -15kg assistance is lighter (more assistance) than -10kg assistance
    const lighterAssist = makeWorkout('w2', 2000, [
      makeExercise('e1', 'Pull-up', [{ id: 's2', reps: 5, weight: -15 }], true),
    ]);
    expect(goalProgress([lighterAssist], assistGoal)).toMatchObject({
      status: 'closest',
      set: { setId: 's2', weight: -15, reps: 5 },
      weightShortfall: 5,
      repsShortfall: 0,
    });

    // Unassisted 0kg vs assistance goal
    const unassisted = makeWorkout('w3', 3000, [
      makeExercise('e1', 'Pull-up', [{ id: 's3', reps: 5, weight: 0 }], true),
    ]);
    expect(goalProgress([unassisted], assistGoal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's3', weight: 0, reps: 5 },
    });
  });

  it('classifies exact reach and all surpassing variations as achieved', () => {
    const goal = makeGoal({ weight: 100, reps: 5 });

    // Exact
    const exact = makeWorkout('w1', 1000, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 100 }]),
    ]);
    expect(goalProgress([exact], goal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's1', weight: 100, reps: 5 },
    });

    // Weight surpassed
    const weightSurpassed = makeWorkout('w2', 1000, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 105 }]),
    ]);
    expect(goalProgress([weightSurpassed], goal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's1', weight: 105, reps: 5 },
    });

    // Reps surpassed
    const repsSurpassed = makeWorkout('w3', 1000, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 8, weight: 100 }]),
    ]);
    expect(goalProgress([repsSurpassed], goal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's1', weight: 100, reps: 8 },
    });

    // Both surpassed
    const bothSurpassed = makeWorkout('w4', 1000, [
      makeExercise('e1', 'Bench press', [{ id: 's1', reps: 10, weight: 110 }]),
    ]);
    expect(goalProgress([bothSurpassed], goal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's1', weight: 110, reps: 10 },
    });
  });

  it('selects the heaviest set that reached goal reps when choosing achieved', () => {
    const goal = makeGoal({ weight: 100, reps: 5 });
    const history = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [
          { id: 's1', reps: 10, weight: 100 },
          { id: 's2', reps: 5, weight: 110 },
        ]),
      ]),
    ];
    // 110kg x 5 is heavier than 100kg x 10, so 110kg is chosen
    expect(goalProgress(history, goal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's2', weight: 110, reps: 5 },
    });
  });

  it('resolves ties in achieved sets by more reps, then earlier finish, then source string', () => {
    const goal = makeGoal({ weight: 100, reps: 5 });

    // Same weight, different reps -> higher reps wins
    const higherReps = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 100 }]),
      ]),
      makeWorkout('w2', 2000, [
        makeExercise('e1', 'Bench press', [{ id: 's2', reps: 7, weight: 100 }]),
      ]),
    ];
    expect(goalProgress(higherReps, goal)).toMatchObject({
      status: 'achieved',
      set: { workoutId: 'w2', setId: 's2' },
    });

    // Identical weight and reps -> earlier finish wins
    const earlierWins = [
      makeWorkout('w-late', 2000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 100 }]),
      ]),
      makeWorkout('w-early', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's2', reps: 5, weight: 100 }]),
      ]),
    ];
    expect(goalProgress(earlierWins, goal)).toMatchObject({
      status: 'achieved',
      set: { workoutId: 'w-early', setId: 's2' },
    });

    // Identical weight, reps, and timestamp -> source string breaks tie
    const sameTime = [
      makeWorkout('w-b', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 100 }]),
      ]),
      makeWorkout('w-a', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 100 }]),
      ]),
    ];
    expect(goalProgress(sameTime, goal)).toMatchObject({
      status: 'achieved',
      set: { workoutId: 'w-a' },
    });

    // Identical in same workout across sets -> setId breaks tie
    const sameWorkout = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [
          { id: 's-z', reps: 5, weight: 100 },
          { id: 's-a', reps: 5, weight: 100 },
        ]),
      ]),
    ];
    expect(goalProgress(sameWorkout, goal)).toMatchObject({
      status: 'achieved',
      set: { setId: 's-a' },
    });
  });

  it('selects the closest set in preference order: repsMet -> weightMet -> heaviest', () => {
    const goal = makeGoal({ weight: 100, reps: 5 });

    // Preference 1: repsMet exists -> heaviest set reaching reps
    const repsMetHistory = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [
          { id: 's1', reps: 8, weight: 90 },
          { id: 's2', reps: 5, weight: 95 },
        ]),
      ]),
    ];
    expect(goalProgress(repsMetHistory, goal)).toMatchObject({
      status: 'closest',
      set: { setId: 's2', weight: 95, reps: 5 },
      weightShortfall: 5,
      repsShortfall: 0,
    });

    // Preference 2: no repsMet, but weightMet exists -> most reps at or above goal weight
    const weightMetHistory = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [
          { id: 's1', reps: 2, weight: 110 },
          { id: 's2', reps: 4, weight: 100 },
        ]),
      ]),
    ];
    expect(goalProgress(weightMetHistory, goal)).toMatchObject({
      status: 'closest',
      set: { setId: 's2', weight: 100, reps: 4 },
      weightShortfall: 0,
      repsShortfall: 1,
    });

    // Preference 3: neither repsMet nor weightMet -> heaviest set overall
    const neitherHistory = [
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [
          { id: 's1', reps: 4, weight: 80 },
          { id: 's2', reps: 2, weight: 90 },
        ]),
      ]),
    ];
    expect(goalProgress(neitherHistory, goal)).toMatchObject({
      status: 'closest',
      set: { setId: 's2', weight: 90, reps: 2 },
      weightShortfall: 10,
      repsShortfall: 3,
    });
  });

  it('resolves ties in closest selection deterministically by earlier timestamp then source', () => {
    const goal = makeGoal({ weight: 100, reps: 5 });

    // Ties in repsMet
    const tiedRepsMet = [
      makeWorkout('w2', 2000, [
        makeExercise('e1', 'Bench press', [{ id: 's2', reps: 5, weight: 90 }]),
      ]),
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 5, weight: 90 }]),
      ]),
    ];
    expect(goalProgress(tiedRepsMet, goal)).toMatchObject({
      status: 'closest',
      set: { workoutId: 'w1', setId: 's1' },
    });

    // Ties in weightMet
    const tiedWeightMet = [
      makeWorkout('w2', 2000, [
        makeExercise('e1', 'Bench press', [{ id: 's2', reps: 3, weight: 105 }]),
      ]),
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 3, weight: 105 }]),
      ]),
    ];
    expect(goalProgress(tiedWeightMet, goal)).toMatchObject({
      status: 'closest',
      set: { workoutId: 'w1', setId: 's1' },
    });

    // Ties in neither
    const tiedNeither = [
      makeWorkout('w2', 2000, [
        makeExercise('e1', 'Bench press', [{ id: 's2', reps: 2, weight: 70 }]),
      ]),
      makeWorkout('w1', 1000, [
        makeExercise('e1', 'Bench press', [{ id: 's1', reps: 2, weight: 70 }]),
      ]),
    ];
    expect(goalProgress(tiedNeither, goal)).toMatchObject({
      status: 'closest',
      set: { workoutId: 'w1', setId: 's1' },
    });
  });

  it('does not mutate history or goal inputs', () => {
    const goal = Object.freeze(makeGoal());
    const workout = Object.freeze(
      makeWorkout('w1', 1000, [
        Object.freeze(makeExercise('e1', 'Bench press', [
          Object.freeze({ id: 's1', reps: 5, weight: 100 }),
        ])),
      ]),
    );
    const history = Object.freeze([workout]);
    const beforeHistory = JSON.stringify(history);
    const beforeGoal = JSON.stringify(goal);

    goalProgress(history, goal);

    expect(JSON.stringify(history)).toBe(beforeHistory);
    expect(JSON.stringify(goal)).toBe(beforeGoal);
  });
});
