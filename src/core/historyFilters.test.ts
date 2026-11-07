import { expect, it } from 'vitest';
import type { Workout } from '@/types/workout';
import { filterWorkoutHistory } from './historyFilters';

const filters = { query: '', from: '', to: '' };
function workout(id: string, name: string, finishedAt: number, exercise = 'Bench press'): Workout {
  return { id, name, unit: 'kg', startedAt: finishedAt - 1000, finishedAt,
    exercises: [{ id: `${id}-exercise`, name: exercise, sets: [] }] };
}
const local = (day: number, hour = 12, minute = 0, second = 0, ms = 0) => new Date(2026, 10, day, hour, minute, second, ms).getTime();

it('searches workout or exercise names case-insensitively and trims the query', () => {
  const history = [workout('a', 'UPPER day', local(5)), workout('b', 'Lower', local(6), 'Squat')];
  expect(filterWorkoutHistory(history, { ...filters, query: ' upper ' }).workouts.map(w => w.id)).toEqual(['a']);
  expect(filterWorkoutHistory(history, { ...filters, query: 'BENCH' }).workouts.map(w => w.id)).toEqual(['a']);
  expect(filterWorkoutHistory(history, { ...filters, query: 'missing' }).workouts).toEqual([]);
  expect(filterWorkoutHistory(history, { ...filters, query: '  ' }).workouts.map(w => w.id)).toEqual(['b', 'a']);
});

it('includes the entire local completion date and excludes adjacent dates', () => {
  const history = [workout('before', 'Day', local(4, 23, 59, 59, 999)),
    workout('start', 'Day', local(5, 0)), workout('end', 'Day', local(5, 23, 59, 59, 999)),
    workout('after', 'Day', local(6, 0))];
  expect(filterWorkoutHistory(history, { ...filters, from: '2026-11-05', to: '2026-11-05' }).workouts.map(w => w.id)).toEqual(['end', 'start']);
});

it('combines search with either or both completion-date bounds, ignoring start dates', () => {
  const history = [workout('a', 'Upper', local(4)), workout('b', 'Upper', local(5)),
    { ...workout('c', 'Upper', local(6)), startedAt: local(3) }, workout('d', 'Lower', local(6), 'Squat')];
  expect(filterWorkoutHistory(history, { ...filters, query: 'upper', from: '2026-11-05' }).workouts.map(w => w.id)).toEqual(['c', 'b']);
  expect(filterWorkoutHistory(history, { ...filters, query: 'upper', to: '2026-11-05' }).workouts.map(w => w.id)).toEqual(['b', 'a']);
  expect(filterWorkoutHistory(history, { query: 'upper', from: '2026-11-05', to: '2026-11-06' }).workouts.map(w => w.id)).toEqual(['c', 'b']);
});

it('validates reversed ranges without silently swapping dates', () => {
  const result = filterWorkoutHistory([], { ...filters, from: '2026-11-06', to: '2026-11-05' });
  expect(result.error).toBe('From date must be on or before To date.');
  expect(result.workouts).toEqual([]);
});

it.each(['2026-02-30', 'invalid', '2026-1-05'])('rejects malformed date %s', from => {
  expect(filterWorkoutHistory([], { ...filters, from }).error).toBe('Enter a valid From date.');
  expect(filterWorkoutHistory([], { ...filters, to: from }).error).toBe('Enter a valid To date.');
});

it('keeps stable newest-first order without changing saved objects or input order', () => {
  const a = Object.freeze(workout('a', 'A', local(5)));
  const b = Object.freeze(workout('b', 'B', local(6)));
  const c = Object.freeze(workout('c', 'C', local(6)));
  const history = Object.freeze([a, b, c]);
  const result = filterWorkoutHistory(history, filters);
  expect(result.error).toBeNull();
  expect(result.workouts).toEqual([b, c, a]);
  expect(result.workouts[0]).toBe(b);
  expect(history).toEqual([a, b, c]);
});

it('gracefully excludes workouts without a finished timestamp', () => {
  const unfinished: Workout = { id: 'unfin', name: 'In progress', unit: 'kg', startedAt: local(5), finishedAt: null, exercises: [] };
  const history = [workout('a', 'Done', local(5)), unfinished];
  const result = filterWorkoutHistory(history, filters);
  expect(result.workouts.map(w => w.id)).toEqual(['a']);
});
