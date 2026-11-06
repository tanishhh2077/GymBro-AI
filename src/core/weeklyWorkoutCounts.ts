import type { Workout } from '@/types/workout';
import { WorkoutError } from './workouts';

export interface WeeklyWorkoutCount {
  /** Local Sunday 00:00, inclusive. */
  readonly start: number;
  /** Next local Sunday 00:00, exclusive; weeks with clock changes are 167 or 169 hours. */
  readonly end: number;
  readonly count: number;
  /** The week containing `now`; it is still in progress. */
  readonly current: boolean;
}

export const MAX_CONSISTENCY_WEEKS = 520;

/**
 * Counts completed workouts per local calendar week, oldest first, including empty weeks.
 * Weeks start on Sunday to match the History calendar. Unfinished workouts are ignored.
 */
export function weeklyWorkoutCounts(history: readonly Workout[], now: number, weeks = 12): readonly WeeklyWorkoutCount[] {
  if (!Number.isSafeInteger(now) || now < 0 || now > 8.64e15) {
    throw new WorkoutError('validation', 'Weekly consistency needs a valid current time.');
  }
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_CONSISTENCY_WEEKS) {
    throw new WorkoutError('validation', `Weekly consistency needs 1 to ${MAX_CONSISTENCY_WEEKS} weeks.`);
  }
  const today = new Date(now);
  // Day arithmetic through the Date constructor lands on local midnight across clock changes.
  const weekStart = (offset: number) => new Date(today.getFullYear(), today.getMonth(),
    today.getDate() - today.getDay() + 7 * offset).getTime();
  const result = Array.from({ length: weeks }, (_, index) => ({
    start: weekStart(index - weeks + 1), end: weekStart(index - weeks + 2), count: 0, current: index === weeks - 1,
  }));
  const first = result[0].start, last = result[weeks - 1].end;
  for (const workout of history) {
    const time = workout.finishedAt;
    if (time === null || time < first || time >= last) continue;
    result.find(week => time >= week.start && time < week.end)!.count++;
  }
  return result;
}
