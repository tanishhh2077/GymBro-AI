import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { UnsavedChangesContext, createUnsavedChanges, type UnsavedChanges } from './unsavedChanges';
import { ExerciseNoteField } from './ExerciseNoteField';

vi.setConfig({ testTimeout: 30_000 });

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
let unsaved: UnsavedChanges;

beforeEach(() => {
  repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository);
  unsaved = createUnsavedChanges();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

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

async function render(name: string, initialNotes?: Record<string, string>) {
  if (initialNotes) {
    await repository.save(0, { ...emptyWorkoutData(), exerciseNotes: initialNotes });
  }
  await store.getState().load();
  await act(async () => {
    root.render(
      <UnsavedChangesContext.Provider value={unsaved}>
        <ExerciseNoteField store={store} name={name} />
      </UnsavedChangesContext.Provider>
    );
  });
}

function textarea(): HTMLTextAreaElement {
  const el = container.querySelector('textarea');
  if (!el) throw new Error('Missing textarea');
  return el;
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(
    item => (item.getAttribute('aria-label') ?? item.textContent?.trim()) === label
  );
  if (!found) throw new Error(`Missing button "${label}"`);
  return found;
}

async function typeNote(value: string) {
  const el = textarea();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submitForm() {
  await act(async () => {
    container.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await idle();
  });
}

describe('ExerciseNoteField', () => {
  it('starts collapsed by default and shows whether a note is present', async () => {
    await render('Bench press');
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Exercise note');
    expect(summary?.textContent?.toLowerCase()).toMatch(/(none|no note|empty)/);
  });

  it('previews existing saved note for exact exercise name when collapsed and truncates long previews', async () => {
    const longNote = 'A very long exercise note exceeding forty characters in length for testing preview truncation.';
    await render('Bench press', { 'Bench press': longNote });
    const summary = container.querySelector('summary');
    expect(summary?.textContent).toContain('Exercise note');
    expect(summary?.textContent).toContain(longNote.slice(0, 37) + '...');

    // Case sensitivity / exact name matching check
    await act(async () => {
      root.render(
        <UnsavedChangesContext.Provider value={unsaved}>
          <ExerciseNoteField store={store} name="bench press" />
        </UnsavedChangesContext.Provider>
      );
    });
    const summary2 = container.querySelector('summary');
    expect(summary2?.textContent?.toLowerCase()).toMatch(/(none|no note|empty)/);
  });

  it('shows textarea with character counter (max 500) and accessible controls', async () => {
    await render('Squat', { Squat: 'Keep chest up.' });
    const ta = textarea();
    expect(ta.value).toBe('Keep chest up.');
    expect(ta.maxLength).toBe(500);

    const label = container.querySelector('label[for="' + ta.id + '"]');
    expect(label).not.toBeNull();
    expect(label?.textContent).toContain('Exercise note');

    const counter = container.querySelector(`[id="${ta.id}-count"]`);
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toContain('14 / 500 characters');

    const saveBtn = button('Save note');
    expect(saveBtn).not.toBeNull();
  });

  it('saves a new exercise note to the store and updates status', async () => {
    await render('Deadlift');
    expect(textarea().value).toBe('');

    await typeNote('Drive through midfoot.');
    expect(textarea().value).toBe('Drive through midfoot.');
    expect(container.textContent).toContain('22 / 500 characters');

    await submitForm();

    expect(store.getState().data.exerciseNotes).toEqual({
      Deadlift: 'Drive through midfoot.',
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Note saved.');
    expect(container.querySelector('summary')?.textContent).toContain('Drive through midfoot.');
  });

  it('removes note when blank or whitespace is saved', async () => {
    await render('Overhead press', { 'Overhead press': 'Brace core.' });
    expect(textarea().value).toBe('Brace core.');

    await typeNote('   ');
    await submitForm();

    expect(store.getState().data.exerciseNotes).toEqual({});
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Note removed.');
    expect(container.querySelector('summary')?.textContent?.toLowerCase()).toMatch(/(none|no note|empty)/);
  });

  it('preserves multi-line notes with newlines and tabs', async () => {
    await render('Barbell Row');
    const multiLine = 'First cue.\nSecond cue.\n\tIndented third cue.';
    await typeNote(multiLine);
    await submitForm();

    expect(store.getState().data.exerciseNotes?.['Barbell Row']).toBe(multiLine);
    expect(textarea().value).toBe(multiLine);
  });

  it('handles revision conflict ("Exercise notes changed..."), keeps draft and provides Load current note button', async () => {
    await render('Pull-up', { 'Pull-up': 'Initial cue.' });
    expect(textarea().value).toBe('Initial cue.');

    // User types an unsaved draft
    await typeNote('My custom draft.');

    // Another process updates the store in the background, bumping the revision
    await act(async () => {
      await store.getState().setExerciseNote('Row', 'Keep back flat.');
    });

    // Saving now triggers revision mismatch error
    await submitForm();

    // Draft is kept intact
    expect(textarea().value).toBe('My custom draft.');

    // Error is displayed
    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Exercise notes changed');

    // "Load current note" button is available
    const loadBtn = button('Load current note');
    expect(loadBtn).not.toBeNull();

    // In the background, Pull-up was updated by someone else
    await act(async () => {
      await store.getState().setExerciseNote('Pull-up', 'Updated from remote.');
    });

    // Clicking "Load current note" loads the current saved note and clears conflict
    await act(async () => {
      loadBtn.click();
    });

    expect(textarea().value).toBe('Updated from remote.');
    expect(container.querySelector('[role="alert"]')).toBeNull();

    // Now editing and saving works without conflict
    await typeNote('Updated from remote with personal addition.');
    await submitForm();
    expect(store.getState().data.exerciseNotes?.['Pull-up']).toBe('Updated from remote with personal addition.');
  });

  it('registers unsaved draft with UnsavedChangesContext and unregisters when saved or reverted', async () => {
    await render('Bench press', { 'Bench press': 'Saved cue.' });
    expect(unsaved.forms.size).toBe(0);

    // Typing sets dirty state
    await typeNote('Saved cue edited.');
    expect(unsaved.forms.size).toBe(1);

    // Saving clears dirty state
    await submitForm();
    expect(unsaved.forms.size).toBe(0);

    // Typing again sets dirty state
    await typeNote('Another edit.');
    expect(unsaved.forms.size).toBe(1);

    // Reverting to saved text clears dirty state
    await typeNote('Saved cue edited.');
    expect(unsaved.forms.size).toBe(0);
  });

  it('resets draft when the exercise name prop changes', async () => {
    await render('Exercise A', { 'Exercise A': 'Cue A.', 'Exercise B': 'Cue B.' });
    expect(textarea().value).toBe('Cue A.');

    await act(async () => {
      root.render(
        <UnsavedChangesContext.Provider value={unsaved}>
          <ExerciseNoteField store={store} name="Exercise B" />
        </UnsavedChangesContext.Provider>
      );
    });

    expect(textarea().value).toBe('Cue B.');
    expect(container.querySelector('summary')?.textContent).toContain('Cue B.');
  });

  it('disables controls when the store is busy', async () => {
    await render('Bench press');
    const fieldset = container.querySelector('fieldset');
    expect(fieldset?.disabled).toBe(false);

    // Set busy state on the store
    await act(async () => {
      store.setState({ busy: true });
    });

    expect(fieldset?.disabled).toBe(true);
  });

  it('does not overflow at 390px with an 80-character exercise name', async () => {
    const longName = 'A'.repeat(80);
    const wrapper = document.createElement('div');
    wrapper.style.width = '390px';
    container.append(wrapper);

    await render(longName, { [longName]: 'Cue for very long exercise name.' });

    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.className).toContain('break-words');
  });
});
