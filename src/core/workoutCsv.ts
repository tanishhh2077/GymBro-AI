import type { WorkoutData } from '@/types/workout';
import { validateWorkoutData } from './workouts';

function csvCell(value: string | number): string {
  let text = String(value);
  // Quoting CSV syntax alone does not stop spreadsheet formula evaluation.
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createWorkoutCsv(data: WorkoutData): string {
  validateWorkoutData(data);
  const rows: (string | number)[][] = [[
    'workout_id', 'workout_name', 'started_at', 'finished_at', 'exercise_id', 'exercise_name',
    'set_id', 'set_number', 'unit', 'reps', 'weight', 'kind',
  ]];
  const history = [...data.history].sort((a, b) => a.finishedAt! - b.finishedAt!);
  for (const workout of history) {
    for (const exercise of workout.exercises) {
      exercise.sets.forEach((set, index) => rows.push([
        workout.id, workout.name, new Date(workout.startedAt).toISOString(), new Date(workout.finishedAt!).toISOString(),
        exercise.id, exercise.name, set.id, index + 1, workout.unit, set.reps, set.weight, set.kind ?? 'regular',
      ]));
    }
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
