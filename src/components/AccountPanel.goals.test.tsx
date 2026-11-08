import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AccountService } from '@/core/accountService';
import { emptyWorkoutData } from '@/core/workouts';
import { syncSnapshot, type SharedWorkoutSnapshot, type WorkoutCloud } from '@/core/workoutSync';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { WorkoutGoal } from '@/types/workout';
import { AccountPanel, GoalVersion, RecordVersion } from './AccountPanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let shared: SharedWorkoutSnapshot;
let cloud: WorkoutCloud;
const goal: WorkoutGoal = { id: 'g1', name: 'Pull-up', unit: 'lb', bodyweight: true, weight: 25, reps: 5, createdAt: 1 };

beforeEach(async () => {
  const repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository);
  await repository.save(0, { ...emptyWorkoutData(), goals: [goal] });
  await store.getState().load();
  shared = { revision: 0, data: emptyWorkoutData() };
  cloud = { read: async () => shared, write: vi.fn(async (revision: number, data) => {
    if (revision !== shared.revision) throw new Error('stale');
    shared = { revision: revision + 1, data: syncSnapshot(data) }; return shared;
  }) };
  // Establish a common base, then change the goal differently on each side.
  expect((await store.getState().confirmSync(await store.getState().previewSync(cloud), {}, cloud)).ok).toBe(true);
  expect((await store.getState().updateGoal('g1', store.getState().data.revision, { ...goal, weight: 30 })).ok).toBe(true);
  shared = { revision: shared.revision + 1, data: { ...shared.data, goals: [{ ...goal, weight: -10, reps: 8 }] } };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

const service = (): AccountService => ({ namespace: 'test', getAccount: async () => null, subscribe: () => () => {},
  sendCode: async () => {}, verifyCode: async () => ({ id: 'a', email: 'lifter@example.test' }), signOut: async () => {}, cloud: () => cloud });
function button(label: string) {
  const found = [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === label);
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
async function settle() { for (let index = 0; index < 5; index++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }

it('lists goal conflicts with both versions and confirms sync after a choice', async () => {
  await act(async () => root.render(<AccountPanel service={service()} account={{ id: 'a', email: 'lifter@example.test' }}
    store={store} guest={createWorkoutRepository(new IDBFactory(), 'guest')} />));
  await act(async () => button('Preview sync').click());
  await settle();
  const preview = container.querySelector('[aria-label="Sync preview"]')!;
  expect(preview.textContent).toContain('This device has 0 completed workouts, 0 routines and 1 goal.');
  expect(preview.textContent).toContain('Cloud has 0 completed workouts, 0 routines and 1 goal.');
  const conflict = [...preview.querySelectorAll('fieldset')].find(item => item.querySelector('legend')?.textContent === 'Goal conflict · Pull-up')!;
  expect(conflict).toBeDefined();
  expect(conflict.textContent).toContain('Pull-up (lb, bodyweight) · 5 reps × +30 lb');
  expect(conflict.textContent).toContain('Pull-up (lb, bodyweight) · 8 reps × −10 lb assist');
  expect(button('Confirm sync').disabled).toBe(true);
  const cloudChoice = conflict.querySelector<HTMLInputElement>('input[value="cloud"]')!;
  expect(cloudChoice.name).toBe('goal/g1');
  await act(async () => cloudChoice.click());
  expect(button('Confirm sync').disabled).toBe(false);
  await act(async () => button('Confirm sync').click());
  await settle();
  expect(container.textContent).toContain('Sync complete.');
  expect(store.getState().data.goals).toEqual([{ ...goal, weight: -10, reps: 8 }]);
});

it('resolves two goals created separately for one exercise', async () => {
  // Same exercise, unit and bodyweight setting with a different ID in the cloud.
  shared = { revision: shared.revision + 1, data: { ...shared.data, goals: [{ ...goal, id: 'g2', weight: 40, createdAt: 2 }] } };
  await act(async () => root.render(<AccountPanel service={service()} account={{ id: 'a', email: 'lifter@example.test' }}
    store={store} guest={createWorkoutRepository(new IDBFactory(), 'guest')} />));
  await act(async () => button('Preview sync').click());
  await settle();
  const choice = container.querySelector<HTMLInputElement>('input[name="goal-key/[\\"Pull-up\\",\\"lb\\",true]"][value="cloud"]')!;
  expect(choice.closest('fieldset')?.textContent).toContain('5 reps × +40 lb');
  expect(button('Confirm sync').disabled).toBe(true);
  await act(async () => choice.click());
  // The cloud also deleted g1 while this device edited it: a second, ID-keyed conflict.
  expect(button('Confirm sync').disabled).toBe(true);
  await act(async () => container.querySelector<HTMLInputElement>('input[name="goal/g1"][value="cloud"]')!.click());
  await act(async () => button('Confirm sync').click());
  await settle();
  expect(container.textContent).toContain('Sync complete.');
  expect(store.getState().data.goals).toEqual([{ ...goal, id: 'g2', weight: 40, createdAt: 2 }]);
});

it('shows schema5 set details so workout versions differing only there are distinguishable', async () => {
  await act(async () => root.render(<RecordVersion value={{ id: 'w', name: 'Pull day', unit: 'lb', startedAt: 1, finishedAt: 2,
    exercises: [{ id: 'e', name: 'Pull-up', bodyweight: true, superset: 'pair1', sets: [{ id: 's', reps: 6, weight: -20, rpe: 8.5 }] }] }} />));
  expect(container.textContent).toContain('Pull-up · Bodyweight · Superset pair1 · Regular 6 reps × −20 lb assist RPE 8.5');
});

it('shows a deleted goal version plainly', async () => {
  await act(async () => root.render(<GoalVersion value={null} />));
  expect(container.textContent).toBe('Deleted');
  await act(async () => root.render(<GoalVersion value={{ ...goal, bodyweight: undefined, unit: 'kg', weight: 100 }} />));
  expect(container.textContent).toContain('Pull-up (kg) · 5 reps × 100 kg');
});

it('provides role="radiogroup", aria-checked and arrow key navigation for conflict radio options', async () => {
  await act(async () => root.render(<AccountPanel service={service()} account={{ id: 'a', email: 'lifter@example.test' }}
    store={store} guest={createWorkoutRepository(new IDBFactory(), 'guest')} />));
  await act(async () => button('Preview sync').click());
  await settle();
  const preview = container.querySelector('[aria-label="Sync preview"]')!;
  const fieldset = preview.querySelector('fieldset')!;
  expect(fieldset.getAttribute('role')).toBe('radiogroup');
  const legendId = fieldset.querySelector('legend')?.id;
  expect(legendId).toBeTruthy();
  expect(fieldset.getAttribute('aria-labelledby')).toBe(legendId);

  const deviceRadio = fieldset.querySelector<HTMLInputElement>('input[value="device"]')!;
  const cloudRadio = fieldset.querySelector<HTMLInputElement>('input[value="cloud"]')!;
  expect(deviceRadio.getAttribute('aria-checked')).toBe('false');
  expect(cloudRadio.getAttribute('aria-checked')).toBe('false');

  // Navigate using arrow keys
  deviceRadio.focus();
  await act(async () => {
    deviceRadio.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  });
  expect(cloudRadio.checked).toBe(true);
  expect(cloudRadio.getAttribute('aria-checked')).toBe('true');
});

it('restores focus to Preview sync button after canceling sync preview', async () => {
  await act(async () => root.render(<AccountPanel service={service()} account={{ id: 'a', email: 'lifter@example.test' }}
    store={store} guest={createWorkoutRepository(new IDBFactory(), 'guest')} />));
  const previewBtn = button('Preview sync');
  previewBtn.focus();
  await act(async () => previewBtn.click());
  await settle();

  const cancelBtn = button('Cancel sync');
  await act(async () => cancelBtn.click());
  await settle();

  expect(document.activeElement).toBe(button('Preview sync'));
});

