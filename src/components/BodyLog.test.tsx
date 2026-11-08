import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { BodyEntry } from '@/types/body';
import { BodyLog } from './BodyLog';
import { createUnsavedChanges, DISCARD_MESSAGE, UnsavedChangesContext } from './unsavedChanges';

vi.setConfig({ testTimeout: 30_000 });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BodyLog', () => {
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

  it('renders header, empty state and navigates onHome', async () => {
    await store.getState().load();
    const onHome = vi.fn();

    await act(async () => {
      root.render(<BodyLog store={store} onHome={onHome} />);
    });

    expect(container.textContent).toContain('Body Log');
    expect(container.textContent).toContain('No body log entries yet.');

    const homeBtn = [...container.querySelectorAll('button')].find(b => /home/i.test(b.textContent ?? '') || /home/i.test(b.getAttribute('aria-label') ?? ''));
    expect(homeBtn).toBeTruthy();

    await act(async () => {
      homeBtn?.click();
    });

    expect(onHome).toHaveBeenCalled();
  });

  it('guards onHome with useConfirmLeave when unsaved changes exist in form', async () => {
    await store.getState().load();
    const onHome = vi.fn();
    const unsaved = createUnsavedChanges();

    await act(async () => {
      root.render(
        <UnsavedChangesContext.Provider value={unsaved}>
          <BodyLog store={store} onHome={onHome} />
        </UnsavedChangesContext.Provider>
      );
    });

    // Open add form
    const addBtn = [...container.querySelectorAll('button')].find(b => /add entry/i.test(b.textContent ?? ''));
    await act(async () => {
      addBtn?.click();
    });

    // Type a value to make form dirty
    const weightInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(weightInput, '185');
      weightInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(unsaved.forms.size).toBe(1);

    // Clicking home prompts confirmation
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const homeBtn = [...container.querySelectorAll('button')].find(b => /home/i.test(b.textContent ?? '') || /home/i.test(b.getAttribute('aria-label') ?? ''));

    await act(async () => {
      homeBtn?.click();
    });

    expect(confirmSpy).toHaveBeenCalledWith(DISCARD_MESSAGE);
    expect(onHome).not.toHaveBeenCalled();

    // Now accept discard
    confirmSpy.mockReturnValue(true);
    await act(async () => {
      homeBtn?.click();
    });
    expect(onHome).toHaveBeenCalled();
  });

  it('lists body entries newest first and displays formatted weight and measurements', async () => {
    const older: BodyEntry = {
      id: 'b1',
      date: new Date(2026, 10, 1).getTime(),
      weight: 180,
      unit: 'lb',
      measurements: { waist: 34 },
      lengthUnit: 'in',
    };
    const newer: BodyEntry = {
      id: 'b2',
      date: new Date(2026, 10, 5).getTime(),
      weight: 178.5,
      unit: 'lb',
      measurements: { waist: 33.5, chest: 42 },
      lengthUnit: 'in',
      note: 'Looking leaner',
    };

    await repository.save(0, { ...emptyWorkoutData(), revision: 0, bodyLog: [older, newer] });
    await store.getState().load();

    await act(async () => {
      root.render(<BodyLog store={store} onHome={() => {}} />);
    });

    const articles = container.querySelectorAll('article');
    expect(articles.length).toBe(2);

    // Newest first: articles[0] corresponds to newer entry
    expect(articles[0].textContent).toContain('178.5 lb');
    expect(articles[0].textContent).toContain('Waist: 33.5 in');
    expect(articles[0].textContent).toContain('Chest: 42 in');
    expect(articles[0].textContent).toContain('Looking leaner');

    expect(articles[1].textContent).toContain('180 lb');
    expect(articles[1].textContent).toContain('Waist: 34 in');
  });

  it('deletes an entry after confirmation dialog', async () => {
    const entry: BodyEntry = {
      id: 'b1',
      date: new Date(2026, 10, 1).getTime(),
      weight: 180,
      unit: 'lb',
    };
    await repository.save(0, { ...emptyWorkoutData(), revision: 0, bodyLog: [entry] });
    await store.getState().load();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await act(async () => {
      root.render(<BodyLog store={store} onHome={() => {}} />);
    });

    const deleteBtn = [...container.querySelectorAll('button')].find(b => /delete/i.test(b.getAttribute('aria-label') ?? '') || /delete/i.test(b.textContent ?? ''));
    expect(deleteBtn).toBeTruthy();

    await act(async () => {
      deleteBtn?.click();
      await idle();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(store.getState().data.bodyLog?.length ?? 0).toBe(0);
    expect(container.textContent).toContain('Body log entry deleted.');
  });

  it('does not delete when confirmation is cancelled', async () => {
    const entry: BodyEntry = {
      id: 'b1',
      date: new Date(2026, 10, 1).getTime(),
      weight: 180,
      unit: 'lb',
    };
    await repository.save(0, { ...emptyWorkoutData(), revision: 0, bodyLog: [entry] });
    await store.getState().load();

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await act(async () => {
      root.render(<BodyLog store={store} onHome={() => {}} />);
    });

    const deleteBtn = [...container.querySelectorAll('button')].find(b => /delete/i.test(b.getAttribute('aria-label') ?? '') || /delete/i.test(b.textContent ?? ''));

    await act(async () => {
      deleteBtn?.click();
      await idle();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(store.getState().data.bodyLog?.length ?? 0).toBe(1);
  });

  it('opens add form, creates an entry, and closes form with success notice', async () => {
    await store.getState().load();

    await act(async () => {
      root.render(<BodyLog store={store} onHome={() => {}} />);
    });

    const addBtn = [...container.querySelectorAll('button')].find(b => /add entry/i.test(b.textContent ?? ''));
    expect(addBtn).toBeTruthy();

    await act(async () => {
      addBtn?.click();
    });

    expect(container.querySelector('form')).toBeTruthy();

    const weightInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(weightInput, '190');
      weightInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      container.querySelector<HTMLFormElement>('form')!.requestSubmit();
      await idle();
    });

    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).toContain('Body log entry saved.');
    expect(store.getState().data.bodyLog?.length).toBe(1);
  });

  it('opens edit form, updates entry, and refreshes the card and chart', async () => {
    const entry: BodyEntry = {
      id: 'b1',
      date: new Date(2026, 10, 1).getTime(),
      weight: 180,
      unit: 'lb',
    };
    await repository.save(0, { ...emptyWorkoutData(), revision: 0, bodyLog: [entry] });
    await store.getState().load();

    await act(async () => {
      root.render(<BodyLog store={store} onHome={() => {}} />);
    });

    const editBtn = [...container.querySelectorAll('button')].find(b => /edit/i.test(b.getAttribute('aria-label') ?? '') || /edit/i.test(b.textContent ?? ''));
    expect(editBtn).toBeTruthy();

    await act(async () => {
      editBtn?.click();
    });

    expect(container.querySelector('form')).toBeTruthy();

    const weightInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(weightInput, '184');
      weightInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      container.querySelector<HTMLFormElement>('form')!.requestSubmit();
      await idle();
    });

    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).toContain('Body log entry saved.');
    expect(store.getState().data.bodyLog?.[0].weight).toBe(184);
    expect(container.querySelector('article')?.textContent).toContain('184 lb');
  });
});
