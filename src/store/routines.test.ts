import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { WorkoutError } from '@/core/workouts';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

let repository: ReturnType<typeof createWorkoutRepository>;
let ids: number;
const input = () => ({ name: ' Upper day ', unit: 'kg' as const, exercises: [
  { name: ' Bench press ', targetSets: 3, targetReps: 8 }, { name: 'Row' },
] });
const makeStore = () => createWorkoutStore(repository, { id: () => `id-${++ids}`, now: () => 1000 });
beforeEach(() => { repository = createWorkoutRepository(new IDBFactory()); ids = 0; });
afterEach(() => vi.restoreAllMocks());
async function saved() {
  const store = makeStore(); await store.getState().load();
  expect(await store.getState().createRoutine(input())).toEqual({ ok: true });
  return store;
}
it('saves trimmed routine names, order, units and optional targets, then reloads them', async () => {
  const store = await saved();
  const reopened = makeStore(); await reopened.getState().load();
  expect(reopened.getState().data.routines).toEqual(store.getState().data.routines);
  expect(reopened.getState().data.routines?.[0]).toMatchObject({ name: 'Upper day', unit: 'kg', exercises: [
    { name: 'Bench press', targetSets: 3, targetReps: 8 }, { name: 'Row' },
  ] });
  expect(Object.prototype.hasOwnProperty.call(reopened.getState().data.routines![0].exercises[1], 'targetSets')).toBe(false);
});
it('starts new snapshots with fresh IDs, copied order and targets, and zero actual sets every time', async () => {
  const store = await saved(), a = store.getState();
  const template = a.data.routines![0];
  expect(await a.startRoutine(template.id)).toEqual({ ok: true });
  const first = store.getState().data.active!;
  expect(first).toMatchObject({ name: 'Upper day', unit: 'kg', startedAt: 1000, finishedAt: null });
  expect(first.exercises.map(e => e.name)).toEqual(['Bench press', 'Row']);
  expect(first.exercises[0]).toMatchObject({ targetSets: 3, targetReps: 8, sets: [] });
  expect(first.exercises[0].id).not.toBe(template.exercises[0].id);
  await a.addSet(first.exercises[0].id, 5, 20); await a.addSet(first.exercises[1].id, 6, 15);
  await a.finishWorkout(); await a.startRoutine(template.id);
  const second = store.getState().data.active!;
  expect(second.id).not.toBe(first.id); expect(second.exercises[0].id).not.toBe(first.exercises[0].id);
  expect(second.exercises.every(e => e.sets.length === 0)).toBe(true);
  expect(store.getState().data.history[0].exercises[0].sets).toHaveLength(1);
  expect(store.getState().data.routines![0]).toEqual(template);
});
it('edits and deletes templates without rewriting an active snapshot or history', async () => {
  const store = await saved(), a = store.getState(), template = a.data.routines![0];
  await a.startRoutine(template.id); const original = structuredClone(store.getState().data.active);
  const changed = { name: 'Changed', unit: 'lb' as const, exercises: [{ name: 'Different', targetReps: 12 }] };
  expect(await a.updateRoutine(template.id, store.getState().data.revision, changed)).toEqual({ ok: true });
  expect(store.getState().data.active).toEqual(original);
  expect(store.getState().data.routines![0]).toMatchObject({ id: template.id, name: 'Changed', unit: 'lb' });
  await a.deleteRoutine(template.id); expect(store.getState().data.active).toEqual(original);
  expect((await repository.load()).routines).toEqual([]);
});
it('refuses to replace the active workout or count targets as finished sets', async () => {
  const store = await saved(), a = store.getState(), id = a.data.routines![0].id;
  await a.startRoutine(id); const before = store.getState().data;
  expect((await a.startRoutine(id)).ok).toBe(false);
  expect((await a.finishWorkout()).ok).toBe(false);
  expect(store.getState().data).toBe(before);
});
it('rejects invalid or missing routine actions without a write', async () => {
  const store = await saved(), a = store.getState(), before = store.getState().data;
  expect((await a.createRoutine({ ...input(), exercises: [{ name: 'Bench', targetReps: 0 }] })).ok).toBe(false);
  expect((await a.updateRoutine('missing', before.revision, input())).ok).toBe(false);
  expect((await a.deleteRoutine('missing')).ok).toBe(false);
  expect((await a.startRoutine('missing')).ok).toBe(false);
  expect(store.getState().data).toBe(before);
});
it('rejects stale tabs and still refuses a stale editor snapshot after library reload', async () => {
  const first = await saved(), second = makeStore(); await second.getState().load();
  const baseline = second.getState().data.revision, id = first.getState().data.routines![0].id;
  await first.getState().updateRoutine(id, baseline, { ...input(), name: 'First tab edit' });
  expect((await second.getState().updateRoutine(id, baseline, { ...input(), name: 'Stale edit' })).ok).toBe(false);
  expect(second.getState().needsReload).toBe(true);
  await second.getState().load();
  const result = await second.getState().updateRoutine(id, baseline, { ...input(), name: 'Stale edit' });
  expect(result).toMatchObject({ ok: false });
  expect(!result.ok && result.message).toMatch(/reopen/i);
  expect(second.getState().data.routines![0].name).toBe('First tab edit');
});
it('does not expose a failed save or delete as successful and requires reload', async () => {
  const store = await saved(), a = store.getState(), before = a.data;
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  expect((await a.deleteRoutine(before.routines![0].id)).ok).toBe(false);
  expect(store.getState().data).toBe(before); expect(store.getState().needsReload).toBe(true);
});

it('duplicates the current routine with independent IDs and preserves workouts and source', async () => {
  const store = await saved(), a = store.getState(), source = a.data.routines![0];
  await a.startRoutine(source.id);
  for (const exercise of store.getState().data.active!.exercises) await a.addSet(exercise.id, 5, 20);
  await a.finishWorkout(); await a.startRoutine(source.id);
  const before = structuredClone(store.getState().data);
  expect(a.duplicateRoutine).toBeTypeOf('function');
  expect(await a.duplicateRoutine(source.id)).toEqual({ ok: true });
  const data = store.getState().data, copy = data.routines![1];
  expect(copy).toMatchObject({ name: 'Upper day (copy)', unit: 'kg', exercises: [
    { name: 'Bench press', targetSets: 3, targetReps: 8 }, { name: 'Row' },
  ] });
  expect(copy.id).not.toBe(source.id);
  expect(copy.exercises.map(e => e.id).some(id => source.exercises.some(e => e.id === id))).toBe(false);
  expect(copy.exercises[1]).not.toHaveProperty('targetSets');
  expect(copy.exercises[1]).not.toHaveProperty('targetReps');
  expect(data.routines![0]).toEqual(before.routines![0]);
  expect(data.active).toEqual(before.active); expect(data.history).toEqual(before.history);
  expect((await repository.load()).routines).toEqual(data.routines);
  await a.updateRoutine(copy.id, data.revision, { ...input(), name: 'Independent copy' });
  expect(store.getState().data.routines![0]).toEqual(source);
  await a.discardWorkout(); await a.startRoutine(copy.id);
  expect(store.getState().data.active).toMatchObject({ name: 'Independent copy', exercises: [{ sets: [] }, { sets: [] }] });
});

it.each(['A'.repeat(80), 'A'.repeat(72) + '💪long'])('bounds a copied long name without splitting a character', async name => {
  const store = await saved(), a = store.getState(), source = a.data.routines![0];
  await a.updateRoutine(source.id, a.data.revision, { ...input(), name });
  expect(await a.duplicateRoutine(source.id)).toEqual({ ok: true });
  const copiedName = store.getState().data.routines![1].name;
  expect(copiedName).toBe('A'.repeat(name.includes('💪') ? 72 : 73) + ' (copy)');
  expect(copiedName.length).toBeLessThanOrEqual(80);
});

it('uses the latest loaded routine and rejects a stale tab without writing a copy', async () => {
  const store = await saved(), other = makeStore(); await other.getState().load();
  const source = store.getState().data.routines![0], before = store.getState().data;
  await other.getState().updateRoutine(source.id, before.revision, { ...input(), name: 'Latest plan' });
  expect((await store.getState().duplicateRoutine(source.id)).ok).toBe(false);
  expect(store.getState().data).toBe(before); expect(store.getState().needsReload).toBe(true);
  expect((await repository.load()).routines).toHaveLength(1);
  await store.getState().load();
  expect(await store.getState().duplicateRoutine(source.id)).toEqual({ ok: true });
  expect(store.getState().data.routines![1].name).toBe('Latest plan (copy)');
});

it('rejects a missing source and the 100-routine cap without writing', async () => {
  const store = await saved(), a = store.getState(), before = a.data;
  expect((await a.duplicateRoutine('missing')).ok).toBe(false);
  expect(store.getState().data).toBe(before);
  for (let count = 1; count < 100; count++) expect((await a.createRoutine(input())).ok).toBe(true);
  const full = store.getState().data;
  expect((await a.duplicateRoutine(full.routines![0].id)).ok).toBe(false);
  expect(store.getState().data).toBe(full); expect(store.getState().needsReload).toBe(false);
  expect((await repository.load()).revision).toBe(full.revision);
});

it('blocks duplication before load, during a save and after an uncertain save', async () => {
  const store = makeStore(), a = store.getState();
  expect((await a.duplicateRoutine('missing')).ok).toBe(false);
  await a.load(); await a.createRoutine(input());
  const before = store.getState().data, id = before.routines![0].id;
  let rejectSave!: (error: Error) => void;
  vi.spyOn(repository, 'save').mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject; }));
  const saving = a.duplicateRoutine(id);
  expect(store.getState().busy).toBe(true);
  expect((await a.duplicateRoutine(id)).ok).toBe(false);
  expect(store.getState().data).toBe(before);
  rejectSave(new Error('Unknown save outcome'));
  expect((await saving).ok).toBe(false);
  expect(store.getState().needsReload).toBe(true); expect(store.getState().data).toBe(before);
  expect((await a.duplicateRoutine(id)).ok).toBe(false);
  expect((await repository.load()).routines).toHaveLength(1);
});

it('blocks duplication after saved data cannot be loaded', async () => {
  const store = await saved(), before = store.getState().data;
  vi.spyOn(repository, 'load').mockRejectedValueOnce(new Error('Unknown data'));
  await store.getState().load();
  expect((await store.getState().duplicateRoutine(before.routines![0].id)).ok).toBe(false);
  expect(store.getState().data).toBe(before);
});
