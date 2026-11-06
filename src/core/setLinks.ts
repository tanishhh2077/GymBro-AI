import type { SetLink } from '@/types';
import type { Workout, WorkoutData, WorkoutExercise, WorkoutSet } from '@/types/workout';

const BENCH_NAMES = new Set(['bench press', 'bench', 'barbell bench press', 'flat bench press', 'flat barbell bench press']);

/**
 * Flat barbell bench press only: the recording guide and elbow measurements were
 * written for it, so variants such as incline or dumbbell presses get no action (D-014).
 */
export function isBenchPressName(name: string): boolean {
  return BENCH_NAMES.has(name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim());
}

export interface ResolvedSet {
  place: 'active' | 'history';
  workout: Workout;
  exercise: WorkoutExercise;
  set: WorkoutSet;
  /** The set's current 1-based position, which changes if an earlier set is removed. */
  setNumber: number;
}

/**
 * Exercise and set IDs are unique only inside one workout, so all three IDs must
 * match, starting from the workout; names and positions are never used.
 */
export function resolveSetLink(data: WorkoutData, link: SetLink): ResolvedSet | null {
  const active = data.active?.id === link.workoutId ? data.active : null;
  const workout = active ?? data.history.find(w => w.id === link.workoutId);
  if (!workout) return null;
  const exercise = workout.exercises.find(e => e.id === link.exerciseId);
  if (!exercise || !isBenchPressName(exercise.name)) return null;
  const index = exercise.sets.findIndex(s => s.id === link.setId);
  if (index < 0) return null;
  return { place: active ? 'active' : 'history', workout, exercise, set: exercise.sets[index], setNumber: index + 1 };
}
