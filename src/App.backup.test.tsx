import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutBackup } from '@/core/workoutBackup';
import { emptyWorkoutData, WorkoutError } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout, WorkoutData } from '@/types/workout';
import App from './App';

// Progress and Backup load on demand; warm the module cache so tests wait on rendering, not on loading.
beforeAll(async () => { await import('@/components/WorkoutBackup'); await import('@/components/WorkoutProgress'); });

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
const workout = (weight = 20, finishedAt: number | null = 2): Workout => ({ id: 'imported', name: 'Synthetic upper',
  unit: 'kg', startedAt: 1, finishedAt, exercises: [{ id: 'e', name: 'Bench', sets: [{ id: 's', reps: 5, weight }] }] });
const data = (): WorkoutData => ({ ...emptyWorkoutData(), history: [workout()],
  routines: [{ id: 'r', name: 'Upper', unit: 'lb', exercises: [{ id: 'entry', name: 'Row', targetReps: 8 }] }] });
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  repository = createWorkoutRepository(new IDBFactory()); store = createWorkoutStore(repository);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => {
    const unsubscribe = store.subscribe(state => { if (!state.busy) { unsubscribe(); resolve(); } });
  });
}
async function render() { await act(async () => root.render(<App workouts={store} />)); await act(idle); }
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); }
async function choose(value = createWorkoutBackup(data(), 1000)) {
  const input = container.querySelector('input[type="file"]')!;
  const read = FileReader.prototype.readAsArrayBuffer;
  const loaded = new Promise<void>(resolve => {
    vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementationOnce(function (this: FileReader, file) {
      this.addEventListener('loadend', () => resolve(), { once: true }); read.call(this, file);
    });
  });
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([value], 'synthetic-backup.json')] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await loaded;
  });
}
it('opens backup from Home and requests export of saved records without a write', async () => {
  await render(); await click('Backup and restore');
  expect(container.querySelector('h1')?.textContent).toBe('Backup and restore');
  vi.useFakeTimers();
  const save = vi.spyOn(repository, 'save');
  await click('Export backup');
  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Download requested');
  await vi.advanceTimersByTimeAsync(1000);
});
it('previews additions before confirmation and makes restored history/routines usable', async () => {
  await render(); await click('Backup and restore'); await choose();
  expect(container.textContent).toContain('Restore preview');
  expect((await repository.load()).history).toHaveLength(0);
  await click('Restore additions');
  expect(store.getState().data.history).toHaveLength(1);
  expect(container.textContent).toContain('Backup additions saved');
  await click('Back to Home'); await click('View progress');
  expect(container.textContent).toContain('20 kg × 5 reps');
  await click('Routines');
  expect(container.textContent).toContain('Upper');
});
it('counts goals to add in the preview and restores them', async () => {
  const goals = [{ id: 'g', name: 'Bench', unit: 'kg' as const, weight: 100, reps: 5, createdAt: 1 }];
  await render(); await click('Backup and restore'); await choose(createWorkoutBackup({ ...data(), goals }, 1000));
  const goalCount = [...container.querySelectorAll('dt')].find(item => item.textContent === 'Goals to add');
  expect(goalCount?.nextElementSibling?.textContent).toBe('1');
  await click('Restore additions');
  expect(store.getState().data.goals).toEqual(goals);
});
it('explains goals skipped because the library already has a goal for that exercise', async () => {
  const mine = { id: 'mine', name: 'Bench', unit: 'kg' as const, weight: 100, reps: 5, createdAt: 1 };
  await repository.save(0, { ...data(), goals: [mine] }); await render(); await click('Backup and restore');
  await choose(createWorkoutBackup({ ...data(), goals: [{ ...mine, id: 'theirs', weight: 120 }] }, 1000));
  expect(container.textContent).toContain('1 goal skipped: you already have a goal for that exercise.');
});
it('rejects malformed and conflicting files without changing the saved library', async () => {
  await repository.save(0, data()); await render(); await click('Backup and restore');
  const before = store.getState().data, save = vi.spyOn(repository, 'save');
  await choose('{'); expect(container.textContent).toContain('not valid JSON');
  await choose(createWorkoutBackup({ ...data(), history: [workout(99)] }, 1000));
  expect(container.textContent).toMatch(/conflict/i);
  expect(save).not.toHaveBeenCalled(); expect(store.getState().data).toBe(before);
});
it('treats an identical backup as a no-op and lets the user cancel a new preview', async () => {
  await repository.save(0, data()); await render(); await click('Backup and restore'); await choose();
  expect(container.textContent).toContain('already on this device');
  expect([...container.querySelectorAll('button')].some(item => item.textContent === 'Restore additions')).toBe(false);
  await choose(createWorkoutBackup({ ...emptyWorkoutData(), history: [{ ...workout(), id: 'new' }] }, 1000));
  await click('Cancel preview');
  expect(container.textContent).not.toContain('Restore preview');
  expect(store.getState().data.history).toHaveLength(1);
});
it('invalidates a preview on reload even when the revision is unchanged', async () => {
  await render(); await click('Backup and restore'); await choose();
  const revision = store.getState().data.revision;
  await act(async () => { await store.getState().load(); });
  expect(store.getState().data.revision).toBe(revision);
  expect(container.textContent).not.toContain('Restore preview');
  expect([...container.querySelectorAll('button')].some(item => item.textContent === 'Restore additions')).toBe(false);
});
it('keeps a paused active timer when importing an identical active workout plus new history', async () => {
  const active = { ...workout(30, null), id: 'active' };
  await repository.save(0, { ...emptyWorkoutData(), active });
  await render(); await click('Start rest timer'); await click('Pause timer');
  await click('Backup and restore');
  await choose(createWorkoutBackup({ ...data(), active }, 1000)); await click('Restore additions');
  expect(button('Resume timer')).toBeTruthy();
  expect(store.getState().data.active?.id).toBe('active');
});
it('offers recovery after a failed restore without displaying false success', async () => {
  await render(); await click('Backup and restore'); await choose();
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Save could not be confirmed'));
  await click('Restore additions');
  expect(store.getState().needsReload).toBe(true);
  expect(container.textContent).not.toContain('Backup additions saved');
  await click('Reload saved workouts');
  await choose(); await click('Restore additions');
  expect(store.getState().data.history).toHaveLength(1);
});
it('cancels a pending file read on navigation and ignores its stale result', async () => {
  await render(); await click('Backup and restore');
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementationOnce(() => {});
  const abort = vi.spyOn(AbortController.prototype, 'abort');
  const input = container.querySelector('input[type="file"]')!;
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['{}'], 'pending.json')] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(container.textContent).toContain('Reading backup');
  await click('Back to Home');
  expect(abort).toHaveBeenCalledOnce();
  await click('Backup and restore');
  expect(container.textContent).not.toContain('Restore preview');
  expect(container.textContent).not.toContain('Reading backup');
});

it('previews schema6 body and note additions and explains skipped notes', async () => {
  await repository.save(0, { ...data(), exerciseNotes: { Bench: 'Device note' } });
  await render(); await click('Backup and restore');
  await choose(createWorkoutBackup({ ...data(), bodyLog: [{ id: 'body', date: 1000, weight: 80, unit: 'kg' }], exerciseNotes: { Bench: 'Other note', Row: 'Seat 2' } }, 1000));
  expect(container.textContent).toContain('1 body entry added.');
  expect(container.textContent).toContain('1 exercise note added.');
  expect(container.textContent).toContain('1 exercise note skipped: you already have a note for that exercise.');
  await click('Restore additions');
  expect(store.getState().data.bodyLog).toHaveLength(1);
  expect(store.getState().data.exerciseNotes).toEqual({ Bench: 'Device note', Row: 'Seat 2' });
});
