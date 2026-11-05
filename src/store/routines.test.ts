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
