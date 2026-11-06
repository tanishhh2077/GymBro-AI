import { expect, it } from 'vitest';
import type { Workout, WorkoutData } from '@/types/workout';
import { emptyWorkoutData } from './workouts';
import { summarizeTrainingWeek } from './weeklyTrainingSummary';

const end = Date.UTC(2026, 10, 6, 18);
const week = 7 * 24 * 60 * 60 * 1000;
function workout(id: string, finishedAt: number, unit: 'kg' | 'lb' = 'kg'): Workout {
  return { id, name: 'Synthetic workout', unit, startedAt: finishedAt - 60000, finishedAt,
    exercises: [{ id: 'e', name: 'Bench', sets: [
      { id: 'warm', reps: 10, weight: 0, kind: 'warmup' },
      { id: 'set', reps: 3, weight: 22.125 },
    ] }] };
}
it('includes both rolling-window endpoints and warm-ups, separates units and excludes older/future/active records', () => {
  const source: WorkoutData = { ...emptyWorkoutData(), history: [
    workout('start', end - week), workout('end', end, 'lb'),
    workout('old', end - week - 1), workout('future', end + 1),
  ], active: { ...workout('active', end), finishedAt: null } };
  const before = JSON.stringify(source);
  expect(summarizeTrainingWeek(source, end)).toEqual({ from: end - week, to: end,
    workouts: 2, sets: 4, durationMs: 120000, volume: { lb: 66.375, kg: 66.375 } });
  expect(JSON.stringify(source)).toBe(before);
});
it('reports empty and real zero-load totals without invented values', () => {
  expect(summarizeTrainingWeek(emptyWorkoutData(), end)).toMatchObject({ workouts: 0, sets: 0, durationMs: 0, volume: { lb: 0, kg: 0 } });
  const record = workout('zero', end);
  expect(summarizeTrainingWeek({ ...emptyWorkoutData(), history: [{ ...record, startedAt: end,
    exercises: [{ id: 'e', name: 'Row', sets: [{ id: 's', reps: 5, weight: 0 }] }] }] }, end))
    .toMatchObject({ workouts: 1, sets: 1, durationMs: 0, volume: { lb: 0, kg: 0 } });
});
it('rejects malformed data and invalid window clocks', () => {
  expect(() => summarizeTrainingWeek({ ...emptyWorkoutData(), media: 'private' } as never, end)).toThrow();
  for (const value of [NaN, Infinity, -1, 1.5, 8.64e15 + 1]) {
    expect(() => summarizeTrainingWeek(emptyWorkoutData(), value)).toThrow();
  }
});
