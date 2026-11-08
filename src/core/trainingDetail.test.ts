import { expect, it } from 'vitest';
import type { Workout, WorkoutData, WorkoutGoal, WorkoutRoutine } from '@/types/workout';
import { emptyWorkoutData, validateWorkoutData } from './workouts';
import { createWorkoutBackup, mergeWorkoutBackup, parseWorkoutBackup } from './workoutBackup';
import { mergeWorkoutSync, syncSnapshot } from './workoutSync';

function workout(finishedAt: number | null = 20, id = 'w'): Workout {
  return { id, name: 'Upper', unit: 'kg', startedAt: 10, finishedAt, exercises: [
    { id: `${id}-a`, name: 'Bench press', superset: 'g1', sets: [{ id: `${id}-s1`, reps: 5, weight: 60, rpe: 8.5 }] },
    { id: `${id}-b`, name: 'Pull-up', superset: 'g1', bodyweight: true, sets: [{ id: `${id}-s2`, reps: 8, weight: -20, rpe: 7 }] },
    { id: `${id}-c`, name: 'Dip', bodyweight: true, sets: [{ id: `${id}-s3`, reps: 10, weight: 15 }] },
  ] };
}
function routine(): WorkoutRoutine {
  return { id: 'r', name: 'Upper', unit: 'kg', exercises: [
    { id: 're1', name: 'Bench press', superset: 'g', targetWeight: 60 }, { id: 're2', name: 'Pull-up', superset: 'g', bodyweight: true },
  ] };
}
function goal(overrides: Partial<WorkoutGoal> = {}): WorkoutGoal {
  return { id: 'goal', name: 'Pull-up', unit: 'kg', bodyweight: true, weight: 10, reps: 5, createdAt: 3, ...overrides };
}
function library(overrides: Partial<WorkoutData> = {}): WorkoutData { return { ...emptyWorkoutData(), ...overrides }; }
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Loose = Record<string, unknown>;
function withSet(change: (set: Loose, exercise: Loose) => void): WorkoutData {
  const data = clone(library({ active: workout(null) }));
  const exercise = data.active!.exercises[0] as unknown as Loose;
  change((exercise.sets as unknown as Loose[])[0], exercise);
  return data;
}

it('starts at schema5 and accepts RPE, supersets, bodyweight loads and goals', () => {
  expect(emptyWorkoutData().version).toBe(6);
  const data = library({ active: workout(null, 'live'), history: [workout()], routines: [routine()],
    goals: [goal(), goal({ id: 'goal2', bodyweight: undefined, name: 'Pull-up', weight: 0 })] });
  delete (data.goals![1] as unknown as Loose).bodyweight;
  expect(validateWorkoutData(data)).toBe(data);
});
it.each([0.5, 10.5, 7.25, 0, '8', null, NaN, Infinity])('rejects RPE %s with a specific message', rpe => {
  expect(() => validateWorkoutData(withSet(set => { set.rpe = rpe; }))).toThrow(/RPE from 1 to 10 in steps of 0\.5/);
});
it.each([1, 1.5, 6.5, 10])('accepts RPE %s', rpe => {
  expect(validateWorkoutData(withSet(set => { set.rpe = rpe; }))).toBeTruthy();
});
it('rejects supersets that have one member, are split or use an invalid group id', () => {
  const lonely = clone(library({ active: workout(null) }));
  delete (lonely.active!.exercises[1] as unknown as Loose).superset;
  expect(() => validateWorkoutData(lonely)).toThrow(/superset/i);
  const split = clone(library({ active: workout(null) }));
  const [first, second, third] = split.active!.exercises;
  (split.active as unknown as unknown as Loose).exercises = [first, third, second];
  expect(split.active!.exercises.map(e => e.superset ?? null)).toEqual(['g1', null, 'g1']);
  expect(() => validateWorkoutData(split)).toThrow(/superset/i);
  for (const superset of ['', 'has space', 5, null, 'x'.repeat(81)]) {
    expect(() => validateWorkoutData(withSet((_set, exercise) => { exercise.superset = superset; }))).toThrow();
  }
  const badRoutine = clone(routine()); (badRoutine.exercises[1] as unknown as Loose).superset = 'other';
  expect(() => validateWorkoutData(library({ routines: [badRoutine] }))).toThrow(/superset/i);
  const threeMember = clone(library({ active: workout(null) }));
  (threeMember.active!.exercises[2] as unknown as Loose).superset = 'g1';
  expect(validateWorkoutData(threeMember)).toBeTruthy();
});
it('allows negative assistance only on bodyweight exercises', () => {
  expect(validateWorkoutData(withSet((set, exercise) => { exercise.bodyweight = true; set.weight = -1000; }))).toBeTruthy();
  expect(() => validateWorkoutData(withSet((set, exercise) => { exercise.bodyweight = true; set.weight = -1000.5; })))
    .toThrow(/added weight from -1000 to 10000/);
  expect(() => validateWorkoutData(withSet((set, exercise) => { exercise.bodyweight = true; set.weight = 10000.5; }))).toThrow();
  expect(() => validateWorkoutData(withSet(set => { set.weight = -1; }))).toThrow(/weight from 0 to 10000/);
  expect(() => validateWorkoutData(withSet((_set, exercise) => { exercise.bodyweight = false; }))).toThrow();
  const routineFlag = clone(routine()); (routineFlag.exercises[0] as unknown as Loose).bodyweight = 'yes';
  expect(() => validateWorkoutData(library({ routines: [routineFlag] }))).toThrow();
});
it('bounds goals and keeps one goal per name, unit and bodyweight setting', () => {
  expect(() => validateWorkoutData(library({ goals: Array.from({ length: 101 }, (_, i) => goal({ id: `g${i}`, name: `E${i}` })) })))
    .toThrow(/100 goals/);
  expect(validateWorkoutData(library({ goals: Array.from({ length: 100 }, (_, i) => goal({ id: `g${i}`, name: `E${i}` })) }))).toBeTruthy();
  expect(() => validateWorkoutData(library({ goals: [goal(), goal({ id: 'other' })] }))).toThrow(/two goals for "Pull-up"/);
  expect(() => validateWorkoutData(library({ goals: [goal(), goal({ name: 'Row' })] }))).toThrow();
  expect(validateWorkoutData(library({ goals: [goal(), goal({ id: 'lb', unit: 'lb' })] }))).toBeTruthy();
  for (const bad of [{ reps: 0 }, { reps: 1001 }, { reps: 2.5 }, { weight: -1001 }, { weight: 10001 }, { createdAt: -1 },
    { name: ' Row' }, { unit: 'st' }, { bodyweight: false }, { extra: 1 }] as unknown as Loose[]) {
    expect(() => validateWorkoutData(library({ goals: [{ ...goal(), ...bad } as WorkoutGoal] }))).toThrow();
  }
  const plain = goal({ weight: -5 }); delete (plain as unknown as Loose).bodyweight;
  expect(() => validateWorkoutData(library({ goals: [plain] }))).toThrow(/weight from 0 to 10000/);
  expect(() => validateWorkoutData(library({ goals: 'none' as never }))).toThrow();
});
it.each([1, 2, 3, 4])('rejects every schema5 field in schema%s and rejects future versions', version => {
  const fields: WorkoutData[] = [withSet(set => { set.rpe = 8; }), withSet((_s, e) => { e.bodyweight = true; }), library({ goals: [goal()] })];
  const grouped = clone(library({ active: workout(null) }));
  for (const exercise of grouped.active!.exercises as unknown as Loose[]) { delete exercise.bodyweight; for (const set of exercise.sets as unknown as Loose[]) { delete set.rpe; set.weight = 1; } }
  fields.push(grouped, library({ routines: [{ ...routine(), exercises: [{ id: 'x', name: 'Dip', bodyweight: true }] }] }));
  for (const value of fields) expect(() => validateWorkoutData({ ...value, version })).toThrow();
  const future = { ...library(), version: 7 };
  expect(() => validateWorkoutData(future)).toThrow();
  expect(future.version).toBe(7);
});
it('reads strict schema4 by changing only its version digit, including at the exact size cap', () => {
  const legacy = { version: 4, revision: 2, active: null, history: [] as unknown[] };
  expect(validateWorkoutData(legacy)).toEqual({ ...legacy, version: 6 });
  expect(legacy.version).toBe(4);
  const record = (index: number) => ({ id: `w-${index}`, name: 'W', unit: 'kg', startedAt: 1, finishedAt: 2, note: 'n',
    exercises: [{ id: `e-${index}`, name: 'E', targetWeight: 1, sets: Array.from({ length: 100 }, (_, i) => ({ id: `s-${i}`, reps: 1, weight: 1, kind: 'warmup' })) }] });
  const full = { version: 4, revision: 9, active: null, history: [record(0)] };
  while (JSON.stringify(full).length < 1_000_000) full.history.push(record(full.history.length));
  while (JSON.stringify(full).length > 1_000_000) full.history[full.history.length - 1].exercises[0].sets.pop();
  const last = full.history[full.history.length - 1];
  last.name += 'x'.repeat(Math.min(79, 1_000_000 - JSON.stringify(full).length));
  last.exercises[0].name += 'x'.repeat(Math.min(79, 1_000_000 - JSON.stringify(full).length));
  expect(JSON.stringify(full).length).toBe(1_000_000);
  const normalized = validateWorkoutData(full);
  expect(normalized.version).toBe(6);
  expect(JSON.stringify(normalized).length).toBe(1_000_000);
  expect(full.version).toBe(4);
});
it('round-trips every schema5 field through backup and treats field-only differences as conflicts', () => {
  const data = library({ history: [workout()], routines: [routine()], goals: [goal()] });
  const backup = parseWorkoutBackup(createWorkoutBackup(data, 1));
  expect(backup.data).toEqual(data);
  expect(mergeWorkoutBackup(emptyWorkoutData(), backup)).toMatchObject({ data: { ...data, revision: 0 }, addedGoals: 1, addedWorkouts: 1, addedRoutines: 1 });
  expect(mergeWorkoutBackup(data, backup)).toMatchObject({ data, duplicates: 3, addedGoals: 0 });
  const changes: ((value: Loose) => void)[] = [
    value => { ((value.history as unknown as Loose[])[0].exercises as unknown as Loose[])[0].sets = [{ id: 'w-s1', reps: 5, weight: 60, rpe: 9 }]; },
    value => { delete ((value.history as unknown as Loose[])[0].exercises as unknown as Loose[])[2].bodyweight; },
    value => { for (const e of ((value.history as unknown as Loose[])[0].exercises as unknown as Loose[]).slice(0, 2)) e.superset = 'g2'; },
    value => { (((value.routines as unknown as Loose[])[0].exercises as unknown as Loose[])[1]).bodyweight = undefined; },
    value => { (value.goals as unknown as Loose[])[0].reps = 6; },
    value => { (value.goals as unknown as Loose[])[0].createdAt = 4; },
  ];
  for (const change of changes) {
    const edited = clone(data) as unknown as Loose; change(edited);
    expect(() => mergeWorkoutBackup(validateWorkoutData(JSON.parse(JSON.stringify(edited))), backup)).toThrow(/conflict/i);
  }
  // A goal for the same exercise is skipped rather than refusing the whole restore.
  expect(mergeWorkoutBackup(library({ goals: [goal({ id: 'mine' })] }), backup)).toMatchObject({ skippedGoals: 1, addedGoals: 0 });
});
it('adds backup goals to a library without goals and still restores schema4 backups', () => {
  const backup = parseWorkoutBackup(createWorkoutBackup(library({ goals: [goal()] }), 1));
  const result = mergeWorkoutBackup(library({ history: [workout()] }), backup);
  expect(result).toMatchObject({ addedGoals: 1, addedWorkouts: 0, duplicates: 0 });
  expect(result.data.goals).toEqual([goal()]);
  const legacy = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 0, data: { version: 4, revision: 3, active: null, history: [] } };
  expect(mergeWorkoutBackup(library({ goals: [goal()] }), parseWorkoutBackup(JSON.stringify(legacy))).data.version).toBe(6);
});
it('merges goals through sync as records and exposes concurrent goal edits', () => {
  const base = library({ history: [workout()], goals: [goal()] });
  expect(syncSnapshot(base)).toEqual(base);
  const added = mergeWorkoutSync(base, library({ history: [workout()], goals: [goal(), goal({ id: 'row', name: 'Row' })] }),
    library({ history: [workout()], goals: [goal(), goal({ id: 'dip', name: 'Dip' })] }));
  expect(added.conflicts).toEqual([]);
  expect(added.data.goals!.map(g => g.id).sort()).toEqual(['dip', 'goal', 'row']);
  const device = library({ history: [workout()], goals: [goal({ reps: 6 })] });
  const cloud = library({ history: [workout()], goals: [goal({ reps: 7 })] });
  expect(mergeWorkoutSync(base, device, cloud)).toMatchObject({ conflicts: [], goalConflicts: [{ key: 'goal/goal', name: 'Pull-up', device: { reps: 6 }, cloud: { reps: 7 } }] });
  expect(mergeWorkoutSync(base, device, cloud, { 'goal/goal': 'cloud' }).data.goals![0].reps).toBe(7);
  expect(mergeWorkoutSync(base, library({ history: [workout()], goals: [] }), base).data.goals).toEqual([]);
  const rpe = clone(base) as unknown as Loose; (((rpe.history as unknown as Loose[])[0].exercises as unknown as Loose[])[0].sets as unknown as Loose[])[0].rpe = 6;
  expect(mergeWorkoutSync(base, rpe as unknown as WorkoutData, clone(base) as WorkoutData).data.history[0].exercises[0].sets[0].rpe).toBe(6);
});
it('offers a choice when two devices created goals for the same exercise', () => {
  const device = library({ goals: [goal({ id: 'one', weight: 10 })] });
  const cloud = library({ goals: [goal({ id: 'two', weight: 20 })] });
  const open = mergeWorkoutSync(library(), device, cloud);
  expect(open.goalConflicts).toEqual([{ key: 'goal-key/["Pull-up","kg",true]', name: 'Pull-up',
    device: device.goals![0], cloud: cloud.goals![0] }]);
  const keepCloud = mergeWorkoutSync(library(), device, cloud, { 'goal-key/["Pull-up","kg",true]': 'cloud' });
  expect(keepCloud.goalConflicts).toEqual([]);
  expect(keepCloud.data.goals).toEqual([cloud.goals![0]]);
  const keepDevice = mergeWorkoutSync(library(), device, cloud, { 'goal-key/["Pull-up","kg",true]': 'device' });
  expect(keepDevice.data.goals).toEqual([device.goals![0]]);
});

it('skips a backup goal for an exercise that already has a goal instead of refusing the restore', () => {
  const current = library({ goals: [goal({ id: 'mine', weight: 10 })] });
  const backup = parseWorkoutBackup(createWorkoutBackup(library({ history: [workout()], goals: [goal({ id: 'theirs', weight: 30 })] }), 1));
  const merged = mergeWorkoutBackup(current, backup);
  expect(merged.data.goals).toEqual(current.goals);
  expect(merged.data.history).toHaveLength(1);
  expect(merged).toMatchObject({ addedWorkouts: 1, addedGoals: 0, skippedGoals: 1 });
});

it('allows an assisted (negative) target weight only on a bodyweight routine exercise', () => {
  const assisted = library({ routines: [{ id: 'r', name: 'Pull', unit: 'kg', exercises: [
    { id: 'e', name: 'Pull-up', bodyweight: true, targetWeight: -20 }] }] });
  expect(validateWorkoutData(assisted).routines![0].exercises[0].targetWeight).toBe(-20);
  const plain = library({ routines: [{ id: 'r', name: 'Pull', unit: 'kg', exercises: [{ id: 'e', name: 'Row', targetWeight: -20 }] }] });
  expect(() => validateWorkoutData(plain)).toThrow(/target weight from 0 to 10000/);
  const tooLow = library({ routines: [{ id: 'r', name: 'Pull', unit: 'kg', exercises: [
    { id: 'e', name: 'Pull-up', bodyweight: true, targetWeight: -1001 }] }] });
  expect(() => validateWorkoutData(tooLow)).toThrow(/-1000 to 10000/);
});
