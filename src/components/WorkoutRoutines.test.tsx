import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkoutError } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutRoutines } from './WorkoutRoutines';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
let sequence: number;
beforeEach(async () => {
  sequence = 0; repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository, { id: () => `id-${++sequence}`, now: () => 1000 });
  await store.getState().load();
  await store.getState().createRoutine({ name: 'Upper day', unit: 'kg', exercises: [
    { name: 'Bench press', targetSets: 3, targetReps: 8 }, { name: 'Row' },
  ] });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); });
async function render() {
  await act(async () => root.render(<WorkoutRoutines store={store} onStarted={() => {}} onResume={() => {}} />));
}
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  expect(found, `Missing button ${name}`).toBeDefined(); return found!;
}
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => { const off = store.subscribe(state => { if (!state.busy) { off(); resolve(); } }); });
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); }

it('duplicates a routine through its accessible action and edits and starts the independent copy', async () => {
  await render(); const source = structuredClone(store.getState().data.routines![0]);
  await click('Duplicate routine Upper day');
  expect(container.querySelector('[role="status"]')?.textContent).toContain('Routine duplicated');
  expect(button('Duplicate routine Upper day (copy)')).toBeDefined();
  await click('Edit routine Upper day (copy)');
  const label = [...container.querySelectorAll('label')].find(el => el.textContent === 'Routine name')!;
  const name = document.getElementById(label.htmlFor) as HTMLInputElement;
  expect(name.value).toBe('Upper day (copy)');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'My new plan');
    name.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await idle();
  });
  expect(store.getState().data.routines![0]).toEqual(source);
  await click('Start routine My new plan');
  expect(store.getState().data.active).toMatchObject({ name: 'My new plan', unit: 'kg', exercises: [
    { name: 'Bench press', targetSets: 3, targetReps: 8, sets: [] }, { name: 'Row', sets: [] },
  ] });
});

it('permits duplication while a workout is active and preserves that workout', async () => {
  await store.getState().startRoutine(store.getState().data.routines![0].id);
  const before = structuredClone(store.getState().data.active); await render();
  expect(button('Start routine Upper day').disabled).toBe(true);
  expect(button('Duplicate routine Upper day').disabled).toBe(false);
  await click('Duplicate routine Upper day');
  expect(store.getState().data.active).toEqual(before);
});

it('waits for confirmation before showing a copy and prevents overlapping duplicate clicks', async () => {
  await render(); const save = repository.save;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  vi.spyOn(repository, 'save').mockImplementationOnce(async (revision, next) => { await gate; return save(revision, next); });
  await act(async () => { button('Duplicate routine Upper day').click(); button('Duplicate routine Upper day').click(); });
  expect(button('Duplicate routine Upper day').disabled).toBe(true);
  expect(store.getState().data.routines).toHaveLength(1);
  expect(container.querySelector('[role="status"]')).toBeNull();
  await act(async () => { release(); await idle(); });
  expect(store.getState().data.routines).toHaveLength(2);
  expect(container.querySelector('[role="status"]')?.textContent).toContain('Routine duplicated');
});

it('clears an earlier success notice when a duplicate fails and disables further writes', async () => {
  await render(); await click('Duplicate routine Upper day');
  const before = store.getState().data;
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await click('Duplicate routine Upper day');
  expect(store.getState().data).toBe(before);
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(button('Duplicate routine Upper day').disabled).toBe(true);
});

it.each([{ busy: true }, { needsReload: true }])('disables duplicate when the library is unavailable (%j)', async unavailable => {
  store.setState(unavailable); await render();
  expect(button('Duplicate routine Upper day').disabled).toBe(true);
});

it('hides saved-routine actions until the library loads', async () => {
  store.setState({ loaded: false }); await render();
  expect(container.querySelector('[aria-label="Duplicate routine Upper day"]')).toBeNull();
  expect(button('New routine').disabled).toBe(true);
});

it('disables duplication at the routine limit', async () => {
  for (let count = 1; count < 100; count++) await store.getState().createRoutine({ name: `Plan ${count}`, unit: 'lb', exercises: [{ name: 'Row' }] });
  await render(); expect(button('Duplicate routine Upper day').disabled).toBe(true);
  expect(container.textContent).toContain('100 routines');
});
