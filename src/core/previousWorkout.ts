import type { Workout, WorkoutSet } from '@/types/workout';

interface PreviousExercise {
  readonly workoutId: string;
  readonly workoutName: string;
  readonly finishedAt: number;
  readonly sets: readonly WorkoutSet[];
}

/** Read validated history without changing entered names, units or set values. */
export function findPreviousExercise(history: readonly Workout[], current: Workout, name: string): PreviousExercise | null {
  let previous: PreviousExercise | null = null;
  for (const workout of history) {
    if (workout.finishedAt === null || workout.finishedAt > current.startedAt || workout.unit !== current.unit) continue;
    const exercise = workout.exercises.find(item => item.name === name && item.sets.length > 0);
    if (!exercise) continue;
    if (previous && (workout.finishedAt < previous.finishedAt ||
        (workout.finishedAt === previous.finishedAt && workout.id >= previous.workoutId))) continue;
    previous = { workoutId: workout.id, workoutName: workout.name, finishedAt: workout.finishedAt, sets: exercise.sets };
  }
  return previous;
}
