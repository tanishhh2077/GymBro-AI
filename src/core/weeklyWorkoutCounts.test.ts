import { afterAll, describe, expect, it } from 'vitest';
import type { Workout } from '@/types/workout';
import { WorkoutError } from './workouts';
import { weeklyWorkoutCounts } from './weeklyWorkoutCounts';

// Pin a zone with daylight-saving changes so week lengths are deterministic on any host.
const originalZone = process.env.TZ;
process.env.TZ = 'America/Chicago';
afterAll(() => {
  if (originalZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalZone;
});

const HOUR = 60 * 60 * 1000;
const local = (month: number, day: number, hour = 0, minute = 0, ms = 0) =>
  new Date(2026, month, day, hour, minute, 0, ms).getTime();

function finished(id: string, finishedAt: number | null): Workout {
  return { id, name: id, unit: 'kg', startedAt: 0, finishedAt, exercises: [] };
}

describe('weeklyWorkoutCounts', () => {
  it('uses the pinned daylight-saving zone', () => {
    expect(new Date(local(10, 1)).getTimezoneOffset()).toBe(300);
    expect(new Date(local(10, 8)).getTimezoneOffset()).toBe(360);
  });

  it('returns twelve contiguous zero weeks oldest first for empty history', () => {
    const now = local(10, 4, 12);
    const weeks = weeklyWorkoutCounts([], now);
    expect(weeks).toHaveLength(12);
    expect(weeks.every(week => week.count === 0)).toBe(true);
    expect(weeks.map(week => week.current)).toEqual([...Array(11).fill(false), true]);
    for (let index = 1; index < weeks.length; index++) expect(weeks[index].start).toBe(weeks[index - 1].end);
    expect(weeks[0].start).toBe(local(7, 16));
    expect(weeks[11]).toEqual({ start: local(10, 1), end: local(10, 8), count: 0, current: true });
  });

  it('starts weeks at local Sunday midnight across the autumn and spring clock changes', () => {
    const autumn = weeklyWorkoutCounts([], local(10, 4, 12));
    expect(autumn[11].end - autumn[11].start).toBe(7 * 24 * HOUR + HOUR);
    expect(autumn[10].end - autumn[10].start).toBe(7 * 24 * HOUR);
    const spring = weeklyWorkoutCounts([], local(2, 10, 12));
    expect(spring[11].start).toBe(local(2, 8));
    expect(spring[11].end - spring[11].start).toBe(7 * 24 * HOUR - HOUR);
    for (const week of [...autumn, ...spring]) {
      const start = new Date(week.start);
      expect([start.getDay(), start.getHours(), start.getMinutes()]).toEqual([0, 0, 0]);
    }
  });

  it('counts workouts exactly on week boundaries in the week that begins there', () => {
    const now = local(10, 7, 23, 59);
    const history = [
      finished('current-start', local(10, 1)),
      finished('previous-end', local(10, 1) - 1),
      finished('oldest-start', local(7, 16)),
      finished('before-range', local(7, 16) - 1),
      finished('next-week', local(10, 8)),
      finished('active', null),
    ];
    const weeks = weeklyWorkoutCounts(history, now);
    expect(weeks[11].count).toBe(1);
    expect(weeks[10].count).toBe(1);
    expect(weeks[0].count).toBe(1);
    expect(weeks.reduce((sum, week) => sum + week.count, 0)).toBe(3);
  });

  it('groups by local calendar day rather than UTC date', () => {
    // Saturday 23:30 in Chicago is already Sunday in UTC.
    const saturdayNight = local(9, 31, 23, 30);
    expect(new Date(saturdayNight).getUTCDay()).toBe(0);
    const weeks = weeklyWorkoutCounts([finished('late', saturdayNight), finished('a', local(10, 2)), finished('b', local(10, 3))], local(10, 4));
    expect(weeks[10].count).toBe(1);
    expect(weeks[11].count).toBe(2);
  });

  it('includes a partial current week and keeps history unchanged in any order', () => {
    const history = [finished('b', local(10, 3, 9)), finished('a', local(9, 20, 9))];
    const before = JSON.stringify(history);
    const weeks = weeklyWorkoutCounts(history, local(10, 3, 10), 3);
    expect(weeks.map(week => week.count)).toEqual([1, 0, 1]);
    expect(weeks[2]).toMatchObject({ start: local(10, 1), current: true });
    expect(JSON.stringify(history)).toBe(before);
  });

  it.each([Number.NaN, -1, 1.5, 9e15])('rejects an invalid current time %s', now => {
    expect(() => weeklyWorkoutCounts([], now)).toThrow(WorkoutError);
  });

  it.each([0, -1, 2.5, 521])('rejects an invalid week count %s', weeks => {
    expect(() => weeklyWorkoutCounts([], local(10, 4), weeks)).toThrow(WorkoutError);
  });
});
