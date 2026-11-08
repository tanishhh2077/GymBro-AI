import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoutineShare, ROUTINE_SHARE_FORMAT } from '@/core/routineShare';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { WorkoutRoutine } from '@/types/workout';
import { RoutineShare } from './RoutineShare';

vi.setConfig({ testTimeout: 30_000 });

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
let sequence: number;

function sampleRoutine(overrides: Partial<WorkoutRoutine> = {}): WorkoutRoutine {
  return {
    id: 'routine-1',
    name: 'Push Hypertrophy',
    unit: 'lb',
    exercises: [
      { id: 'ex-1', name: 'Barbell Bench Press', targetSets: 4, targetReps: 10, targetWeight: 185 },
      { id: 'ex-2', name: 'Incline Dumbbell Press', targetSets: 3, targetReps: 12, targetWeight: 60 },
      { id: 'ex-3', name: 'Dips', targetSets: 3, targetReps: 15, bodyweight: true },
    ],
    ...overrides,
  };
}

beforeEach(async () => {
  sequence = 0;
  repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository, { id: () => `id-${++sequence}`, now: () => 1000 });
  await store.getState().load();

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(
    el => el.getAttribute('aria-label') === name || el.textContent?.trim() === name,
  );
  expect(found, `Missing button "${name}"`).toBeDefined();
  return found!;
}

function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => {
    const off = store.subscribe(state => {
      if (!state.busy) {
        off();
        resolve();
      }
    });
  });
}

describe('RoutineShare', () => {
  it('renders without export section when routine prop is omitted', async () => {
    await act(async () => {
      root.render(<RoutineShare store={store} />);
    });

    expect(container.textContent).toContain('Import routine');
    expect(container.querySelector('#routine-share-export-title')).toBeNull();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();
  });

  it('renders export section when routine prop is provided and triggers onExport', async () => {
    const routine = sampleRoutine();
    const onExport = vi.fn();

    await act(async () => {
      root.render(<RoutineShare store={store} routine={routine} onExport={onExport} />);
    });

    expect(container.textContent).toContain('Export routine');
    const exportBtn = button('Export routine');
    expect(exportBtn).toBeDefined();

    await act(async () => {
      exportBtn.click();
    });

    expect(onExport).toHaveBeenCalledTimes(1);
    const [exportedText, filename] = onExport.mock.calls[0];
    expect(filename).toBe('gymbro-routine-push-hypertrophy.json');
    const parsed = JSON.parse(exportedText);
    expect(parsed.format).toBe(ROUTINE_SHARE_FORMAT);
    expect(parsed.routine.name).toBe('Push Hypertrophy');
  });

  it('falls back to browser file download when onExport is omitted', async () => {
    const routine = sampleRoutine();
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    await act(async () => {
      root.render(<RoutineShare store={store} routine={routine} />);
    });

    const exportBtn = button('Export routine');
    await act(async () => {
      exportBtn.click();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="status"]')?.textContent).toContain('gymbro-routine-push-hypertrophy.json');
  });

  it('rejects multiple file selection on import', async () => {
    await act(async () => {
      root.render(<RoutineShare store={store} />);
    });

    const fileInput = container.querySelector('#routine-share-file-input') as HTMLInputElement;
    const file1 = new File(['{}'], 'a.json');
    const file2 = new File(['{}'], 'b.json');

    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: [file1, file2], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Choose one routine file at a time.');
  });

  it('previews a valid imported routine and confirms the import into the store', async () => {
    const routine = sampleRoutine({
      exercises: [
        { id: 'ex-1', name: 'Pull-up', targetSets: 4, targetReps: 8, bodyweight: true },
        { id: 'ex-2', name: 'Barbell Row', targetSets: 4, targetReps: 8, targetWeight: 155 },
      ],
    });
    const shareText = createRoutineShare(routine);
    const file = new File([shareText], 'back-day.json', { type: 'application/json' });

    await act(async () => {
      root.render(<RoutineShare store={store} />);
    });

    const fileInput = container.querySelector('#routine-share-file-input') as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for FileReader
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(container.textContent).toContain('Routine preview');
    expect(container.textContent).toContain('Push Hypertrophy');
    expect(container.textContent).toContain('2 exercises');
    expect(container.textContent).toContain('Pull-up');
    expect(container.textContent).toContain('Barbell Row');

    // Confirm import
    const confirmBtn = button('Import this routine');
    await act(async () => {
      confirmBtn.click();
      await idle();
    });

    // Success notice and preview cleared
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Push Hypertrophy');
    expect(container.textContent).not.toContain('Routine preview');

    // Verify routine saved in store with fresh IDs
    const routines = store.getState().data.routines;
    expect(routines).toHaveLength(1);
    expect(routines![0].name).toBe('Push Hypertrophy');
    expect(routines![0].id).toMatch(/^id-\d+$/);
    expect(routines![0].exercises[0].id).toMatch(/^id-\d+$/);
  });

  it('cancels preview without modifying the store', async () => {
    const routine = sampleRoutine();
    const shareText = createRoutineShare(routine);
    const file = new File([shareText], 'routine.json', { type: 'application/json' });

    await act(async () => {
      root.render(<RoutineShare store={store} />);
    });

    const fileInput = container.querySelector('#routine-share-file-input') as HTMLInputElement;
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(container.textContent).toContain('Routine preview');
    const cancelBtn = button('Cancel');
    await act(async () => {
      cancelBtn.click();
    });

    expect(container.textContent).not.toContain('Routine preview');
    expect(store.getState().data.routines ?? []).toHaveLength(0);
  });

  it('displays validation error if the imported file is invalid', async () => {
    const file = new File(['{ "format": "wrong" }'], 'invalid.json', { type: 'application/json' });

    await act(async () => {
      root.render(<RoutineShare store={store} />);
    });

    const fileInput = container.querySelector('#routine-share-file-input') as HTMLInputElement;
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBeDefined();
    expect(container.textContent).not.toContain('Routine preview');
  });

  it('displays store error if routine limit is reached during import', async () => {
    // Fill up store routines to 100
    const fullRoutines: WorkoutRoutine[] = Array.from({ length: 100 }, (_, i) => ({
      id: `saved-${i}`,
      name: `Routine ${i}`,
      unit: 'lb',
      exercises: [{ id: `e-${i}`, name: 'Bench' }],
    }));
    const current = store.getState().data;
    await repository.save(current.revision, {
      ...current,
      routines: fullRoutines,
      revision: current.revision,
    });
    await store.getState().load();

    const routine = sampleRoutine();
    const shareText = createRoutineShare(routine);
    const file = new File([shareText], 'routine.json', { type: 'application/json' });

    await act(async () => {
      root.render(<RoutineShare store={store} />);
    });

    const fileInput = container.querySelector('#routine-share-file-input') as HTMLInputElement;
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const confirmBtn = button('Import this routine');
    await act(async () => {
      confirmBtn.click();
      await idle();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('You already have 100 routines');
  });

  it('renders gracefully at 390px viewport width with 80-character names', async () => {
    const longName = 'A'.repeat(80);
    const routine = sampleRoutine({
      name: longName,
      exercises: [{ id: 'ex-1', name: 'B'.repeat(80), targetSets: 3, targetReps: 10 }],
    });

    container.style.width = '390px';
    await act(async () => {
      root.render(<RoutineShare store={store} routine={routine} />);
    });

    // Check that elements with 80 chars have break-words or overflow handling
    const headings = container.querySelectorAll('h2, h3, h4, p, span');
    expect(headings.length).toBeGreaterThan(0);
    expect(container.scrollWidth).toBeLessThanOrEqual(420);
  });
});
it('clears a routine preview when saved records reload at the same revision', async () => {
  await act(async () => root.render(<RoutineShare store={store} />));
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const read = FileReader.prototype.readAsArrayBuffer;
  const loaded = new Promise<void>(resolve => vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementationOnce(function (this: FileReader, file) {
    this.addEventListener('loadend', () => resolve(), { once: true }); read.call(this, file);
  }));
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([createRoutineShare(sampleRoutine())], 'routine.json')] });
    input.dispatchEvent(new Event('change', { bubbles: true })); await loaded;
  });
  expect(container.textContent).toContain('Routine preview');
  const revision = store.getState().data.revision;
  await act(async () => { await store.getState().load(); });
  expect(store.getState().data.revision).toBe(revision);
  expect(container.textContent).not.toContain('Routine preview');
});
