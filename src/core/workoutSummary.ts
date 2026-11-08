import type { Workout } from '@/types/workout';
import { emptyWorkoutData, validateWorkoutData } from './workouts';

/**
 * Volume sums reps x entered load for loaded exercises only. A bodyweight set stores added load (negative for
 * assistance) without the lifter's body mass, so it has no honest load total; those sets are counted separately.
 */
export function summarizeWorkout(workout: Workout) {
  validateWorkoutData({ ...emptyWorkoutData(), history: [workout] });
  let sets = 0; let warmups = 0; let volume = 0; let bodyweightSets = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      sets++; warmups += Number(set.kind === 'warmup');
      if (exercise.bodyweight) bodyweightSets++; else volume += set.reps * set.weight;
    }
  }
  return { durationMs: workout.finishedAt! - workout.startedAt, exercises: workout.exercises.length,
    sets, regular: sets - warmups, warmups, volume, bodyweightSets, unit: workout.unit };
}
export function workoutDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours}h ` : ''}${hours || minutes ? `${minutes}m ` : ''}${seconds % 60}s`;
}
