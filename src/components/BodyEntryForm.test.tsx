import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { BodyEntry } from '@/types/body';
import { BodyEntryForm } from './BodyEntryForm';

vi.setConfig({ testTimeout: 30_000 });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BodyEntryForm', () => {
  let root: Root;
  let container: HTMLDivElement;
  let store: WorkoutStore;
  let repository: ReturnType<typeof createWorkoutRepository>;

  function idle() {
    if (!store.getState().busy) return Promise.resolve();
    return new Promise<void>(resolve => {
      const unsubscribe = store.subscribe(state => {
        if (!state.busy) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  beforeEach(() => {
    repository = createWorkoutRepository(new IDBFactory());
    store = createWorkoutStore(repository);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  function inputByLabel(label: string) {
    const found = [...container.querySelectorAll('label')].find(item => item.textContent?.trim().toLowerCase().startsWith(label.toLowerCase()));
    const control = found && (found.control ?? found.querySelector('input, select, textarea'));
    if (!control) throw new Error(`Missing field for label ${label}`);
    return control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  }

  async function typeValue(label: string, value: string) {
    const control = inputByLabel(label);
    await act(async () => {
      const prototype = control instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(control, value);
      control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }

  async function submitForm() {
    await act(async () => {
      container.querySelector<HTMLFormElement>('form')!.requestSubmit();
      await idle();
    });
  }

  it('adds a new entry with weight, unit, measurements and note', async () => {
    await store.getState().load();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: null, revision: store.getState().data.revision }}
          onReopen={() => {}}
          onClose={onClose}
        />
      );
    });

    await typeValue('Body weight', '175.5');
    await typeValue('Weight unit', 'lb');
    await typeValue('Waist', '32');
    await typeValue('Length unit', 'in');
    await typeValue('Note', 'Felt energetic');

    await submitForm();

    expect(onClose).toHaveBeenCalledWith(true);
    const bodyLog = store.getState().data.bodyLog ?? [];
    expect(bodyLog.length).toBe(1);
    expect(bodyLog[0].weight).toBe(175.5);
    expect(bodyLog[0].unit).toBe('lb');
    expect(bodyLog[0].measurements?.waist).toBe(32);
    expect(bodyLog[0].lengthUnit).toBe('in');
    expect(bodyLog[0].note).toBe('Felt energetic');
  });

  it('adds an entry with only measurements without weight', async () => {
    await store.getState().load();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: null, revision: store.getState().data.revision }}
          onReopen={() => {}}
          onClose={onClose}
        />
      );
    });

    await typeValue('Chest', '42');
    await typeValue('Length unit', 'in');
    await submitForm();

    expect(onClose).toHaveBeenCalledWith(true);
    const bodyLog = store.getState().data.bodyLog ?? [];
    expect(bodyLog.length).toBe(1);
    expect(bodyLog[0].weight).toBeUndefined();
    expect(bodyLog[0].unit).toBeUndefined();
    expect(bodyLog[0].measurements?.chest).toBe(42);
    expect(bodyLog[0].lengthUnit).toBe('in');
  });

  it('rejects blank numbers with store error and does not save 0', async () => {
    await store.getState().load();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: null, revision: store.getState().data.revision }}
          onReopen={() => {}}
          onClose={onClose}
        />
      );
    });

    // Submit with both weight and measurements empty
    await submitForm();

    expect(onClose).not.toHaveBeenCalled();
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Enter a body weight or at least one measurement for this entry.');
    expect(store.getState().data.bodyLog?.length ?? 0).toBe(0);
  });

  it('rejects cleared date with store error', async () => {
    await store.getState().load();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: null, revision: store.getState().data.revision }}
          onReopen={() => {}}
          onClose={onClose}
        />
      );
    });

    await typeValue('Date', '');
    await typeValue('Body weight', '175');
    await submitForm();

    expect(onClose).not.toHaveBeenCalled();
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Choose a valid date for this body log entry.');
  });

  it('cancels without saving when Cancel is clicked', async () => {
    await store.getState().load();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: null, revision: store.getState().data.revision }}
          onReopen={() => {}}
          onClose={onClose}
        />
      );
    });

    const cancelBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cancel');
    expect(cancelBtn).toBeTruthy();

    await act(async () => {
      cancelBtn?.click();
    });

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('updates an existing entry using store.updateBodyEntry with expectedRevision', async () => {
    const entry: BodyEntry = {
      id: 'entry-1',
      date: new Date(2026, 10, 5).getTime(),
      weight: 180,
      unit: 'lb',
    };
    await repository.save(0, { ...emptyWorkoutData(), revision: 0, bodyLog: [entry] });
    await store.getState().load();

    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: entry.id, revision: store.getState().data.revision, entry }}
          onReopen={() => {}}
          onClose={onClose}
        />
      );
    });

    // Check pre-filled weight
    const weightInput = inputByLabel('Body weight') as HTMLInputElement;
    expect(weightInput.value).toBe('180');

    // Change weight
    await typeValue('Body weight', '182');
    await submitForm();

    expect(onClose).toHaveBeenCalledWith(true);
    const updated = store.getState().data.bodyLog?.[0];
    expect(updated?.weight).toBe(182);
  });

  it('keeps typed draft and shows Reopen/Reload button on revision conflict', async () => {
    const entry: BodyEntry = {
      id: 'entry-1',
      date: new Date(2026, 10, 5).getTime(),
      weight: 180,
      unit: 'lb',
    };
    await repository.save(0, { ...emptyWorkoutData(), revision: 0, bodyLog: [entry] });
    await store.getState().load();

    const staleRevision = store.getState().data.revision;
    // Trigger an external store mutation to bump revision
    await store.getState().addBodyEntry({ date: Date.now(), weight: 200, unit: 'lb' });
    expect(store.getState().data.revision).toBeGreaterThan(staleRevision);

    const onReopen = vi.fn();
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <BodyEntryForm
          store={store}
          editing={{ id: entry.id, revision: staleRevision, entry }}
          onReopen={onReopen}
          onClose={onClose}
        />
      );
    });

    await typeValue('Body weight', '185');
    await submitForm();

    expect(onClose).not.toHaveBeenCalled();
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Body log changed');

    // Typed draft is kept
    const weightInput = inputByLabel('Body weight') as HTMLInputElement;
    expect(weightInput.value).toBe('185');

    // Reopen/Reload button is offered
    const reopenBtn = [...container.querySelectorAll('button')].find(b => /reopen|reload/i.test(b.textContent ?? ''));
    expect(reopenBtn).toBeTruthy();

    await act(async () => {
      reopenBtn?.click();
    });
    expect(onReopen).toHaveBeenCalled();
  });
});
