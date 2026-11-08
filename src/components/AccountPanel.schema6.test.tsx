import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import type { AccountService } from '@/core/accountService';
import { emptyWorkoutData } from '@/core/workouts';
import { syncSnapshot, type SharedWorkoutSnapshot, type WorkoutCloud } from '@/core/workoutSync';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { AccountPanel } from './AccountPanel';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('requires body and exercise-note choices before confirming sync through AccountPanel', async () => {
  let sequence = 0;
  const store = createWorkoutStore(createWorkoutRepository(new IDBFactory()), { id: () => `test-${++sequence}`, now: () => 1000 });
  await store.getState().load();
  let shared: SharedWorkoutSnapshot = { revision: 0, data: emptyWorkoutData() };
  const cloud: WorkoutCloud = { read: async () => shared, write: vi.fn(async (revision, data) => {
    if (revision !== shared.revision) throw new Error('stale');
    shared = { revision: revision + 1, data: syncSnapshot(data) }; return shared;
  }) };
  expect((await store.getState().confirmSync(await store.getState().previewSync(cloud), {}, cloud)).ok).toBe(true);
  expect((await store.getState().addBodyEntry({ date: 1000, weight: 80, unit: 'kg' })).ok).toBe(true);
  const body = store.getState().data.bodyLog![0];
  expect((await store.getState().setExerciseNote('Bench press', 'Device cue', store.getState().data.revision)).ok).toBe(true);
  shared = { revision: shared.revision + 1, data: { ...shared.data, bodyLog: [{ ...body, weight: 82 }], exerciseNotes: { 'Bench press': 'Cloud cue' } } };
  const service: AccountService = { namespace: 'test', getAccount: async () => null, subscribe: () => () => {}, sendCode: async () => {},
    verifyCode: async () => ({ id: 'a', email: 'lifter@example.test' }), signOut: async () => {}, cloud: () => cloud };
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const button = (label: string) => [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === label)!;
  async function settle() { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
  try {
    await act(async () => root.render(<AccountPanel service={service} account={{ id: 'a', email: 'lifter@example.test' }}
      store={store} guest={createWorkoutRepository(new IDBFactory(), 'guest')} />));
    await act(async () => button('Preview sync').click()); await settle();
    const fields = [...container.querySelectorAll('fieldset')];
    const bodyConflict = fields.find(field => field.querySelector('legend')?.textContent?.startsWith('Body conflict'))!;
    const noteConflict = fields.find(field => field.querySelector('legend')?.textContent?.startsWith('Exercise note conflict'))!;
    expect(bodyConflict.textContent).toContain('80 kg'); expect(bodyConflict.textContent).toContain('82 kg');
    expect(noteConflict.textContent).toContain('Device cue'); expect(noteConflict.textContent).toContain('Cloud cue');
    expect(button('Confirm sync').disabled).toBe(true);
    await act(async () => bodyConflict.querySelector<HTMLInputElement>('input[value="cloud"]')!.click());
    expect(button('Confirm sync').disabled).toBe(true);
    await act(async () => noteConflict.querySelector<HTMLInputElement>('input[value="device"]')!.click());
    expect(button('Confirm sync').disabled).toBe(false);
    await act(async () => button('Confirm sync').click()); await settle();
    expect(container.textContent).toContain('Sync complete.');
    expect(store.getState().data.bodyLog![0].weight).toBe(82);
    expect(store.getState().data.exerciseNotes).toEqual({ 'Bench press': 'Device cue' });
  } finally { await act(async () => root.unmount()); container.remove(); }
});
