import { describe, expect, it } from 'vitest';
import type { Workout } from '@/types/workout';
import { filterProgressHistory, progressRangeStart, type ProgressPeriod } from './progressRange';

it.each<[ProgressPeriod, number[], number[]]>([
  ['month', [2026, 2, 31], [2026, 1, 28]],
  ['month', [2024, 2, 31], [2024, 1, 29]],
  ['month', [2026, 4, 31], [2026, 3, 30]],
  ['month', [2026, 0, 31], [2025, 11, 31]],
  ['three-months', [2026, 4, 31], [2026, 1, 28]],
  ['six-months', [2024, 7, 31], [2024, 1, 29]],
  ['three-months', [2026, 0, 6], [2025, 9, 6]],
  ['six-months', [2026, 0, 6], [2025, 6, 6]],
  ['month', [2026, 10, 6], [2026, 9, 6]],
  ['month', [2026, 3, 8], [2026, 2, 8]],
])('starts %s at local midnight, clamping the day for %j', (period, today, expected) => {
  const [year, month, day] = today;
  const [startYear, startMonth, startDay] = expected;
  expect(progressRangeStart(period, new Date(year, month, day, 15, 43).getTime()))
    .toBe(new Date(startYear, startMonth, startDay).getTime());
});

function workout(id: string, finishedAt: number | null): Workout {
  return { id, finishedAt, startedAt: 0, name: id, unit: 'kg', exercises: [] };
}

it('includes the lower boundary and now, excludes unfinished and future workouts, and leaves inputs unchanged', () => {
  const start = new Date(2026, 9, 6).getTime();
  const now = new Date(2026, 10, 6, 12).getTime();
  const history = Object.freeze([
    workout('before', start - 1), workout('start', start), workout('end', now),
    workout('future', now + 1), workout('active', null),
  ].map(item => Object.freeze(item)));
  const before = JSON.stringify(history);
  const filtered = filterProgressHistory(history, 'month', now);
  expect(filtered.map(item => item.id)).toEqual(['start', 'end']);
  expect(filtered[0]).toBe(history[1]);
  expect(JSON.stringify(history)).toBe(before);
});

it('keeps all-time history unbounded, including valid future-dated saved workouts', () => {
  expect(progressRangeStart('all', Date.now())).toBeNull();
  const history = [workout('epoch', 0), workout('future', 8.64e15)];
  expect(filterProgressHistory(history, 'all', 1000)).toEqual(history);
});

describe('progressRange edge cases', () => {
  it('returns empty array when range excludes everything in history', () => {
    const now = new Date(2026, 5, 15, 12).getTime(); // June 15, 2026
    const start = progressRangeStart('month', now)!; // May 15, 2026

    // All workouts older than start
    const allOlder = [workout('old-1', start - 1000), workout('old-2', start - 1)];
    expect(filterProgressHistory(allOlder, 'month', now)).toEqual([]);

    // All workouts after now
    const allFuture = [workout('fut-1', now + 1), workout('fut-2', now + 1000)];
    expect(filterProgressHistory(allFuture, 'month', now)).toEqual([]);

    // All workouts active (finishedAt: null)
    const allActive = [workout('act-1', null), workout('act-2', null)];
    expect(filterProgressHistory(allActive, 'month', now)).toEqual([]);

    // Empty history
    expect(filterProgressHistory([], 'month', now)).toEqual([]);
  });

  it('handles boundary conditions exactly at start and now', () => {
    const now = new Date(2026, 5, 15, 14, 30).getTime();
    const start = progressRangeStart('month', now)!;

    const history = [
      workout('just-before-start', start - 1),
      workout('exact-start', start),
      workout('exact-now', now),
      workout('just-after-now', now + 1),
    ];

    const result = filterProgressHistory(history, 'month', now);
    expect(result.map(w => w.id)).toEqual(['exact-start', 'exact-now']);
  });

  it('always produces local midnight for progressRangeStart', () => {
    const testDates = [
      new Date(2026, 0, 15, 23, 59, 59, 999).getTime(),
      new Date(2026, 2, 8, 1, 30).getTime(), // DST transition day
      new Date(2026, 10, 1, 1, 30).getTime(),
      new Date(2024, 1, 29, 12, 0).getTime(), // leap year
    ];

    for (const d of testDates) {
      for (const period of ['month', 'three-months', 'six-months'] as const) {
        const start = progressRangeStart(period, d);
        expect(start).not.toBeNull();
        const startDate = new Date(start!);
        expect([
          startDate.getHours(),
          startDate.getMinutes(),
          startDate.getSeconds(),
          startDate.getMilliseconds(),
        ]).toEqual([0, 0, 0, 0]);
      }
    }
  });

  it('handles calendar month length transitions and leap years correctly', () => {
    // Clamping March 29, 30, 31 to Feb 28 in non-leap year (2026)
    for (const day of [28, 29, 30, 31]) {
      const start = progressRangeStart('month', new Date(2026, 2, day, 12).getTime());
      expect(start).toBe(new Date(2026, 1, 28).getTime());
    }

    // March 27 goes to Feb 27
    expect(progressRangeStart('month', new Date(2026, 2, 27, 12).getTime()))
      .toBe(new Date(2026, 1, 27).getTime());

    // Leap year: March 31, 2024 clamps to Feb 29, 2024
    expect(progressRangeStart('month', new Date(2024, 2, 31, 12).getTime()))
      .toBe(new Date(2024, 1, 29).getTime());

    // 3 months back from May 31: Feb 28 in 2026, Feb 29 in 2024
    expect(progressRangeStart('three-months', new Date(2026, 4, 31, 12).getTime()))
      .toBe(new Date(2026, 1, 28).getTime());
    expect(progressRangeStart('three-months', new Date(2024, 4, 31, 12).getTime()))
      .toBe(new Date(2024, 1, 29).getTime());

    // 6 months back from Aug 31: Feb 28 in 2026, Feb 29 in 2024
    expect(progressRangeStart('six-months', new Date(2026, 7, 31, 12).getTime()))
      .toBe(new Date(2026, 1, 28).getTime());
    expect(progressRangeStart('six-months', new Date(2024, 7, 31, 12).getTime()))
      .toBe(new Date(2024, 1, 29).getTime());

    // 30-day month clamping: Oct 31 -> Sep 30, Dec 31 -> Nov 30, Jul 31 -> Jun 30
    expect(progressRangeStart('month', new Date(2026, 9, 31, 12).getTime()))
      .toBe(new Date(2026, 8, 30).getTime());
    expect(progressRangeStart('month', new Date(2026, 11, 31, 12).getTime()))
      .toBe(new Date(2026, 10, 30).getTime());
    expect(progressRangeStart('month', new Date(2026, 6, 31, 12).getTime()))
      .toBe(new Date(2026, 5, 30).getTime());

    // Year rollovers: Jan 1 -> Dec 1 prev year, Jan 31 -> Dec 31 prev year
    expect(progressRangeStart('month', new Date(2026, 0, 1, 12).getTime()))
      .toBe(new Date(2025, 11, 1).getTime());
    expect(progressRangeStart('month', new Date(2026, 0, 31, 12).getTime()))
      .toBe(new Date(2025, 11, 31).getTime());
    expect(progressRangeStart('three-months', new Date(2026, 0, 15, 12).getTime()))
      .toBe(new Date(2025, 9, 15).getTime());
    expect(progressRangeStart('six-months', new Date(2026, 0, 15, 12).getTime()))
      .toBe(new Date(2025, 6, 15).getTime());
  });
});

