import { expect, it } from 'vitest';
import { summarizeWorkout, workoutDuration } from './workoutSummary';
import type { Workout } from '@/types/workout';

const workout = (): Workout => ({ id: 'w', name: 'Upper', unit: 'kg', startedAt: 1000, finishedAt: 181000,
  exercises: [{ id: 'e', name: 'Bench press', sets: [
    { id: 'warm', reps: 10, weight: 20, kind: 'warmup' }, { id: 'work', reps: 8, weight: 60.5 },
  ] }] });
it('derives elapsed time, exercise and set counts and entered-load volume', () => {
  expect(summarizeWorkout(workout())).toEqual({ durationMs: 180000, exercises: 1, sets: 2,
    regular: 1, warmups: 1, volume: 684, bodyweightSets: 0, unit: 'kg' });
});
it('keeps zero loads and zero elapsed time as actual saved values', () => {
  const source = workout();
  const result = summarizeWorkout({ ...source, unit: 'lb', finishedAt: source.startedAt,
    exercises: [{ ...source.exercises[0], sets: [{ id: 's', reps: 10, weight: 0 }] }] });
  expect(result).toMatchObject({ durationMs: 0, volume: 0, unit: 'lb', regular: 1 });
});
it('rejects active, malformed and backwards-clock sources', () => {
  expect(() => summarizeWorkout({ ...workout(), finishedAt: null })).toThrow();
  expect(() => summarizeWorkout({ ...workout(), finishedAt: 999 })).toThrow();
  expect(() => summarizeWorkout({ ...workout(), video: 'private' } as never)).toThrow();
});
it.each([[0, '0s'], [59999, '59s'], [60000, '1m 0s'], [3661000, '1h 1m 1s']])('formats elapsed milliseconds %s', (value, label) => {
  expect(workoutDuration(value as number)).toBe(label);
});

it('leaves bodyweight exercises out of load volume and counts their sets separately', () => {
  const source = workout();
  const result = summarizeWorkout({ ...source, exercises: [...source.exercises,
    { id: 'p', name: 'Pull-up', bodyweight: true, sets: [{ id: 'assist', reps: 8, weight: -20 }, { id: 'only', reps: 6, weight: 0 },
      { id: 'added', reps: 5, weight: 10 }] }] });
  expect(result).toMatchObject({ sets: 5, regular: 4, warmups: 1, volume: 684, bodyweightSets: 3 });
  expect(summarizeWorkout(source).bodyweightSets).toBe(0);
});
