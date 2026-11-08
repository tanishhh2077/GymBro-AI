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

  describe('additional edge cases', () => {
    it('accurately distinguishes Sunday midnight from preceding Saturday 23:59:59.999', () => {
      // 2026-11-01 is Sunday in Chicago.
      const satNight = local(10, 0, 23, 59, 999);
      const sunMidnight = local(10, 1, 0, 0, 0);
      const sunEnd = local(10, 1, 23, 59, 999);

      const history = [
        finished('sat', satNight),
        finished('sun-start', sunMidnight),
        finished('sun-end', sunEnd),
      ];

      // now on Sunday afternoon
      const weeks = weeklyWorkoutCounts(history, local(10, 1, 14, 0), 2);
      expect(weeks).toHaveLength(2);
      // Sat night belongs to previous week (index 0)
      expect(weeks[0].count).toBe(1);
      // Sun midnight and Sun end both belong to current week (index 1)
      expect(weeks[1].count).toBe(2);
    });

    it('determines the same week range whether now is Sunday, Monday, Wednesday, or Saturday', () => {
      // Week of Sunday Nov 1, 2026 through Sunday Nov 8, 2026
      const sun = local(10, 1, 10);
      const mon = local(10, 2, 10);
      const wed = local(10, 4, 10);
      const sat = local(10, 7, 23);

      const wSun = weeklyWorkoutCounts([], sun, 1)[0];
      const wMon = weeklyWorkoutCounts([], mon, 1)[0];
      const wWed = weeklyWorkoutCounts([], wed, 1)[0];
      const wSat = weeklyWorkoutCounts([], sat, 1)[0];

      expect(wSun.start).toBe(local(10, 1));
      expect(wSun.end).toBe(local(10, 8));
      expect(wMon).toEqual(wSun);
      expect(wWed).toEqual(wSun);
      expect(wSat).toEqual(wSun);
    });

    it('counts multiple workouts on the same day and at identical timestamps', () => {
      const day = local(10, 3);
      const history = [
        finished('morning', day + 9 * HOUR),
        finished('afternoon', day + 14 * HOUR),
        finished('evening-1', day + 20 * HOUR),
        finished('evening-2', day + 20 * HOUR),
      ];
      const weeks = weeklyWorkoutCounts(history, local(10, 4), 1);
      expect(weeks[0].count).toBe(4);
    });

    it('counts finished workouts with empty exercises or empty sets', () => {
      const emptyExercises: Workout = {
        id: 'no-ex',
        name: 'Empty',
        unit: 'kg',
        startedAt: 0,
        finishedAt: local(10, 3),
        exercises: [],
      };
      const emptySets: Workout = {
        id: 'no-sets',
        name: 'No sets',
        unit: 'kg',
        startedAt: 0,
        finishedAt: local(10, 4),
        exercises: [{ id: 'e1', name: 'Bench', sets: [] }],
      };
      const unfinished: Workout = {
        id: 'unfinished',
        name: 'Active',
        unit: 'kg',
        startedAt: 0,
        finishedAt: null,
        exercises: [],
      };

      const weeks = weeklyWorkoutCounts([emptyExercises, emptySets, unfinished], local(10, 4), 1);
      expect(weeks[0].count).toBe(2);
    });

    it('places timestamps around DST transition boundaries correctly', () => {
      // Spring forward: Sunday March 8, 2026. 2:00 AM -> 3:00 AM.
      // 01:30 is before jump; 03:30 is after jump.
      const springHistory = [
        finished('pre-jump', local(2, 8, 1, 30)),
        finished('post-jump', local(2, 8, 3, 30)),
      ];
      const springWeeks = weeklyWorkoutCounts(springHistory, local(2, 10), 1);
      expect(springWeeks[0].count).toBe(2);
      expect(springWeeks[0].end - springWeeks[0].start).toBe(167 * HOUR);

      // Fall back: Sunday Nov 1, 2026. 2:00 AM -> 1:00 AM.
      const fallHistory = [
        finished('fall-1', local(10, 1, 1, 15)),
        finished('fall-2', local(10, 1, 3, 15)),
      ];
      const fallWeeks = weeklyWorkoutCounts(fallHistory, local(10, 3), 1);
      expect(fallWeeks[0].count).toBe(2);
      expect(fallWeeks[0].end - fallWeeks[0].start).toBe(169 * HOUR);
    });

    it('handles exact range endpoints (first inclusive, last exclusive)', () => {
      const now = local(10, 4);
      const weeks = weeklyWorkoutCounts([], now, 4);
      const first = weeks[0].start;
      const last = weeks[3].end;

      const history = [
        finished('at-first', first),
        finished('before-first', first - 1),
        finished('before-last', last - 1),
        finished('at-last', last),
      ];

      const counts = weeklyWorkoutCounts(history, now, 4);
      expect(counts[0].count).toBe(1);
      expect(counts[3].count).toBe(1);
      expect(counts.reduce((sum, w) => sum + w.count, 0)).toBe(2);
    });

    it('supports 1 week and maximum 520 weeks', () => {
      const single = weeklyWorkoutCounts([], local(10, 4), 1);
      expect(single).toHaveLength(1);
      expect(single[0].current).toBe(true);

      const max = weeklyWorkoutCounts([], local(10, 4), 520);
      expect(max).toHaveLength(520);
      expect(max[519].current).toBe(true);
      expect(max[0].current).toBe(false);
      // All weeks contiguous
      for (let i = 1; i < max.length; i++) {
        expect(max[i].start).toBe(max[i - 1].end);
      }
    });

    it('accepts valid timestamp extremes (0 and 8.64e15)', () => {
      const atZero = weeklyWorkoutCounts([], 0, 1);
      expect(atZero).toHaveLength(1);
      expect(atZero[0].current).toBe(true);

      const atMax = weeklyWorkoutCounts([], 8.64e15, 1);
      expect(atMax).toHaveLength(1);
      expect(atMax[0].current).toBe(true);
    });
  });
});
