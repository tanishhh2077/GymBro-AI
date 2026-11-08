import { describe, expect, it } from 'vitest';
import { parseWorkoutImport } from './workoutImport';
import { emptyWorkoutData } from './workouts';
import { mergeWorkoutBackup } from './workoutBackup';
const options = { unit: 'kg' as const, utcOffsetMinutes: 0 };
const strong = 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n2025-01-02 18:00:00,Upper,45m,Bench Press,1,60,8,0,0,,,8';
const hevy = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe\nUpper,"25 Aug 2025, 09:38","25 Aug 2025, 10:54",,Bench Press,,,0,warmup,45,8,,0,6';
const fitnotes = 'Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time\n2025-01-02,Bench Press,Chest,60,kgs,8,,,';
describe('clean-room workout exports', () => {
  it('requires explicit Strong units and parses weighted sets', () => {
    expect(() => parseWorkoutImport(strong, { utcOffsetMinutes: 0 })).toThrow(/unit/i);
    const result = parseWorkoutImport(strong, options);
    expect(result.format).toBe('Strong');
    expect(result.backup.data.history[0]).toMatchObject({ unit: 'kg', finishedAt: Date.UTC(2025, 0, 2, 18, 45) });
    expect(result.backup.data.history[0].exercises[0].sets[0]).toMatchObject({ weight: 60, reps: 8, rpe: 8 });
  });
  it('reads Hevy explicit pounds and warmups', () => {
    const result = parseWorkoutImport(hevy, options);
    expect(result.backup.data.history[0]).toMatchObject({ unit: 'lb' });
    expect(result.backup.data.history[0].exercises[0].sets[0].kind).toBe('warmup');
  });
  it('reads observed FitNotes Android weighted rows with date-only warning', () => {
    const result = parseWorkoutImport(fitnotes, options);
    expect(result.format).toBe('FitNotes Android'); expect(result.warnings.join(' ')).toMatch(/duration/i);
  });
  it('handles quoted commas, doubled quotes and embedded newlines', () => {
    const result = parseWorkoutImport(strong.replace('Upper,45m', '"Upper, ""A""",45m').replace(',,,8', ',"note\nline",,8'), options);
    expect(result.backup.data.history[0].name).toBe('Upper, "A"');
    expect(result.backup.data.history[0].exercises[0].name).toBe('Bench Press');
  });
  it('keeps stable IDs across repeated and expanded exports and rejects changed saved sessions', () => {
    const first = parseWorkoutImport(strong, options).backup;
    const saved = mergeWorkoutBackup(emptyWorkoutData(), first).data;
    expect(mergeWorkoutBackup(saved, parseWorkoutImport(strong, options).backup).addedWorkouts).toBe(0);
    expect(() => mergeWorkoutBackup(saved, parseWorkoutImport(strong.replace(',60,8,', ',70,8,'), options).backup)).toThrow(/conflict/i);
  });
  it.each([
    ['broken quoting', strong + '"'], ['date rollover', strong.replace('2025-01-02', '2025-02-30')],
    ['bodyweight', strong.replace(',60,8,', ',0,8,')], ['assisted', strong.replace('Bench Press', 'Pull Up (Assisted)')],
    ['timed', strong.replace(',0,0,,,8', ',0,30,,,8')], ['invalid reps', strong.replace(',60,8,', ',60,1.5,')],
    ['unknown kind', hevy.replace(',warmup,', ',dropset,')], ['invalid units', fitnotes.replace(',kgs,', ',stones,')],
    ['unrecognized headers', 'foo,bar\n1,2'], ['row shape', strong + ',oops'],
  ])('rejects %s without producing partial records', (_name, text) => { expect(() => parseWorkoutImport(text, options)).toThrow(); });
  it('warns about omitted notes and category metadata', () => {
    const result = parseWorkoutImport(strong.replace(',,,8', ',my note,,8'), options);
    expect(result.warnings.join(' ')).toMatch(/notes/i);
  });
  it('rejects size and row bounds', () => {
    expect(() => parseWorkoutImport('x'.repeat(4 * 1024 * 1024 + 1), options)).toThrow(/MiB/);
    expect(() => parseWorkoutImport('a\n'.repeat(10002), options)).toThrow(/rows/i);
  });
});
it('imports the observed FitNotes Android 25.1 explicit-unit export', () => {
  const csv = 'Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time\n2025-01-02,Bench Press,Chest,60,kgs,8,,,';
  const result = parseWorkoutImport(csv, options);
  expect(result.format).toBe('FitNotes Android'); expect(result.backup.data.history[0].unit).toBe('kg');
});
it.each(['Synthetic\u0000 upper', 'Synthetic\u202E upper', 'Synthetic\u2066 upper'])('rejects invisible name controls %s', name => {
  expect(() => parseWorkoutImport(strong.replace('Upper', name), options)).toThrow(/name/i);
  expect(() => parseWorkoutImport(strong.replace('Bench Press', name), options)).toThrow(/name/i);
});

it('rejects unverified metric Hevy header variants', () => {
  expect(() => parseWorkoutImport(hevy.replace('weight_lbs', 'weight_kg'), options)).toThrow(/variant/i);
});
it('rejects missing Strong duration rather than inventing zero elapsed time', () => {
  expect(() => parseWorkoutImport(strong.replace(',45m,', ',,'), options)).toThrow(/duration/i);
});
