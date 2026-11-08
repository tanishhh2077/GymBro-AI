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

it('preserves Unicode and emojis across exercise names, workout names, notes and routines', () => {
  const source: WorkoutData = {
    ...emptyWorkoutData(),
    history: [{
      id: 'w_unicode',
      name: 'Développé couché 💪',
      unit: 'kg',
      startedAt: 1000,
      finishedAt: 2000,
      note: 'Felt strong today! 🏋️‍♂️ Multi-line note\nAccents: café & crêpes.',
      exercises: [{
        id: 'e_unicode',
        name: 'ベンチプレス',
        sets: [{ id: 's_1', reps: 5, weight: 100 }],
      }],
    }],
    routines: [{
      id: 'r_unicode',
      name: 'Legs 🦵',
      unit: 'kg',
      exercises: [{ id: 're_1', name: 'Squat 🏋️' }],
    }],
  };
  const text = createWorkoutCsv(source);
  expect(text).toContain('Développé couché 💪');
  expect(text).toContain('ベンチプレス');
  const lines = text.split('\r\n');
  expect(lines[1]).toBe(
    'w_unicode,Développé couché 💪,1970-01-01T00:00:01.000Z,1970-01-01T00:00:02.000Z,' +
    'e_unicode,ベンチプレス,s_1,1,kg,5,100,regular,,no',
  );
});

it('escapes commas, double quotes and embedded newlines according to RFC 4180', () => {
  const source: WorkoutData = {
    ...emptyWorkoutData(),
    history: [{
      id: 'w_rfc',
      name: 'Push, "Heavy"\r\nDay',
      unit: 'lb',
      startedAt: 5000,
      finishedAt: 6000,
      note: 'Notes with commas, "quotes", and line breaks\nNext workout: add 5lb',
      exercises: [{
        id: 'e_rfc',
        name: 'Bench, "Pause"\nPress',
        sets: [{ id: 's_rfc', reps: 5, weight: 225 }],
      }],
    }],
  };
  const text = createWorkoutCsv(source);
  expect(text).toContain('"Push, ""Heavy""\r\nDay"');
  expect(text).toContain('"Bench, ""Pause""\nPress"');
  expect(text).toContain(
    'w_rfc,"Push, ""Heavy""\r\nDay",1970-01-01T00:00:05.000Z,1970-01-01T00:00:06.000Z,' +
    'e_rfc,"Bench, ""Pause""\nPress",s_rfc,1,lb,5,225,regular,,no',
  );
});

it.each([' =SUM(A1)', '  @SUM', '\t+cmd', '\r-alert'])(
  'rejects formula-leading names with leading whitespace %j before export',
  name => {
    const source = data();
    const record = source.history[0];
    expect(() => createWorkoutCsv({ ...source, history: [{ ...record, name }] })).toThrow();
  },
);

it.each(['=SUM(A1)', '@SUM', '+cmd', '-alert'])(
  'sanitizes formula-leading names without leading whitespace with apostrophe prefix %j',
  name => {
    const source = data();
    const record = source.history[0];
    const text = createWorkoutCsv({ ...source, history: [{ ...record, name }] });
    expect(text).toContain(`'${name}`);
  },
);

it('handles assisted bodyweight exercises with negative weight and rejects negative weight on standard exercises', () => {
  const source = data();
  const text = createWorkoutCsv({
    ...source,
    history: [{
      ...source.history[0],
      name: 'Assisted Work',
      exercises: [{
        id: 'pullup',
        name: 'Assisted Pull-up',
        bodyweight: true,
        sets: [
          { id: 's_assist_1', reps: 8, weight: -15 },
          { id: 's_assist_2', reps: 10, weight: -22.5 },
          { id: 's_bw', reps: 5, weight: 0 },
          { id: 's_weighted', reps: 3, weight: 20 },
        ],
      }],
    }],
  });
  const lines = text.split('\r\n');
  expect(lines[1]).toContain(',-15,regular,,yes');
  expect(lines[2]).toContain(',-22.5,regular,,yes');
  expect(lines[3]).toContain(',0,regular,,yes');
  expect(lines[4]).toContain(',20,regular,,yes');
  expect(text).not.toContain("'-15");
  expect(text).not.toContain("'-22.5");

  expect(() => createWorkoutCsv({
    ...source,
    history: [{
      ...source.history[0],
      exercises: [{
        id: 'bench',
        name: 'Bench Press',
        sets: [{ id: 's_bad', reps: 5, weight: -10 }],
      }],
    }],
  })).toThrow();
});

it('emits blank for unrecorded RPE, formats valid 1-10 RPE, and rejects invalid RPE including 0', () => {
  const source = data();
  const text = createWorkoutCsv({
    ...source,
    history: [{
      ...source.history[0],
      exercises: [{
        id: 'squat',
        name: 'Squat',
        sets: [
          { id: 's_norpe', reps: 5, weight: 100 },
          { id: 's_rpe1', reps: 5, weight: 100, rpe: 1 },
          { id: 's_rpe85', reps: 5, weight: 120, rpe: 8.5 },
          { id: 's_rpe10', reps: 1, weight: 150, rpe: 10 },
        ],
      }],
    }],
  });
  const lines = text.split('\r\n');
  expect(lines[1]).toContain(',100,regular,,no');
  expect(lines[2]).toContain(',100,regular,1,no');
  expect(lines[3]).toContain(',120,regular,8.5,no');
  expect(lines[4]).toContain(',150,regular,10,no');

  expect(() => createWorkoutCsv({
    ...source,
    history: [{
      ...source.history[0],
      exercises: [{
        id: 'e',
        name: 'Squat',
        sets: [{ id: 's', reps: 5, weight: 100, rpe: 0 }],
      }],
    }],
  })).toThrow();

  expect(() => createWorkoutCsv({
    ...source,
    history: [{
      ...source.history[0],
      exercises: [{
        id: 'e',
        name: 'Squat',
        sets: [{ id: 's', reps: 5, weight: 100, rpe: 10.5 }],
      }],
    }],
  })).toThrow();

  expect(() => createWorkoutCsv({
    ...source,
    history: [{
      ...source.history[0],
      exercises: [{
        id: 'e',
        name: 'Squat',
        sets: [{ id: 's', reps: 5, weight: 100, rpe: 7.3 }],
      }],
    }],
  })).toThrow();
});

it('exports only the RFC 4180 header line when history contains zero workouts', () => {
  const empty = emptyWorkoutData();
  const text = createWorkoutCsv(empty);
  const expectedHeader =
    'workout_id,workout_name,started_at,finished_at,exercise_id,exercise_name,' +
    'set_id,set_number,unit,reps,weight,kind,rpe,bodyweight\r\n';
  expect(text).toBe(expectedHeader);
  const lines = text.split('\r\n');
  expect(lines).toEqual([
    'workout_id,workout_name,started_at,finished_at,exercise_id,exercise_name,set_id,set_number,unit,reps,weight,kind,rpe,bodyweight',
    '',
  ]);
});

it('generates CSV for 1,000 workouts within the 1-2 second performance boundary', () => {
  const workouts = Array.from({ length: 1000 }, (_, i) => ({
    id: `w_${i}`,
    name: `Workout ${i}`,
    unit: 'kg' as const,
    startedAt: 1000000 + i * 3600000,
    finishedAt: 1000000 + i * 3600000 + 3600000,
    exercises: [{
      id: `e_${i}`,
      name: 'Bench Press',
      sets: [
        { id: `s_${i}_1`, reps: 5, weight: 100, kind: 'regular' as const, rpe: 8 },
        { id: `s_${i}_2`, reps: 5, weight: 100, kind: 'regular' as const, rpe: 8.5 },
      ],
    }],
  }));

  const mockLibrary: WorkoutData = {
    ...emptyWorkoutData(),
    history: workouts,
  };

  const start = performance.now();
  const csv = createWorkoutCsv(mockLibrary);
  const elapsedMs = performance.now() - start;

  const lines = csv.split('\r\n');
  expect(lines).toHaveLength(2002);
  expect(elapsedMs).toBeLessThan(2000);
  expect(lines[0]).toBe(
    'workout_id,workout_name,started_at,finished_at,exercise_id,exercise_name,' +
    'set_id,set_number,unit,reps,weight,kind,rpe,bodyweight',
  );
  expect(lines[1]).toContain('w_0,Workout 0,');
  expect(lines[2000]).toContain('w_999,Workout 999,');

  const tooManyWorkouts = [
    ...workouts,
    {
      id: 'w_1001',
      name: 'Excess Workout',
      unit: 'kg' as const,
      startedAt: 99999999,
      finishedAt: 99999999 + 3600000,
      exercises: [{
        id: 'e_1001',
        name: 'Bench Press',
        sets: [{ id: 's_1001', reps: 5, weight: 100 }],
      }],
    },
  ];
  expect(() => createWorkoutCsv({ ...emptyWorkoutData(), history: tooManyWorkouts })).toThrow();
});
