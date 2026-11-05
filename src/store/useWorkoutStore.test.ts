import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData, WorkoutError } from '@/core/workouts';
import { createWorkoutRepository, type WorkoutRepository } from './workoutRepository';
import { createWorkoutStore } from './useWorkoutStore';

let repository: WorkoutRepository;
let counter: number;
let now: number;
const makeStore = () => createWorkoutStore(repository, { id: () => `id-${++counter}`, now: () => now });
beforeEach(() => { repository = createWorkoutRepository(new IDBFactory()); counter = 0; now = 1000; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('saved workout lifecycle', () => {
  it('can create IDs on a LAN origin without crypto.randomUUID', async () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    const store = createWorkoutStore(repository); await store.getState().load();
    expect(await store.getState().startWorkout('LAN workout', 'lb')).toEqual({ ok: true });
    expect((await repository.load()).active?.id.length).toBeGreaterThan(0);
  });
  it('logs, edits, removes, resumes and finishes with original units', async () => {
    const store = makeStore(); const actions = store.getState();
    expect(await actions.load()).toEqual({ ok: true });
    expect(await actions.startWorkout(' Upper body ', 'kg')).toEqual({ ok: true });
    expect(await actions.addExercise(' Bench press ')).toEqual({ ok: true });
    const exerciseId = store.getState().data.active!.exercises[0].id;
    await actions.addSet(exerciseId, 8, 60.5);
    const setId = store.getState().data.active!.exercises[0].sets[0].id;
    await actions.updateSet(exerciseId, setId, 9, 62.5);
    await actions.addSet(exerciseId, 6, 0);
    const extra = store.getState().data.active!.exercises[0].sets[1].id;
    await actions.removeSet(exerciseId, extra);
    const resumed = makeStore(); await resumed.getState().load();
    expect(resumed.getState().data.active?.name).toBe('Upper body');
    expect(resumed.getState().data.active?.exercises[0].sets).toEqual([{ id: setId, reps: 9, weight: 62.5 }]);
    now = 2000; expect(await resumed.getState().finishWorkout()).toEqual({ ok: true });
    expect(resumed.getState().data.active).toBeNull();
    expect(resumed.getState().data.history[0]).toMatchObject({ name: 'Upper body', unit: 'kg', finishedAt: 2000 });
    await resumed.getState().deleteWorkout(resumed.getState().data.history[0].id);
    expect((await repository.load()).history).toEqual([]);
  });
  it('rejects a second active workout and invalid set values without saving', async () => {
    const store = makeStore(); const a = store.getState(); await a.load(); await a.startWorkout('Workout', 'lb');
    const revision = store.getState().data.revision;
    expect((await a.startWorkout('Other', 'kg')).ok).toBe(false);
    expect(store.getState().data.revision).toBe(revision);
    await a.addExercise('Bench'); const id = store.getState().data.active!.exercises[0].id;
    expect((await a.addSet(id, 0, 20)).ok).toBe(false);
    expect(store.getState().data.active?.exercises[0].sets).toEqual([]);
  });
  it('requires logged sets before finish and checks clock order', async () => {
    const store = makeStore(); const a = store.getState(); await a.load(); await a.startWorkout('Workout', 'lb');
    expect((await a.finishWorkout()).ok).toBe(false);
    await a.addExercise('Bench'); const id = store.getState().data.active!.exercises[0].id;
    expect((await a.finishWorkout()).ok).toBe(false);
    await a.addSet(id, 10, 0); now = 999;
    expect((await a.finishWorkout()).ok).toBe(false);
    expect(store.getState().data.active).not.toBeNull();
  });
  it('discards only the active workout, preserving saved history', async () => {
    const store = makeStore(); const a = store.getState(); await a.load(); await a.startWorkout('One', 'lb');
    await a.addExercise('Bench'); await a.addSet(store.getState().data.active!.exercises[0].id, 1, 1);
    now = 2000; await a.finishWorkout(); await a.startWorkout('Two', 'kg');
    await a.addExercise('Row'); await a.removeExercise(store.getState().data.active!.exercises[0].id);
    await a.discardWorkout();
    expect(store.getState().data.active).toBeNull();
    expect(store.getState().data.history).toHaveLength(1);
  });
  it('keeps corrupt data blocked until a successful explicit reload', async () => {
    vi.spyOn(repository, 'load').mockRejectedValueOnce(new Error('corrupt'));
    const store = makeStore(); const a = store.getState(); expect((await a.load()).ok).toBe(false);
    expect((await a.startWorkout('No', 'lb')).ok).toBe(false);
    expect(await a.load()).toEqual({ ok: true });
    expect(await a.startWorkout('Yes', 'lb')).toEqual({ ok: true });
  });
  it('does not expose pending or failed saves as success; recovery reloads first', async () => {
    let rejectSave!: (reason: unknown) => void;
    const save = vi.spyOn(repository, 'save').mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    const store = makeStore(); const a = store.getState(); await a.load();
    const pending = a.startWorkout('Pending', 'lb');
    expect(store.getState().data.active).toBeNull(); expect(store.getState().busy).toBe(true);
    expect((await a.load()).ok).toBe(false);
    rejectSave(new WorkoutError('storage', 'Reload required'));
    expect((await pending).ok).toBe(false); expect(store.getState().data).toEqual(emptyWorkoutData());
    expect((await a.startWorkout('Retry', 'lb')).ok).toBe(false);
    save.mockRestore(); await a.load(); expect(await a.startWorkout('Retry', 'lb')).toEqual({ ok: true });
  });
  it('rejects stale tabs without replacing their last confirmed data', async () => {
    const first = makeStore(), second = makeStore(); await first.getState().load(); await second.getState().load();
    await first.getState().startWorkout('First', 'kg');
    expect((await second.getState().startWorkout('Second', 'lb')).ok).toBe(false);
    expect(second.getState().data.active).toBeNull(); expect(second.getState().needsReload).toBe(true);
    await second.getState().load(); expect(second.getState().data.active?.name).toBe('First');
  });
  it('deduplicates initial loads and blocks writes until that load settles', async () => {
    let resolveLoad!: (value: ReturnType<typeof emptyWorkoutData>) => void;
    const spy = vi.spyOn(repository, 'load').mockImplementationOnce(() => new Promise(resolve => { resolveLoad = resolve; }));
    const store = makeStore(); const a = store.getState(); const pending = a.load(); const duplicate = a.load();
    expect((await a.startWorkout('Too soon', 'lb')).ok).toBe(false);
    expect(spy).toHaveBeenCalledOnce(); resolveLoad(emptyWorkoutData()); await pending; await duplicate;
    expect(store.getState().loaded).toBe(true);
  });
});
