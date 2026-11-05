import { IDBFactory, IDBObjectStore, IDBDatabase } from 'fake-indexeddb';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from './workoutRepository';

let factory: IDBFactory;
beforeEach(() => { factory = new IDBFactory(); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
function next(id = 'a') {
  return { ...emptyWorkoutData(), active: { id, name: 'Workout', unit: 'kg' as const,
    startedAt: 1000, finishedAt: null, exercises: [] } };
}
async function raw(value?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const open = factory.open('gymbro-workouts', 1);
    open.onupgradeneeded = () => { open.result.createObjectStore('library'); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const tx = db.transaction('library', value === undefined ? 'readonly' : 'readwrite');
      const request = value === undefined ? tx.objectStore('library').get('current') : tx.objectStore('library').put(value, 'current');
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
}
describe('transactional workout repository', () => {
  it('loads a new library without writing fake data', async () => {
    expect(await createWorkoutRepository(factory).load()).toEqual(emptyWorkoutData());
    expect(await raw()).toBeUndefined();
  });
  it('commits a revision and reloads its actual stored values', async () => {
    const repository = createWorkoutRepository(factory);
    expect(await repository.save(0, next())).toEqual({ ...next(), revision: 1 });
    expect(await createWorkoutRepository(factory).load()).toEqual({ ...next(), revision: 1 });
  });
  it('serializes concurrent writers and rejects the stale revision', async () => {
    const results = await Promise.allSettled([
      createWorkoutRepository(factory).save(0, next('a')),
      createWorkoutRepository(factory).save(0, next('b')),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason.kind).toBe('conflict');
    expect((await createWorkoutRepository(factory).load()).revision).toBe(1);
  });
  it('preserves a full valid library when revision rollover would exceed the size limit', async () => {
    const record = (index: number) => ({ id: `w-${index}`, name: 'W', unit: 'kg' as const,
      startedAt: 1, finishedAt: 2, exercises: [{ id: `e-${index}`, name: 'E',
        sets: Array.from({ length: 100 }, (_, i) => ({ id: `s-${i}`, reps: 1, weight: 1 })) }] });
    const data = { version: 1, revision: 9, active: null, history: [record(0)] };
    while (JSON.stringify(data).length < 1_000_000) data.history.push(record(data.history.length));
    let last = data.history[data.history.length - 1];
    while (JSON.stringify(data).length > 1_000_000 && last.exercises[0].sets.length > 1) last.exercises[0].sets.pop();
    if (JSON.stringify(data).length > 1_000_000) { data.history.pop(); last = data.history[data.history.length - 1]; }
    let remaining = 1_000_000 - JSON.stringify(data).length;
    const pad = (value: string) => {
      const padding = Math.min(80 - value.length, remaining); remaining -= padding;
      return value + 'x'.repeat(padding);
    };
    last.name = pad(last.name); last.exercises[0].name = pad(last.exercises[0].name);
    last.exercises[0].sets[0].id = pad(last.exercises[0].sets[0].id);
    expect(JSON.stringify(data).length).toBe(1_000_000);
    await raw(data);
    const repository = createWorkoutRepository(factory);
    expect((await repository.load()).revision).toBe(9);
    const result = await repository.save(9, data).then(() => ({ ok: true }), (error: unknown) => ({ ok: false, kind: (error as { kind: string }).kind }));
    expect(result).toEqual({ ok: false, kind: 'validation' });
    expect((await repository.load()).revision).toBe(9);
    expect(JSON.stringify(await raw()).length).toBe(1_000_000);
  });
  it('never replaces an unknown stored schema on read or write', async () => {
    const future = { version: 99, private: 'sentinel' }; await raw(future);
    const repository = createWorkoutRepository(factory);
    await expect(repository.load()).rejects.toMatchObject({ kind: 'storage' });
    await expect(repository.save(0, next())).rejects.toMatchObject({ kind: 'storage' });
    expect(await raw()).toEqual(future);
  });
  it('rejects injected media fields without changing the saved record', async () => {
    const repository = createWorkoutRepository(factory); await repository.save(0, next());
    await expect(repository.save(1, { ...next(), revision: 1, video: 'blob:private' })).rejects.toBeTruthy();
    expect((await repository.load()).revision).toBe(1);
  });
  it('aborts a failed put and keeps the previous committed value', async () => {
    const repository = createWorkoutRepository(factory); await repository.save(0, next('original'));
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    await expect(repository.save(1, { ...next('changed'), revision: 1 })).rejects.toMatchObject({ kind: 'storage' });
    expect((await repository.load()).active?.id).toBe('original');
  });
  it('reports unavailable storage without creating a memory-only success', async () => {
    const repository = createWorkoutRepository(undefined);
    await expect(repository.load()).rejects.toMatchObject({ kind: 'storage' });
    await expect(repository.save(0, next())).rejects.toMatchObject({ kind: 'storage' });
  });
  it('handles an object-store creation failure without leaking the open request', async () => {
    vi.spyOn(IDBDatabase.prototype, 'createObjectStore').mockImplementationOnce(() => {
      throw new DOMException('schema quota', 'QuotaExceededError');
    });
    await expect(createWorkoutRepository(factory).load()).rejects.toMatchObject({ kind: 'storage' });
  });
  it.each([undefined, NaN, -1, 0.5])('rejects malformed expected revision %s', async revision => {
    const repository = createWorkoutRepository(factory);
    await expect(repository.save(revision as number, next())).rejects.toMatchObject({ kind: 'validation' });
    expect(await raw()).toBeUndefined();
  });
  it('bounds a stalled open and closes a late connection', async () => {
    vi.useFakeTimers();
    const request = { onsuccess: null as null | (() => void), onerror: null, onblocked: null, onupgradeneeded: null,
      result: { close: vi.fn() } };
    vi.spyOn(factory, 'open').mockReturnValue(request as unknown as IDBOpenDBRequest);
    const result = createWorkoutRepository(factory).load().then(() => null, (error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await result).toMatchObject({ kind: 'storage' });
    request.onsuccess?.();
    expect(request.result.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
