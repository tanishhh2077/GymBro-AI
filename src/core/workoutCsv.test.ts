import { expect, it } from 'vitest';
import type { WorkoutData } from '@/types/workout';
import { emptyWorkoutData } from './workouts';
import { createWorkoutCsv } from './workoutCsv';

function data(): WorkoutData {
  return { ...emptyWorkoutData(), history: [{ id: 'w', name: 'Upper, "A"\nDay', unit: 'kg', startedAt: 1000, finishedAt: 2000,
    exercises: [{ id: 'e', name: '=HYPERLINK("test")', targetReps: 99, sets: [
      { id: 's', reps: 3, weight: 22.125 }, { id: 'warm', reps: 5, weight: 0, kind: 'warmup' },
    ] }] }], active: { id: 'active', name: 'Active', unit: 'lb', startedAt: 3000, finishedAt: null,
    exercises: [{ id: 'a', name: 'Row', sets: [{ id: 'as', reps: 9, weight: 50 }] }] } };
}
it('exports completed actual sets with precision, identities, timestamps, units, kinds and RFC4180 escaping', () => {
  const source = data(); const before = JSON.stringify(source);
  const text = createWorkoutCsv(source);
  expect(text).toBe('workout_id,workout_name,started_at,finished_at,exercise_id,exercise_name,set_id,set_number,unit,reps,weight,kind,rpe,bodyweight\r\n' +
    'w,"Upper, ""A""\nDay",1970-01-01T00:00:01.000Z,1970-01-01T00:00:02.000Z,e,"\'=HYPERLINK(""test"")",s,1,kg,3,22.125,regular,,no\r\n' +
    'w,"Upper, ""A""\nDay",1970-01-01T00:00:01.000Z,1970-01-01T00:00:02.000Z,e,"\'=HYPERLINK(""test"")",warm,2,kg,5,0,warmup,,no\r\n');
  expect(JSON.stringify(source)).toBe(before);
  expect(text).not.toContain('active'); expect(text).not.toContain('99');
});
it.each(['=SUM(1)', '+1', '-1', '@test'])('protects spreadsheet formula-leading names %j', name => {
  const source = data();
  const record = source.history[0];
  const text = createWorkoutCsv({ ...source, history: [{ ...record, name }] });
  expect(text).toContain(`'${name}`);
});
it('uses stable chronological order with source-order ties and preserves exercise/set order', () => {
  const source = data(); const record = source.history[0];
  const text = createWorkoutCsv({ ...source, history: [
    { ...record, id: 'later', finishedAt: 3000 }, { ...record, id: 'first' }, { ...record, id: 'tie' },
  ] });
  expect(text.indexOf('first,')).toBeLessThan(text.indexOf('tie,'));
  expect(text.indexOf('tie,')).toBeLessThan(text.indexOf('later,'));
});
it('emits just a header for empty history and rejects unknown data before export', () => {
  expect(createWorkoutCsv(emptyWorkoutData()).split('\r\n')).toHaveLength(2);
  expect(() => createWorkoutCsv({ ...data(), account: 'private' } as never)).toThrow();
});

it('exports RPE and the bodyweight setting, keeping assisted weights as negative numbers', () => {
  const source = data();
  const text = createWorkoutCsv({ ...source, history: [{ ...source.history[0], name: 'Pulls', exercises: [
    { id: 'p', name: 'Pull-up', bodyweight: true, sets: [{ id: 'a', reps: 8, weight: -20, rpe: 8.5 }, { id: 'b', reps: 6, weight: 0 }] },
  ] }] });
  const lines = text.split('\r\n');
  expect(lines[0].endsWith(',weight,kind,rpe,bodyweight')).toBe(true);
  expect(lines[1].endsWith(',kg,8,-20,regular,8.5,yes')).toBe(true);
  expect(lines[2].endsWith(',kg,6,0,regular,,yes')).toBe(true);
});
