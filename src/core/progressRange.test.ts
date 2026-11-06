import { expect, it } from 'vitest';
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
