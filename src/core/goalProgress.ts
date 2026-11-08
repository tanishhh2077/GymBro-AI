import type { Workout, WorkoutGoal } from '@/types/workout';
import type { RecordedSet } from '@/types/progress';

/**
 * Derived from finished Regular sets with the goal's exact name, unit and bodyweight setting.
 * `closest` shortfalls are goal minus set, floored at zero, in the goal's unit and reps.
 */
export type GoalProgress =
  | { readonly status: 'achieved'; readonly set: RecordedSet }
  | { readonly status: 'closest'; readonly set: RecordedSet; readonly weightShortfall: number; readonly repsShortfall: number }
  | { readonly status: 'none' };

function earlier(left: RecordedSet, right: RecordedSet): number {
  const leftSource = `${left.workoutId}/${left.exerciseId}/${left.setId}`;
  const rightSource = `${right.workoutId}/${right.exerciseId}/${right.setId}`;
  return left.finishedAt - right.finishedAt || (leftSource < rightSource ? -1 : leftSource > rightSource ? 1 : 0);
}
const heavierFirst = (left: RecordedSet, right: RecordedSet) => right.weight - left.weight || right.reps - left.reps || earlier(left, right);
const moreRepsFirst = (left: RecordedSet, right: RecordedSet) => right.reps - left.reps || right.weight - left.weight || earlier(left, right);

/**
 * Achieved: the heaviest set with reps >= goal reps at weight >= goal weight (ties: more reps, then earliest).
 * Otherwise the closest set is, in order of preference: the heaviest set that reached the goal reps; the set
 * with the most reps at the goal weight or more; else the heaviest set. Planned targets never count.
 */
export function goalProgress(history: readonly Workout[], goal: WorkoutGoal): GoalProgress {
  const sets: RecordedSet[] = [];
  for (const workout of history) {
    if (workout.finishedAt === null || workout.unit !== goal.unit) continue;
    for (const exercise of workout.exercises) {
      if (exercise.name !== goal.name || (exercise.bodyweight === true) !== (goal.bodyweight === true)) continue;
      for (const set of exercise.sets) {
        if (set.kind === 'warmup') continue;
        sets.push({ workoutId: workout.id, workoutName: workout.name, finishedAt: workout.finishedAt,
          exerciseId: exercise.id, setId: set.id, reps: set.reps, weight: set.weight });
      }
    }
  }
  if (!sets.length) return { status: 'none' };
  const repsMet = sets.filter(set => set.reps >= goal.reps);
  const achieved = repsMet.filter(set => set.weight >= goal.weight).sort(heavierFirst)[0];
  if (achieved) return { status: 'achieved', set: achieved };
  const weightMet = sets.filter(set => set.weight >= goal.weight);
  const closest = repsMet.length ? repsMet.sort(heavierFirst)[0] : weightMet.length ? weightMet.sort(moreRepsFirst)[0] : sets.sort(heavierFirst)[0];
  return { status: 'closest', set: closest,
    weightShortfall: Math.max(0, goal.weight - closest.weight), repsShortfall: Math.max(0, goal.reps - closest.reps) };
}
