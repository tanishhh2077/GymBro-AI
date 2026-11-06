import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { syncSnapshot, type SharedWorkoutSnapshot, type WorkoutCloud } from '@/core/workoutSync';
import { createWorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

afterEach(() => vi.restoreAllMocks());
async function setup() {
  const repository = createWorkoutRepository(new IDBFactory());
  const store = createWorkoutStore(repository); await store.getState().load();
  let shared: SharedWorkoutSnapshot = { revision: 0, data: emptyWorkoutData() };
  const cloud: WorkoutCloud = { read: async () => shared, write: vi.fn(async (revision, data) => {
    if (revision !== shared.revision) throw new Error('stale');
    shared = { revision: revision + 1, data: syncSnapshot(data) }; return shared;
  }) };
  return { repository, store, cloud };
}
it('previews without uploading and confirms both remote and local snapshots', async () => {
  const { store, repository, cloud } = await setup(); await store.getState().startWorkout('Account workout', 'kg');
  const preview = await store.getState().previewSync(cloud);
  expect(cloud.write).not.toHaveBeenCalled();
  expect((await store.getState().confirmSync(preview, {}, cloud)).ok).toBe(true);
  expect((await repository.loadSync()).data.active?.name).toBe('Account workout');
  expect((await cloud.read()).data.active?.name).toBe('Account workout');
});
it('rejects stale local previews before uploading', async () => {
  const { store, cloud } = await setup(); const preview = await store.getState().previewSync(cloud);
  await store.getState().startWorkout('New workout', 'kg');
  expect((await store.getState().confirmSync(preview, {}, cloud)).ok).toBe(false);
  expect(cloud.write).not.toHaveBeenCalled();
});
it('retains local records after an offline error and allows further workout saves', async () => {
  const { store, cloud } = await setup(); await store.getState().startWorkout('Offline', 'kg');
  const preview = await store.getState().previewSync(cloud);
  cloud.write = async () => { throw new Error('offline'); };
  expect((await store.getState().confirmSync(preview, {}, cloud)).ok).toBe(false);
  expect(store.getState().needsReload).toBe(false);
  expect((await store.getState().addExercise('Bench press')).ok).toBe(true);
});
it('blocks overlapping local operations during confirmation and releases the busy flag', async () => {
  const { store, cloud } = await setup(); const preview = await store.getState().previewSync(cloud);
  let release!: () => void;
  cloud.write = async () => { await new Promise<void>(resolve => { release = resolve; }); return { revision: 1, data: emptyWorkoutData() }; };
  const job = store.getState().confirmSync(preview, {}, cloud);
  expect((await store.getState().startWorkout('Overlapping', 'kg')).ok).toBe(false);
  release(); expect((await job).ok).toBe(true); expect(store.getState().busy).toBe(false);
});
it('retries safely after a remote save succeeds but the local transaction fails', async () => {
  const { store, repository, cloud } = await setup(); await store.getState().startWorkout('Preserved', 'kg');
  const preview = await store.getState().previewSync(cloud);
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => { throw new DOMException('quota'); });
  expect((await store.getState().confirmSync(preview, {}, cloud)).ok).toBe(false);
  expect(store.getState().needsReload).toBe(true);
  expect((await repository.loadSync()).revision).toBe(0);
  await store.getState().load();
  expect((await store.getState().confirmSync(await store.getState().previewSync(cloud), {}, cloud)).ok).toBe(true);
  expect((await repository.load()).active?.name).toBe('Preserved');
});
