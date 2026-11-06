import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from './workoutRepository';

afterEach(() => vi.restoreAllMocks());
const data = () => ({ ...emptyWorkoutData(), active: { id: 'w', name: 'Workout', unit: 'kg' as const,
  startedAt: 1, finishedAt: null, exercises: [] } });

it('isolates guest and two account databases', async () => {
  const factory = new IDBFactory(); const guest = createWorkoutRepository(factory);
  const one = createWorkoutRepository(factory, 'gymbro-account-one');
  const two = createWorkoutRepository(factory, 'gymbro-account-two');
  await one.save(0, data());
  expect((await one.load()).active?.id).toBe('w');
  expect((await guest.load()).active).toBeNull(); expect((await two.load()).active).toBeNull();
});
it('loads an absent shared baseline without writing and saves it atomically with the library', async () => {
  const repo = createWorkoutRepository(new IDBFactory());
  expect(await repo.loadSync()).toEqual({ revision: 0, data: emptyWorkoutData() });
  const shared = { revision: 4, data: data() };
  expect((await repo.saveSync(0, data(), shared)).revision).toBe(1);
  expect(await repo.loadSync()).toEqual(shared);
});
it('rolls back the library when the shared baseline cannot be saved', async () => {
  const repo = createWorkoutRepository(new IDBFactory()); await repo.save(0, data());
  const original = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (key === 'shared') throw new DOMException('quota', 'QuotaExceededError');
    return original.call(this, value, key);
  });
  await expect(repo.saveSync(1, { ...emptyWorkoutData(), revision: 1 }, { revision: 2, data: emptyWorkoutData() })).rejects.toBeTruthy();
  expect((await repo.load()).active?.id).toBe('w'); expect((await repo.loadSync()).revision).toBe(0);
});
it('rejects stale sync confirmation after another tab has saved', async () => {
  const repo = createWorkoutRepository(new IDBFactory()); await repo.save(0, data());
  await expect(repo.saveSync(0, emptyWorkoutData(), { revision: 1, data: emptyWorkoutData() })).rejects.toMatchObject({ kind: 'conflict' });
  expect((await repo.load()).revision).toBe(1); expect((await repo.loadSync()).revision).toBe(0);
});
it('rejects unknown baseline fields and leaves the local library untouched', async () => {
  const repo = createWorkoutRepository(new IDBFactory());
  await expect(repo.saveSync(0, data(), { revision: 1, data: { ...data(), video: 'private' } } as never)).rejects.toBeTruthy();
  expect((await repo.load()).active).toBeNull();
});
