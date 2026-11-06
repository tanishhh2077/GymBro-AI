import type { WorkoutData } from '@/types/workout';
import { WorkoutError, validateWorkoutData } from './workouts';
import { summarizeWorkout } from './workoutSummary';

export function summarizeTrainingWeek(data: WorkoutData, to: number) {
  validateWorkoutData(data);
  if (!Number.isSafeInteger(to) || to < 0 || to > 8.64e15) {
    throw new WorkoutError('validation', 'The seven-day summary needs a valid current time.');
  }
  const from = to - 7 * 24 * 60 * 60 * 1000;
  const result = { from, to, workouts: 0, sets: 0, durationMs: 0, volume: { lb: 0, kg: 0 } };
  for (const workout of data.history) {
    if (workout.finishedAt! < from || workout.finishedAt! > to) continue;
    const summary = summarizeWorkout(workout);
    result.workouts++;
    result.sets += summary.sets;
    result.durationMs += summary.durationMs;
    result.volume[summary.unit] += summary.volume;
  }
  return result;
}
