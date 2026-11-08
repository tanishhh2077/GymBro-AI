import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, expect, it } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import type { WorkoutData } from '@/types/workout';
import type { BodyEntry } from '@/types/body';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

let repository: ReturnType<typeof createWorkoutRepository>;
let ids: number;
async function open(data: Partial<WorkoutData> = {}) {
  await repository.save(0, { ...emptyWorkoutData(), ...data });
  const store = createWorkoutStore(repository, { id: () => `id-${++ids}`, now: () => 1000 });
  await store.getState().load();
  return store;
}
async function rejected(promise: Promise<{ ok: boolean }>, message: RegExp) {
  const result = await promise;
  expect(result.ok).toBe(false);
  expect((result as unknown as { message: string }).message).toMatch(message);
}
beforeEach(() => { repository = createWorkoutRepository(new IDBFactory()); ids = 0; });

it('adds, updates and deletes body entries with normalized input', async () => {
  const store = await open(), s = store.getState();
  expect(await s.addBodyEntry({ date: 86_400_000, weight: 80.5, unit: 'kg', measurements: { waist: 82, chest: undefined },
    lengthUnit: 'cm', note: '  Morning.\r\nBefore food.  ' })).toEqual({ ok: true });
  expect((await repository.load()).bodyLog).toEqual([{ id: 'id-1', date: 86_400_000, weight: 80.5, unit: 'kg',
    measurements: { waist: 82 }, lengthUnit: 'cm', note: 'Morning.\nBefore food.' }]);
  // A form's unit selectors are dropped when their values are blank.
  expect(await s.addBodyEntry({ date: 1, weight: 170, unit: 'lb', measurements: {}, lengthUnit: 'in', note: '   ' })).toEqual({ ok: true });
  expect((await repository.load()).bodyLog![1]).toEqual({ id: 'id-2', date: 1, weight: 170, unit: 'lb' });
  const revision = store.getState().data.revision;
  expect(await s.updateBodyEntry('id-1', revision, { date: 86_400_000, measurements: { neck: 38 }, lengthUnit: 'in' })).toEqual({ ok: true });
  expect((await repository.load()).bodyLog![0]).toEqual({ id: 'id-1', date: 86_400_000, measurements: { neck: 38 }, lengthUnit: 'in' });
  const same = store.getState().data.revision;
  expect(await s.updateBodyEntry('id-1', same, { date: 86_400_000, measurements: { neck: 38 }, lengthUnit: 'in' })).toEqual({ ok: true });
  expect(store.getState().data.revision).toBe(same);
  await rejected(s.updateBodyEntry('id-1', revision, { date: 2, weight: 80, unit: 'kg' }), /Body log changed. Reopen this entry/);
  await rejected(s.updateBodyEntry('missing', same, { date: 2, weight: 80, unit: 'kg' }), /no longer available/);
  expect(await s.deleteBodyEntry('id-2')).toEqual({ ok: true });
  expect((await repository.load()).bodyLog!.map(e => e.id)).toEqual(['id-1']);
  await rejected(s.deleteBodyEntry('id-2'), /no longer available/);
});
it.each([
  [{ date: 1 }, /body weight or at least one measurement/],
  [{ date: 1, weight: 80 }, /kg or lb for the body weight/],
  [{ date: 1, weight: 0, unit: 'kg' }, /greater than 0 and at most 1000/],
  [{ date: 1, weight: Number.NaN, unit: 'kg' }, /greater than 0 and at most 1000/],
  [{ date: 1, measurements: { waist: 82 } }, /cm or in for the measurements/],
  [{ date: 1, measurements: { waist: 501 }, lengthUnit: 'cm' }, /greater than 0 and at most 500/],
  [{ date: 1, measurements: { waist: null }, lengthUnit: 'cm' }, /greater than 0 and at most 500/],
  [{ date: 1, measurements: { calf: 40 }, lengthUnit: 'cm' }, /Unknown body measurement "calf"/],
  [{ date: -5, weight: 80, unit: 'kg' }, /valid date/],
  [{ date: 1, weight: 80, unit: 'kg', note: 'x'.repeat(501) }, /500 characters/],
  [{ date: 1, weight: 80, unit: 'kg', note: 7 }, /note as text/],
  [null, /date and a body weight or measurement/],
])('refuses invalid body entry %o before writing', async (input, message) => {
  const store = await open();
  const before = await repository.load();
  await rejected(store.getState().addBodyEntry(input as never), message);
  expect(await repository.load()).toEqual(before);
});
it('refuses the 1001st body entry with a clear message', async () => {
  const full: BodyEntry[] = Array.from({ length: 1000 }, (_, i) => ({ id: `b${i}`, date: i, weight: 80, unit: 'kg' }));
  const store = await open({ bodyLog: full });
  await rejected(store.getState().addBodyEntry({ date: 5, weight: 80, unit: 'kg' }), /already has 1000 entries. Delete an old entry/);
});
it('sets, replaces, keeps and removes exact-name exercise notes', async () => {
  const store = await open(), s = store.getState();
  expect(await s.setExerciseNote(' Bench press ', '  Tuck elbows.\r\n\tDrive feet.  ')).toEqual({ ok: true });
  expect((await repository.load()).exerciseNotes).toEqual({ 'Bench press': 'Tuck elbows.\n\tDrive feet.' });
  const revision = store.getState().data.revision;
  expect(await s.setExerciseNote('Bench press', 'Tuck elbows.\n\tDrive feet.')).toEqual({ ok: true });
  expect(store.getState().data.revision).toBe(revision);
  expect(await s.setExerciseNote('bench press', 'Other case.')).toEqual({ ok: true });
  expect(Object.keys((await repository.load()).exerciseNotes!)).toEqual(['Bench press', 'bench press']);
  await rejected(s.setExerciseNote('Bench press', 'Stale', revision), /Exercise notes changed. Reopen the note/);
  expect(await s.setExerciseNote('Bench press', '   ', store.getState().data.revision)).toEqual({ ok: true });
  expect((await repository.load()).exerciseNotes).toEqual({ 'bench press': 'Other case.' });
  expect(await s.setExerciseNote('__proto__', 'Odd name.')).toEqual({ ok: true });
  expect(Object.prototype.hasOwnProperty.call((await repository.load()).exerciseNotes, '__proto__')).toBe(true);
  expect(await s.setExerciseNote('Missing', '')).toEqual({ ok: true });
  await rejected(s.setExerciseNote('', 'Note'), /name with 1 to 80 characters/);
  await rejected(s.setExerciseNote('Row', 'x'.repeat(501)), /exercise note to 500 characters/);
  await rejected(s.setExerciseNote('Row', 'a\u0007b'), /control characters from the exercise note/);
  await rejected(s.setExerciseNote('Row', 5 as never), /note as text/);
});
it('refuses a note for a 201st exercise but still edits existing notes', async () => {
  const notes = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`Exercise ${i}`, 'Note']));
  const store = await open({ exerciseNotes: notes });
  await rejected(store.getState().setExerciseNote('Another', 'Note'), /notes for 200 exercises. Remove one/);
  expect(await store.getState().setExerciseNote('Exercise 0', 'Changed')).toEqual({ ok: true });
});
it('refuses to confirm sync while a body or note conflict is unresolved', async () => {
  const base = { ...emptyWorkoutData(), bodyLog: [{ id: 'b', date: 1, weight: 80, unit: 'kg' as const }], exerciseNotes: { Row: 'Base.' } };
  const local = { ...base, bodyLog: [{ ...base.bodyLog[0], weight: 81 }], exerciseNotes: { Row: 'Mine.' } };
  const remote = { ...base, bodyLog: [{ ...base.bodyLog[0], weight: 82 }], exerciseNotes: { Row: 'Theirs.' } };
  let written: WorkoutData | null = null;
  const cloud = { read: async () => ({ revision: 4, data: remote }),
    write: async (_revision: number, data: WorkoutData) => { written = data; return { revision: 5, data }; } };
  await repository.save(0, local);
  await repository.saveSync(1, { ...local, revision: 1 }, { revision: 3, data: base });
  const store = createWorkoutStore(repository, { id: () => `id-${++ids}`, now: () => 1000 });
  await store.getState().load();
  const preview = await store.getState().previewSync(cloud);
  await rejected(store.getState().confirmSync(preview, { 'body/b': 'cloud' }, cloud), /Choose a version for each conflict/);
  await rejected(store.getState().confirmSync(preview, { 'note/Row': 'cloud' }, cloud), /Choose a version for each conflict/);
  expect(written).toBeNull();
  expect(await store.getState().confirmSync(preview, { 'body/b': 'cloud', 'note/Row': 'device' }, cloud)).toEqual({ ok: true });
  expect((await repository.load())).toMatchObject({ bodyLog: [{ weight: 82 }], exerciseNotes: { Row: 'Mine.' } });
});
