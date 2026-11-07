import type { SetKind, Workout, WorkoutSet } from '@/types/workout';

interface PreviousExercise {
  readonly workoutId: string;
  readonly workoutName: string;
  readonly finishedAt: number;
  readonly sets: readonly WorkoutSet[];
}

/**
 * Read validated history without changing entered names, units or set values. A bodyweight entry stores added
 * load, so it only matches other bodyweight entries of the same name and never mixes with loaded ones.
 */
export function findPreviousExercise(history: readonly Workout[], current: Workout, name: string, kind: SetKind = 'regular',
  bodyweight = false): PreviousExercise | null {
  let previous: PreviousExercise | null = null;
  for (const workout of history) {
    if (workout.finishedAt === null || workout.finishedAt > current.startedAt || workout.unit !== current.unit) continue;
    const exercise = workout.exercises.find(item => item.name === name && (item.bodyweight === true) === bodyweight && item.sets.some(set => (set.kind ?? 'regular') === kind));
    if (!exercise) continue;
    if (previous && (workout.finishedAt < previous.finishedAt ||
        (workout.finishedAt === previous.finishedAt && workout.id >= previous.workoutId))) continue;
    const matching = exercise.sets.filter(set => (set.kind ?? 'regular') === kind);
    previous = { workoutId: workout.id, workoutName: workout.name, finishedAt: workout.finishedAt,
      sets: matching.length === exercise.sets.length ? exercise.sets : matching };
  }
  return previous;
}
