import type { Workout } from '@/types/workout';

export interface HistoryFilters { query: string; from: string; to: string }

function localDateKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000') &&
    localDateKey(new Date(`${value}T12:00:00`)) === Number(value.replace(/-/g, ''));
}

/** Reads validated saved history without changing records or their input order. */
export function filterWorkoutHistory(history: readonly Workout[], filters: HistoryFilters): { workouts: Workout[]; error: string | null } {
  const { from, to } = filters;
  if (from && !validDate(from)) return { workouts: [], error: 'Enter a valid From date.' };
  if (to && !validDate(to)) return { workouts: [], error: 'Enter a valid To date.' };
  if (from && to && from > to) return { workouts: [], error: 'From date must be on or before To date.' };
  const query = filters.query.trim().toLowerCase();
  const fromKey = from ? Number(from.replace(/-/g, '')) : null;
  const toKey = to ? Number(to.replace(/-/g, '')) : null;
  const workouts = history.filter(workout => {
    if (!workout.finishedAt) return false;
    const day = localDateKey(new Date(workout.finishedAt));
    return (fromKey === null || day >= fromKey) && (toKey === null || day <= toKey) &&
      (!query || workout.name.toLowerCase().includes(query) || workout.exercises.some(e => e.name.toLowerCase().includes(query)));
  }).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  return { workouts, error: null };
}
