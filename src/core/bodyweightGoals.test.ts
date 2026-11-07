import { expect, it } from 'vitest';
import type { Workout, WorkoutExercise, WorkoutGoal, WorkoutSet } from '@/types/workout';
import { buildWorkoutProgress } from './workoutProgress';
import { buildExerciseHistory } from './exerciseHistory';
import { goalProgress } from './goalProgress';
import { formatWeight } from './weightDisplay';
import { summarizeWorkout } from './workoutSummary';

function workout(id: string, finishedAt: number | null, exercises: WorkoutExercise[], unit: 'kg' | 'lb' = 'kg'): Workout {
  return { id, name: `Workout ${id}`, unit, startedAt: 0, finishedAt, exercises };
}
const pullUp = (id: string, sets: WorkoutSet[], bodyweight = true): WorkoutExercise =>
  ({ id, name: 'Pull-up', sets, ...(bodyweight ? { bodyweight: true as const } : {}) });
const goal = (overrides: Partial<WorkoutGoal> = {}): WorkoutGoal =>
  ({ id: 'g', name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 10, reps: 5, createdAt: 0, ...overrides });

it('keeps bodyweight and loaded entries of one name and unit in separate progress groups', () => {
  const groups = buildWorkoutProgress([
    workout('a', 10, [pullUp('e1', [{ id: 's1', reps: 8, weight: -20 }, { id: 's2', reps: 5, weight: 10, rpe: 9 }])]),
    workout('b', 20, [pullUp('e2', [{ id: 's3', reps: 6, weight: 40 }], false)]),
  ]);
  expect(groups.map(g => [g.key, g.bodyweight ?? false, g.heaviestSet.weight])).toEqual([
    [JSON.stringify(['Pull-up', 'kg']), false, 40], [JSON.stringify(['Pull-up', 'kg', 'bodyweight']), true, 10]]);
  expect(groups[1].mostRepsSet).toMatchObject({ reps: 8, weight: -20 });
  expect(groups[1].repRecords.map(r => r.weight)).toEqual([10, -20]);
  expect(Object.prototype.hasOwnProperty.call(groups[0], 'bodyweight')).toBe(false);
});
it('ignores RPE in progress records and workout volume', () => {
  const sets = (rpe?: number): WorkoutSet[] => [{ id: 's', reps: 5, weight: 100, ...(rpe ? { rpe } : {}) }];
  const plain = workout('a', 10, [{ id: 'e', name: 'Bench', sets: sets() }]);
  const rated = workout('a', 10, [{ id: 'e', name: 'Bench', sets: sets(9.5) }]);
  expect(buildWorkoutProgress([rated])).toEqual(buildWorkoutProgress([plain]));
  expect(summarizeWorkout(rated)).toEqual(summarizeWorkout(plain));
});
it('reads exercise history separately for bodyweight and loaded entries', () => {
  const history = [workout('a', 10, [pullUp('e1', [{ id: 's1', reps: 8, weight: 0 }]), pullUp('e2', [{ id: 's2', reps: 5, weight: 20 }], false)])];
  expect(buildExerciseHistory(history, 100, 'Pull-up', 'kg')[0].exercises.map(e => e.id)).toEqual(['e2']);
  expect(buildExerciseHistory(history, 100, 'Pull-up', 'kg', true)[0].exercises.map(e => e.id)).toEqual(['e1']);
});
it('reports a goal as achieved by the best qualifying finished Regular set', () => {
  const history = [
    workout('early', 10, [pullUp('e1', [{ id: 's1', reps: 5, weight: 10 }])]),
    workout('later', 20, [pullUp('e2', [{ id: 's2', reps: 6, weight: 12.5 }, { id: 's3', reps: 9, weight: 30, kind: 'warmup' }])]),
    workout('active', null, [pullUp('e3', [{ id: 's4', reps: 10, weight: 50 }])]),
    workout('loaded', 30, [pullUp('e4', [{ id: 's5', reps: 10, weight: 50 }], false)]),
    workout('pounds', 40, [pullUp('e5', [{ id: 's6', reps: 10, weight: 50 }])], 'lb'),
  ];
  expect(goalProgress(history, goal())).toEqual({ status: 'achieved',
    set: { workoutId: 'later', workoutName: 'Workout later', finishedAt: 20, exerciseId: 'e2', setId: 's2', reps: 6, weight: 12.5 } });
});
it('reports the closest set and its shortfall when a goal is not yet achieved', () => {
  const repsMet = [workout('a', 10, [pullUp('e1', [{ id: 's1', reps: 8, weight: 5 }, { id: 's2', reps: 5, weight: 7.5 }, { id: 's3', reps: 3, weight: 20 }])])];
  expect(goalProgress(repsMet, goal())).toMatchObject({ status: 'closest', set: { setId: 's2' }, weightShortfall: 2.5, repsShortfall: 0 });
  const weightMet = [workout('a', 10, [pullUp('e1', [{ id: 's1', reps: 3, weight: 20 }, { id: 's2', reps: 4, weight: 10 }])])];
  expect(goalProgress(weightMet, goal())).toMatchObject({ status: 'closest', set: { setId: 's2' }, weightShortfall: 0, repsShortfall: 1 });
  const neither = [workout('a', 10, [pullUp('e1', [{ id: 's1', reps: 4, weight: -10 }, { id: 's2', reps: 2, weight: 5 }])])];
  expect(goalProgress(neither, goal())).toMatchObject({ status: 'closest', set: { setId: 's2' }, weightShortfall: 5, repsShortfall: 3 });
  expect(goalProgress([], goal())).toEqual({ status: 'none' });
  expect(goalProgress(repsMet, goal({ bodyweight: undefined }))).toEqual({ status: 'none' });
});
it('formats loads with an optional rounded alternate unit and bodyweight wording', () => {
  expect(formatWeight(100, 'kg')).toBe('100 kg');
  expect(formatWeight(100, 'kg', { alternate: true })).toBe('100 kg · 220.5 lb');
  expect(formatWeight(225, 'lb', { alternate: true })).toBe('225 lb · 102 kg');
  expect(formatWeight(102.5, 'kg')).toBe('102.5 kg');
  expect(formatWeight(0, 'kg', { alternate: true })).toBe('0 kg · 0 lb');
  expect(formatWeight(0, 'lb', { bodyweight: true })).toBe('Bodyweight');
  expect(formatWeight(0, 'lb', { bodyweight: true, alternate: true })).toBe('Bodyweight');
  expect(formatWeight(20, 'lb', { bodyweight: true })).toBe('+20 lb');
  expect(formatWeight(-30, 'lb', { bodyweight: true })).toBe('−30 lb assist');
  expect(formatWeight(20, 'kg', { bodyweight: true, alternate: true })).toBe('+20 kg · +44 lb');
  expect(formatWeight(-30, 'lb', { bodyweight: true, alternate: true })).toBe('−30 lb · −13.5 kg assist');
  expect(() => formatWeight(Number.NaN, 'kg')).toThrow(/cannot be displayed/);
  expect(() => formatWeight(1, 'st' as never)).toThrow(/cannot be displayed/);
});
