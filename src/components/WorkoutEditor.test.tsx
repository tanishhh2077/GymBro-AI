import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { createUnsavedChanges, UnsavedChangesContext } from './unsavedChanges';
import { WorkoutEditor } from './WorkoutEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkoutEditor superset removal prompt', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('prompts "Discard unsaved changes?" before removing an exercise from a 2-exercise superset when the companion has unsaved input', async () => {
    const repository = createWorkoutRepository(new IDBFactory());
    await repository.save(0, {
      ...emptyWorkoutData(),
      active: {
        id: 'w1',
        name: 'Upper Body',
        unit: 'lb',
        startedAt: 1000,
        finishedAt: null,
        exercises: [
          { id: 'e1', name: 'Bench press', superset: 'ss1', sets: [] },
          { id: 'e2', name: 'Incline press', superset: 'ss1', sets: [] },
        ],
      },
    });
    const store = createWorkoutStore(repository);
    await store.getState().load();

    const unsaved = createUnsavedChanges();
    await act(async () => {
      root.render(
        <UnsavedChangesContext.Provider value={unsaved}>
          <WorkoutEditor store={store} onFinished={() => {}} />
        </UnsavedChangesContext.Provider>,
      );
    });

    // Incline press (e2) entry form: type unsaved input into reps
    const inclineSection = container.querySelector('section[aria-label="Incline press"]');
    expect(inclineSection).toBeTruthy();
    const repsInput = inclineSection!.querySelector<HTMLInputElement>('input[type="number"]');
    expect(repsInput).toBeTruthy();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(repsInput, '10');
      repsInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(unsaved.forms.size).toBeGreaterThan(0);

    // Click remove on Bench press (e1)
    const removeBench = container.querySelector<HTMLButtonElement>('button[aria-label="Remove exercise Bench press"]');
    expect(removeBench).toBeTruthy();

    const confirmSpy = vi.spyOn(window, 'confirm');

    // Case 1: User cancels "Discard unsaved changes?"
    confirmSpy.mockReturnValueOnce(false);
    await act(async () => {
      removeBench!.click();
    });

    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes?');
    // It should NOT proceed to the second prompt or remove the exercise
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(store.getState().data.active?.exercises).toHaveLength(2);

    // Case 2: User confirms "Discard unsaved changes?" then confirms removal
    confirmSpy.mockReset();
    confirmSpy.mockReturnValueOnce(true); // Discard unsaved changes?
    confirmSpy.mockReturnValueOnce(true); // Remove Bench press and its logged sets?

    await act(async () => {
      removeBench!.click();
    });
    // Allow the async removeExercise to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(confirmSpy).toHaveBeenNthCalledWith(1, 'Discard unsaved changes?');
    expect(confirmSpy).toHaveBeenNthCalledWith(2, 'Remove Bench press and its logged sets?');
    expect(store.getState().data.active?.exercises).toHaveLength(1);
    expect(store.getState().data.active?.exercises[0].id).toBe('e2');
  });

  it('does not prompt "Discard unsaved changes?" when removing an exercise from a 2-exercise superset if neither has unsaved input', async () => {
    const repository = createWorkoutRepository(new IDBFactory());
    await repository.save(0, {
      ...emptyWorkoutData(),
      active: {
        id: 'w1',
        name: 'Upper Body',
        unit: 'lb',
        startedAt: 1000,
        finishedAt: null,
        exercises: [
          { id: 'e1', name: 'Bench press', superset: 'ss1', sets: [] },
          { id: 'e2', name: 'Incline press', superset: 'ss1', sets: [] },
        ],
      },
    });
    const store = createWorkoutStore(repository);
    await store.getState().load();

    const unsaved = createUnsavedChanges();
    await act(async () => {
      root.render(
        <UnsavedChangesContext.Provider value={unsaved}>
          <WorkoutEditor store={store} onFinished={() => {}} />
        </UnsavedChangesContext.Provider>,
      );
    });

    const removeBench = container.querySelector<HTMLButtonElement>('button[aria-label="Remove exercise Bench press"]');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await act(async () => {
      removeBench!.click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Only "Remove Bench press and its logged sets?" should be called
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith('Remove Bench press and its logged sets?');
    expect(store.getState().data.active?.exercises).toHaveLength(1);
  });
});
