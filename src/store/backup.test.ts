import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData, WorkoutError } from '@/core/workouts';
import type { WorkoutBackup } from '@/core/workoutBackup';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

let repository: ReturnType<typeof createWorkoutRepository>;
function backup(active = false): WorkoutBackup {
  const workout = { id: 'imported', name: 'Synthetic upper', unit: 'kg' as const,
    startedAt: 1, finishedAt: active ? null : 2,
    exercises: [{ id: 'e', name: 'Bench', sets: [{ id: 's', reps: 5, weight: 20 }] }] };
  return { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 100,
    data: { ...emptyWorkoutData(), revision: 900, active: active ? workout : null,
      history: active ? [] : [workout], routines: [{ id: 'routine', name: 'Upper', unit: 'lb',
        exercises: [{ id: 'entry', name: 'Row', targetReps: 8 }] }] } };
}
beforeEach(() => { repository = createWorkoutRepository(new IDBFactory()); });
afterEach(() => vi.restoreAllMocks());
async function opened() {
  const store = createWorkoutStore(repository);
  await store.getState().load();
  return store;
}
it('restores all additions atomically with the destination revision and persists reload', async () => {
  const store = await opened();
  expect(await store.getState().restoreBackup(backup(), 0)).toEqual({ ok: true });
  expect(store.getState().data).toMatchObject({ revision: 1, history: [{ id: 'imported' }], routines: [{ id: 'routine' }] });
  expect((await repository.load())).toEqual(store.getState().data);
  const reopened = await opened();
  expect(reopened.getState().data).toEqual(store.getState().data);
});
it('repeated identical imports do not write or advance the revision', async () => {
  const store = await opened();
  await store.getState().restoreBackup(backup(), 0);
  const before = store.getState().data;
  const write = vi.spyOn(repository, 'save');
  expect(await store.getState().restoreBackup(backup(), before.revision)).toEqual({ ok: true });
  expect(write).not.toHaveBeenCalled();
  expect(store.getState().data).toBe(before);
});
it('rejects a preview revision made stale by a later save or reload', async () => {
  const store = await opened();
  await store.getState().startWorkout('Local', 'kg');
  await store.getState().load();
  const before = store.getState().data;
  const write = vi.spyOn(repository, 'save');
  expect((await store.getState().restoreBackup(backup(), 0)).ok).toBe(false);
  expect(write).not.toHaveBeenCalled();
  expect(store.getState().data).toBe(before);
  expect(store.getState().error).toMatch(/preview|choose.*again/i);
});
it('rejects concurrent-tab writes and requires reload without losing either library', async () => {
  const first = await opened(), second = await opened();
  await first.getState().startWorkout('Other tab', 'lb');
  expect((await second.getState().restoreBackup(backup(), 0)).ok).toBe(false);
  expect(second.getState().needsReload).toBe(true);
  expect(second.getState().data.history).toHaveLength(0);
  expect((await repository.load()).active?.name).toBe('Other tab');
  await second.getState().load();
  expect((await second.getState().restoreBackup(backup(), second.getState().data.revision)).ok).toBe(true);
  expect(second.getState().data.active?.name).toBe('Other tab');
});
it('preserves saved records after an uncertain write failure and permits recovery', async () => {
  const store = await opened(), before = store.getState().data;
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Unconfirmed save'));
  expect((await store.getState().restoreBackup(backup(), 0)).ok).toBe(false);
  expect(store.getState().data).toBe(before);
  expect(store.getState().needsReload).toBe(true);
  expect((await store.getState().restoreBackup(backup(), 0)).ok).toBe(false);
  await store.getState().load();
  expect((await store.getState().restoreBackup(backup(), 0)).ok).toBe(true);
});
it('rejects active conflicts without a save and retains an imported active workout on reload', async () => {
  const store = await opened();
  await store.getState().startWorkout('Local', 'kg');
  const before = store.getState().data, write = vi.spyOn(repository, 'save');
  expect((await store.getState().restoreBackup(backup(true), before.revision)).ok).toBe(false);
  expect(store.getState().data).toBe(before);
  expect(write).not.toHaveBeenCalled();
  await store.getState().discardWorkout();
  expect((await store.getState().restoreBackup(backup(true), store.getState().data.revision)).ok).toBe(true);
  expect((await repository.load()).active?.id).toBe('imported');
});
it('blocks restore before load and while another write is pending', async () => {
  const store = createWorkoutStore(repository);
  expect((await store.getState().restoreBackup(backup(), 0)).ok).toBe(false);
  await store.getState().load();
  const original = repository.save;
  let resume!: () => void;
  vi.spyOn(repository, 'save').mockImplementationOnce(async (...args) => {
    await new Promise<void>(resolve => { resume = resolve; });
    return original(...args);
  });
  const pending = store.getState().startWorkout('Pending', 'kg');
  expect((await store.getState().restoreBackup(backup(), 0)).ok).toBe(false);
  resume(); await pending;
});
