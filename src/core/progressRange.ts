import type { Workout } from '@/types/workout';

export const PROGRESS_PERIODS = [
  { value: 'month', label: 'Last month' },
  { value: 'three-months', label: 'Three months' },
  { value: 'six-months', label: 'Six months' },
  { value: 'all', label: 'All time' },
] as const;

export type ProgressPeriod = typeof PROGRESS_PERIODS[number]['value'];

/** Rolling calendar months, inclusive from local midnight through now. */
export function progressRangeStart(period: ProgressPeriod, now: number): number | null {
  if (period === 'all') return null;
  const months = period === 'month' ? 1 : period === 'three-months' ? 3 : 6;
  const today = new Date(now);
  const start = new Date(now);
  // Move from day 1 so e.g. March 31 cannot overflow February into March.
  start.setDate(1);
  start.setMonth(start.getMonth() - months);
  const monthEnd = new Date(start.getTime());
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
  start.setDate(Math.min(today.getDate(), monthEnd.getDate()));
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Read validated history without changing its order, records or saved format. */
export function filterProgressHistory(history: readonly Workout[], period: ProgressPeriod, now: number): readonly Workout[] {
  const start = progressRangeStart(period, now);
  if (start === null) return history;
  return history.filter(workout => workout.finishedAt !== null && workout.finishedAt >= start && workout.finishedAt <= now);
}
