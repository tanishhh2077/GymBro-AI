import { expect, it } from 'vitest';
import type { BodyEntry } from '@/types/body';
import type { WorkoutData } from '@/types/workout';
import { BODY_MEASUREMENT_NAMES, emptyWorkoutData, validateWorkoutData } from './workouts';
import { createWorkoutBackup, mergeWorkoutBackup, parseWorkoutBackup } from './workoutBackup';
import { mergeWorkoutSync, syncSnapshot } from './workoutSync';
import { bodyLogNewestFirst, bodyTrend, exerciseNoteFor } from './bodyLog';

type Loose = Record<string, unknown>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function entry(overrides: Partial<BodyEntry> = {}): BodyEntry {
  return { id: 'b1', date: 1_700_000_000_000, weight: 80.5, unit: 'kg', measurements: { waist: 82, leftArm: 35.5 }, lengthUnit: 'cm',
    note: 'Morning, before breakfast.', ...overrides };
}
function library(overrides: Partial<WorkoutData> = {}): WorkoutData { return { ...emptyWorkoutData(), ...overrides }; }
function loose(value: Loose): WorkoutData { return library({ bodyLog: [value as unknown as BodyEntry] }); }

it('starts at schema6 and accepts a body log and exercise notes', () => {
  expect(emptyWorkoutData()).toEqual({ version: 6, revision: 0, active: null, history: [] });
  const data = library({ bodyLog: [entry(), { id: 'b2', date: 2, weight: 1000, unit: 'lb' },
    { id: 'b3', date: 0, measurements: Object.fromEntries(BODY_MEASUREMENT_NAMES.map(name => [name, 500])), lengthUnit: 'in' }],
  exerciseNotes: { 'Bench press': 'Grip: ring finger on the ring.\n\tTuck elbows.', Row: 'x'.repeat(500) } });
  expect(validateWorkoutData(data)).toBe(data);
  expect(validateWorkoutData(library({ bodyLog: [], exerciseNotes: {} }))).toBeTruthy();
  expect(BODY_MEASUREMENT_NAMES).toEqual(['neck', 'chest', 'waist', 'hips', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh']);
});
it.each([
  [{ weight: 0 }, /body weight greater than 0 and at most 1000/],
  [{ weight: 1000.5 }, /body weight greater than 0 and at most 1000/],
  [{ weight: '80' }, /body weight greater than 0/],
  [{ weight: null }, /body weight greater than 0/],
  [{ unit: 'st' }, /kg or lb for the body weight/],
  [{ measurements: { waist: 0 } }, /measurement greater than 0 and at most 500/],
  [{ measurements: { waist: 500.5 } }, /measurement greater than 0 and at most 500/],
  [{ measurements: { waist: '82' } }, /measurement greater than 0/],
  [{ measurements: { calf: 40 } }, /Unknown body measurement "calf"/],
  [{ measurements: {} }, /at least one measurement/],
  [{ measurements: [82] }, /measurements/],
  [{ lengthUnit: 'mm' }, /cm or in for the measurements/],
  [{ date: -1 }, /valid date/],
  [{ date: 1.5 }, /valid date/],
  [{ date: 8.64e15 + 1 }, /valid date/],
  [{ note: '' }, /./],
  [{ note: ' padded' }, /./],
  [{ note: 'x'.repeat(501) }, /body log note to 500 characters/],
  [{ note: 'a\u0007b' }, /control characters from the body log note/],
  [{ note: 'a\rb' }, /control characters from the body log note/],
  [{ note: 'a\uD800b' }, /unsupported characters from the body log note/],
  [{ id: 'bad id' }, /./],
  [{ extra: 1 }, /./],
])('rejects a body entry with %o', (change, message) => {
  expect(() => validateWorkoutData(loose({ ...entry(), ...change }))).toThrow(message);
});
it('requires a unit exactly when its values are present and at least one value per entry', () => {
  const noWeightUnit = { ...entry() } as Loose; delete noWeightUnit.unit;
  expect(() => validateWorkoutData(loose(noWeightUnit))).toThrow(/kg or lb for the body weight/);
  const strayUnit = { ...entry() } as Loose; delete strayUnit.weight;
  expect(() => validateWorkoutData(loose(strayUnit))).toThrow(/kg or lb only with a body weight/);
  const noLengthUnit = { ...entry() } as Loose; delete noLengthUnit.lengthUnit;
  expect(() => validateWorkoutData(loose(noLengthUnit))).toThrow(/cm or in for the measurements/);
  const strayLength = { ...entry() } as Loose; delete strayLength.measurements;
  expect(() => validateWorkoutData(loose(strayLength))).toThrow(/cm or in only with measurements/);
  expect(() => validateWorkoutData(loose({ id: 'b', date: 1, note: 'Only a note' }))).toThrow(/body weight or at least one measurement/);
  expect(validateWorkoutData(loose({ id: 'b', date: 1, weight: 0.1, unit: 'lb' }))).toBeTruthy();
  expect(validateWorkoutData(loose({ id: 'b', date: 1, measurements: { neck: 0.1 }, lengthUnit: 'cm' }))).toBeTruthy();
});
it('bounds the body log at 1000 entries with unique IDs', () => {
  const many = (count: number) => library({ bodyLog: Array.from({ length: count }, (_, i) => ({ id: `b${i}`, date: i, weight: 80, unit: 'kg' as const })) });
  expect(validateWorkoutData(many(1000))).toBeTruthy();
  expect(() => validateWorkoutData(many(1001))).toThrow(/up to 1000 body log entries/);
  expect(() => validateWorkoutData(library({ bodyLog: [entry(), entry({ date: 5 })] }))).toThrow();
  expect(() => validateWorkoutData(library({ bodyLog: { b1: entry() } as never }))).toThrow(/1000 body log entries/);
});
it.each([
  [{ 'Bench press': '' }, /./],
  [{ 'Bench press': ' padded' }, /./],
  [{ 'Bench press': 'x'.repeat(501) }, /exercise note to 500 characters/],
  [{ 'Bench press': 'a\u0000b' }, /control characters from the exercise note/],
  [{ 'Bench press': 'a\u009fb' }, /control characters from the exercise note/],
  [{ 'Bench press': '\uDC00' }, /unsupported characters from the exercise note/],
  [{ 'Bench press': 5 }, /./],
  [{ 'Bench press': null }, /./],
  [{ ' Bench press': 'Note' }, /exercise name/],
  [{ '': 'Note' }, /exercise name/],
  [{ ['x'.repeat(81)]: 'Note' }, /exercise name/],
])('rejects exercise notes %o', (notes, message) => {
  expect(() => validateWorkoutData(library({ exerciseNotes: notes as never }))).toThrow(message);
});
it('bounds exercise notes at 200 names and rejects a non-object map', () => {
  const notes = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`Exercise ${i}`, 'Note']));
  expect(validateWorkoutData(library({ exerciseNotes: notes(200) }))).toBeTruthy();
  expect(() => validateWorkoutData(library({ exerciseNotes: notes(201) }))).toThrow(/notes for up to 200 exercises/);
  for (const value of [[], 'note', null, 5]) expect(() => validateWorkoutData(library({ exerciseNotes: value as never }))).toThrow();
  // Prototype-like names are ordinary own keys after JSON parsing.
  const odd = JSON.parse('{"version":6,"revision":0,"active":null,"history":[],"exerciseNotes":{"__proto__":"A","constructor":"B"}}') as WorkoutData;
  expect(exerciseNoteFor(validateWorkoutData(odd), '__proto__')).toBe('A');
  expect(exerciseNoteFor(odd, 'constructor')).toBe('B');
  expect(exerciseNoteFor(library(), 'constructor')).toBeNull();
  expect(exerciseNoteFor(library({ exerciseNotes: { Row: 'n' } }), 'row')).toBeNull();
});
it.each([1, 2, 3, 4, 5])('rejects schema6 fields in schema%s and rejects future versions', version => {
  expect(() => validateWorkoutData({ ...library({ bodyLog: [entry()] }), version })).toThrow();
  expect(() => validateWorkoutData({ ...library({ bodyLog: [] }), version })).toThrow();
  expect(() => validateWorkoutData({ ...library({ exerciseNotes: { Row: 'n' } }), version })).toThrow();
  expect(() => validateWorkoutData({ ...library(), version: 7 })).toThrow();
});
it('reads strict schema5 by changing only its version digit, including at the exact size cap', () => {
  const legacy = { version: 5, revision: 2, active: null, history: [] as unknown[], goals: [] };
  expect(validateWorkoutData(legacy)).toEqual({ ...legacy, version: 6 });
  expect(legacy.version).toBe(5);
  const record = (index: number) => ({ id: `w-${index}`, name: 'W', unit: 'kg', startedAt: 1, finishedAt: 2, note: 'n',
    exercises: [{ id: `e-${index}`, name: 'E', sets: Array.from({ length: 100 }, (_, i) => ({ id: `s-${i}`, reps: 1, weight: 1, rpe: 8 })) }] });
  const full = { version: 5, revision: 9, active: null, history: [record(0)] };
  while (JSON.stringify(full).length < 1_000_000) full.history.push(record(full.history.length));
  while (JSON.stringify(full).length > 1_000_000) full.history[full.history.length - 1].exercises[0].sets.pop();
  const last = full.history[full.history.length - 1];
  last.name += 'x'.repeat(Math.min(79, 1_000_000 - JSON.stringify(full).length));
  last.exercises[0].name += 'x'.repeat(Math.min(79, 1_000_000 - JSON.stringify(full).length));
  expect(JSON.stringify(full).length).toBe(1_000_000);
  const normalized = validateWorkoutData(full);
  expect(normalized.version).toBe(6);
  expect(JSON.stringify(normalized).length).toBe(1_000_000);
  expect(full.version).toBe(5);
});

it('charts one stored unit at a time, sorted by date, and lists other-unit entries with a reason', () => {
  const entries: BodyEntry[] = [
    { id: 'c', date: 30, weight: 81, unit: 'kg' },
    { id: 'a', date: 10, weight: 80, unit: 'kg', measurements: { waist: 82 }, lengthUnit: 'cm' },
    { id: 'b', date: 20, weight: 178, unit: 'lb', measurements: { waist: 32.5 }, lengthUnit: 'in' },
    { id: 'd', date: 30, weight: 80.8, unit: 'kg' },
    { id: 'e', date: 40, measurements: { neck: 38 }, lengthUnit: 'cm' },
  ];
  const kg = bodyTrend(entries, 'weight', { start: null }, 'kg');
  expect(kg).toEqual({ key: 'weight', unit: 'kg', points: [
    { id: 'a', date: 10, value: 80 }, { id: 'c', date: 30, value: 81 }, { id: 'd', date: 30, value: 80.8 }],
  excluded: [{ id: 'b', date: 20, value: 178, unit: 'lb', reason: 'different-unit' }], units: ['kg', 'lb'] });
  expect(bodyTrend(entries, 'weight', { start: null }, 'lb').points).toEqual([{ id: 'b', date: 20, value: 178 }]);
  // Without a chosen unit the latest entry's unit is used; values are never converted.
  expect(bodyTrend(entries, 'weight', { start: null }).unit).toBe('kg');
  expect(bodyTrend(entries, 'waist', { start: null })).toMatchObject({ unit: 'in', points: [{ id: 'b', value: 32.5 }],
    excluded: [{ id: 'a', unit: 'cm', reason: 'different-unit' }] });
  expect(bodyTrend(entries, 'weight', { start: 15, end: 30 }, 'kg').points.map(p => p.id)).toEqual(['c', 'd']);
  expect(bodyTrend(entries, 'hips', { start: null })).toEqual({ key: 'hips', unit: null, points: [], excluded: [], units: [] });
  expect(() => bodyTrend(entries, 'calf' as never, { start: null })).toThrow(/body measurement/);
  expect(() => bodyTrend(entries, 'weight', { start: null }, 'cm')).toThrow(/kg or lb/);
  expect(() => bodyTrend(entries, 'waist', { start: null }, 'kg')).toThrow(/cm or in/);
  expect(bodyLogNewestFirst(entries).map(e => e.id)).toEqual(['e', 'd', 'c', 'b', 'a']);
  expect(entries.map(e => e.id)).toEqual(['c', 'a', 'b', 'd', 'e']);
});

it('round-trips body entries and notes through backup and reports added and skipped counts', () => {
  const data = library({ bodyLog: [entry()], exerciseNotes: { 'Bench press': 'Tuck elbows.', Row: 'Pause.' } });
  const backup = parseWorkoutBackup(createWorkoutBackup(data, 1));
  expect(backup.data).toEqual(data);
  expect(mergeWorkoutBackup(emptyWorkoutData(), backup)).toMatchObject({ data, addedBodyEntries: 1, addedExerciseNotes: 2,
    skippedExerciseNotes: 0, duplicates: 0 });
  expect(mergeWorkoutBackup(data, backup)).toMatchObject({ data, addedBodyEntries: 0, addedExerciseNotes: 0, duplicates: 3 });
  // A different note for the same exercise keeps the saved note and is reported, like goals.
  const mine = library({ exerciseNotes: { 'Bench press': 'My cue.' } });
  const merged = mergeWorkoutBackup(mine, backup);
  expect(merged.data.exerciseNotes).toEqual({ 'Bench press': 'My cue.', Row: 'Pause.' });
  expect(merged).toMatchObject({ addedExerciseNotes: 1, skippedExerciseNotes: 1, addedBodyEntries: 1, duplicates: 0 });
  for (const change of [{ weight: 81 }, { unit: 'lb' }, { date: 5 }, { note: 'Evening.' }, { measurements: { waist: 83, leftArm: 35.5 } },
    { measurements: { waist: 82, rightArm: 35.5 } }, { lengthUnit: 'in' }] as Partial<BodyEntry>[]) {
    expect(() => mergeWorkoutBackup(library({ bodyLog: [entry(change)] }), backup)).toThrow(/Backup conflict for a body log entry/);
  }
  const strip = entry(); delete (strip as unknown as Loose).note;
  expect(() => mergeWorkoutBackup(library({ bodyLog: [strip] }), backup)).toThrow(/conflict/);
});
it('restores schema5 backups into a schema6 library and keeps an empty body log field', () => {
  const legacy = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 0, data: { version: 5, revision: 3, active: null, history: [],
    goals: [{ id: 'g', name: 'Row', unit: 'kg', weight: 50, reps: 5, createdAt: 1 }] } };
  const current = library({ bodyLog: [], exerciseNotes: {} });
  const result = mergeWorkoutBackup(current, parseWorkoutBackup(JSON.stringify(legacy)));
  expect(result.data).toEqual({ ...current, goals: legacy.data.goals });
  expect(result).toMatchObject({ addedGoals: 1, addedBodyEntries: 0, addedExerciseNotes: 0 });
  expect(() => mergeWorkoutBackup(library({ bodyLog: Array.from({ length: 1000 }, (_, i) => entry({ id: `x${i}` })) }),
    parseWorkoutBackup(createWorkoutBackup(library({ bodyLog: [entry()] }), 1)))).toThrow(/1000 body log entries/);
});

it('merges body entries and notes through sync and exposes concurrent edits as choosable conflicts', () => {
  const base = library({ bodyLog: [entry()], exerciseNotes: { Row: 'Pause.' } });
  expect(syncSnapshot(base)).toEqual(base);
  const added = mergeWorkoutSync(base, library({ bodyLog: [entry(), entry({ id: 'dev' })], exerciseNotes: { Row: 'Pause.', Dip: 'Lean.' } }),
    library({ bodyLog: [entry(), entry({ id: 'cld' })], exerciseNotes: { Row: 'Pause.', Squat: 'Brace.' } }));
  expect(added).toMatchObject({ conflicts: [], goalConflicts: [], bodyConflicts: [], noteConflicts: [] });
  expect(added.data.bodyLog!.map(e => e.id).sort()).toEqual(['b1', 'cld', 'dev']);
  expect(added.data.exerciseNotes).toEqual({ Row: 'Pause.', Dip: 'Lean.', Squat: 'Brace.' });
  const device = library({ bodyLog: [entry({ weight: 81 })], exerciseNotes: { Row: 'Mine.' } });
  const cloud = library({ bodyLog: [entry({ weight: 82 })], exerciseNotes: { Row: 'Theirs.' } });
  const open = mergeWorkoutSync(base, device, cloud);
  expect(open.bodyConflicts).toEqual([{ key: 'body/b1', date: entry().date, device: device.bodyLog![0], cloud: cloud.bodyLog![0] }]);
  expect(open.noteConflicts).toEqual([{ key: 'note/Row', name: 'Row', device: 'Mine.', cloud: 'Theirs.' }]);
  const chosen = mergeWorkoutSync(base, device, cloud, { 'body/b1': 'cloud', 'note/Row': 'device' });
  expect(chosen).toMatchObject({ bodyConflicts: [], noteConflicts: [] });
  expect(chosen.data.bodyLog).toEqual(cloud.bodyLog);
  expect(chosen.data.exerciseNotes).toEqual({ Row: 'Mine.' });
  // One side deletes while the other edits: still a choice, never a silent loss.
  const removed = mergeWorkoutSync(base, library({ bodyLog: [], exerciseNotes: {} }), cloud);
  expect(removed.bodyConflicts).toEqual([{ key: 'body/b1', date: entry().date, device: null, cloud: cloud.bodyLog![0] }]);
  expect(removed.noteConflicts).toEqual([{ key: 'note/Row', name: 'Row', device: null, cloud: 'Theirs.' }]);
  expect(mergeWorkoutSync(base, library({ bodyLog: [], exerciseNotes: {} }), base).data).toMatchObject({ bodyLog: [], exerciseNotes: {} });
  // Both sides set the same new note for an exercise: no conflict.
  expect(mergeWorkoutSync(library(), library({ exerciseNotes: { Dip: 'Lean.' } }), library({ exerciseNotes: { Dip: 'Lean.' } })).noteConflicts).toEqual([]);
  // A schema5 cloud without the new fields keeps the device's body log and notes.
  const legacyCloud = { version: 5, revision: 0, active: null, history: [] } as unknown as WorkoutData;
  expect(mergeWorkoutSync(library(), base, legacyCloud).data).toEqual(base);
  const odd = clone(base) as unknown as Loose; Object.defineProperty(odd.exerciseNotes, 'constructor', { value: 'Own.', enumerable: true, writable: true, configurable: true });
  expect(mergeWorkoutSync(base, odd as unknown as WorkoutData, base).data.exerciseNotes).toEqual({ Row: 'Pause.', constructor: 'Own.' });
});
