import type { WeightUnit, Workout, WorkoutExercise } from '@/types/workout';

export interface ExerciseHistoryWorkout {
  readonly workoutId: string;
  readonly workoutName: string;
  readonly finishedAt: number;
  readonly exercises: readonly WorkoutExercise[];
}

/** Read validated history using the same start-time boundary as previous values. */
export function buildExerciseHistory(history: readonly Workout[], startedAt: number, name: string, unit: WeightUnit): readonly ExerciseHistoryWorkout[] {
  const entries: ExerciseHistoryWorkout[] = [];
  for (const workout of history) {
    if (workout.finishedAt === null || workout.finishedAt > startedAt || workout.unit !== unit) continue;
    const exercises = workout.exercises.filter(exercise => exercise.name === name && exercise.sets.length > 0);
    if (!exercises.length) continue;
    entries.push({ workoutId: workout.id, workoutName: workout.name, finishedAt: workout.finishedAt, exercises });
  }
  return entries.sort((left, right) => right.finishedAt - left.finishedAt ||
    (left.workoutId < right.workoutId ? -1 : left.workoutId > right.workoutId ? 1 : 0));
}
