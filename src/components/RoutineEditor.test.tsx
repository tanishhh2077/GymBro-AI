import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { WorkoutRoutine } from '@/types/workout';
import { RoutineEditor } from './RoutineEditor';
import { createUnsavedChanges, DISCARD_MESSAGE, UnsavedChangesContext } from './unsavedChanges';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('RoutineEditor', () => {
  let root: Root;
  let container: HTMLDivElement;
  let store: WorkoutStore;
  let repository: ReturnType<typeof createWorkoutRepository>;
  let sequence: number;

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
    container.remove();
    vi.restoreAllMocks();
  });

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

  function button(name: string) {
    const found = [...container.querySelectorAll('button')].find(
      el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name,
    );
    if (!found) throw new Error(`Missing button "${name}"`);
    return found;
  }

  async function click(name: string) {
    await act(async () => {
      button(name).click();
      await idle();
    });
  }

  function field(labelText: string) {
    const found = [...container.querySelectorAll('label')].find(
      el => el.textContent?.trim() === labelText || el.textContent?.includes(labelText),
    );
    if (!found) throw new Error(`Missing label "${labelText}"`);
    const control = (found.control ?? found.querySelector('input, select') ?? (found.htmlFor ? document.getElementById(found.htmlFor) : null)) as HTMLInputElement | HTMLSelectElement | null;
    if (!control) throw new Error(`Missing input/select for "${labelText}"`);
    return control;
  }

  async function type(labelText: string, value: string) {
    const control = field(labelText);
    await act(async () => {
      const proto = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(control, value);
      control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }

  async function toggleCheckbox(labelText: string) {
    const found = [...container.querySelectorAll('label')].find(
      el => el.textContent?.trim() === labelText || el.textContent?.includes(labelText),
    );
    if (!found) throw new Error(`Missing checkbox label "${labelText}"`);
    const input = (found.querySelector('input[type="checkbox"]') ?? (found.htmlFor ? document.getElementById(found.htmlFor) : null)) as HTMLInputElement | null;
    if (!input) throw new Error(`Missing checkbox input for "${labelText}"`);
    await act(async () => {
      input.click();
    });
  }

  async function submit() {
    const form = container.querySelector<HTMLFormElement>('form[aria-label="Save routine"]');
    if (!form) throw new Error('Missing form[aria-label="Save routine"]');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await idle();
    });
  }

  describe('create and edit flows', () => {
    it('creates a new routine with custom name, unit, and exercise', async () => {
      const onClose = vi.fn();
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={onClose} />);
      });

      expect(container.querySelector('h1')?.textContent).toBe('New routine');
      expect(field('Routine weight unit').value).toBe('lb');

      await type('Routine name', 'Pull Day');
      await type('Routine weight unit', 'kg');
      await type('Exercise 1 name', 'Barbell Row');

      await submit();

      expect(onClose).toHaveBeenCalledWith(true);
      const routines = store.getState().data.routines ?? [];
      expect(routines).toHaveLength(1);
      expect(routines[0]).toMatchObject({
        name: 'Pull Day',
        unit: 'kg',
        exercises: [{ name: 'Barbell Row' }],
      });
    });

    it('loads an existing routine with its exercises and targets, then saves updates', async () => {
      await store.getState().createRoutine({
        name: 'Leg Day',
        unit: 'lb',
        exercises: [
          { name: 'Squat', targetSets: 5, targetReps: 5, targetWeight: 315 },
          { name: 'Romanian Deadlift', targetSets: 3, targetReps: 8 },
        ],
      });
      const routine = store.getState().data.routines![0];
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <RoutineEditor
            store={store}
            routine={routine}
            expectedRevision={store.getState().data.revision}
            onClose={onClose}
          />,
        );
      });

      expect(container.querySelector('h1')?.textContent).toBe('Edit routine');
      expect((field('Routine name') as HTMLInputElement).value).toBe('Leg Day');
      expect((field('Routine weight unit') as HTMLSelectElement).value).toBe('lb');
      expect((field('Exercise 1 name') as HTMLInputElement).value).toBe('Squat');
      expect((field('Target sets for exercise 1') as HTMLInputElement).value).toBe('5');
      expect((field('Target reps for exercise 1') as HTMLInputElement).value).toBe('5');
      expect((field('Target weight for exercise 1 (lb)') as HTMLInputElement).value).toBe('315');
      expect((field('Exercise 2 name') as HTMLInputElement).value).toBe('Romanian Deadlift');
      expect((field('Target sets for exercise 2') as HTMLInputElement).value).toBe('3');
      expect((field('Target reps for exercise 2') as HTMLInputElement).value).toBe('8');
      expect((field('Target weight for exercise 2 (lb)') as HTMLInputElement).value).toBe('');

      await type('Routine name', 'Leg Day Heavy');
      await type('Target weight for exercise 1 (lb)', '325');

      await submit();

      expect(onClose).toHaveBeenCalledWith(true);
      const updated = store.getState().data.routines![0];
      expect(updated.name).toBe('Leg Day Heavy');
      expect(updated.exercises[0].targetWeight).toBe(325);
      expect(updated.exercises[1].name).toBe('Romanian Deadlift');
    });

    it('cancels edit without prompt when clean, but prompts when dirty', async () => {
      const onClose = vi.fn();
      const unsaved = createUnsavedChanges();
      await act(async () => {
        root.render(
          <UnsavedChangesContext.Provider value={unsaved}>
            <RoutineEditor store={store} expectedRevision={0} onClose={onClose} />
          </UnsavedChangesContext.Provider>,
        );
      });

      const confirmSpy = vi.spyOn(window, 'confirm');

      // Clean cancel
      await click('Cancel routine edit');
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledWith(false);

      // Make dirty
      onClose.mockClear();
      await type('Routine name', 'Unsaved draft');
      expect(unsaved.forms.size).toBeGreaterThan(0);

      // User rejects discard
      confirmSpy.mockReturnValueOnce(false);
      await click('Cancel routine edit');
      expect(confirmSpy).toHaveBeenCalledWith(DISCARD_MESSAGE);
      expect(onClose).not.toHaveBeenCalled();

      // User accepts discard
      confirmSpy.mockReturnValueOnce(true);
      await click('Cancel routine edit');
      expect(confirmSpy).toHaveBeenCalledWith(DISCARD_MESSAGE);
      expect(onClose).toHaveBeenCalledWith(false);
    });
  });

  describe('exercise add, remove, and reorder', () => {
    it('adds exercises up to limit and disables Add button at 100 rows', async () => {
      const routine: WorkoutRoutine = {
        id: 'r-100',
        name: 'Huge routine',
        unit: 'lb',
        exercises: Array.from({ length: 99 }, (_, i) => ({ id: `e-${i}`, name: `Exercise ${i + 1}` })),
      };

      await act(async () => {
        root.render(
          <RoutineEditor store={store} routine={routine} expectedRevision={0} onClose={() => {}} />,
        );
      });

      const addBtn = button('Add routine exercise');
      expect(addBtn.disabled).toBe(false);

      await click('Add routine exercise');
      expect(container.querySelectorAll('fieldset fieldset')).toHaveLength(100);
      expect(button('Add routine exercise').disabled).toBe(true);
    });

    it('removes exercises and prunes a superset down to plain exercise when only one member remains', async () => {
      const routine: WorkoutRoutine = {
        id: 'r-superset',
        name: 'Superset routine',
        unit: 'kg',
        exercises: [
          { id: 'e-1', name: 'Bicep Curl', superset: 'group-a' },
          { id: 'e-2', name: 'Tricep Extension', superset: 'group-a' },
          { id: 'e-3', name: 'Lateral Raise' },
        ],
      };

      await act(async () => {
        root.render(
          <RoutineEditor store={store} routine={routine} expectedRevision={0} onClose={() => {}} />,
        );
      });

      expect(container.querySelector('[role="group"][aria-label="Superset A"]')).not.toBeNull();

      // Remove Bicep Curl (first exercise in group-a)
      await click('Remove routine exercise 1');

      // group-a now only has 1 member (Tricep Extension), so pruneGroups should ungroup it
      expect(container.querySelector('[role="group"]')).toBeNull();
      expect(field('Exercise 1 name').value).toBe('Tricep Extension');
      expect(field('Exercise 2 name').value).toBe('Lateral Raise');
    });

    it('disables save and shows guidance when all exercises are removed', async () => {
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={() => {}} />);
      });

      expect(button('Save routine').disabled).toBe(false);
      await click('Remove routine exercise 1');

      expect(container.textContent).toContain('Add at least one exercise before saving.');
      expect(button('Save routine').disabled).toBe(true);
    });

    it('reorders standalone exercises with boundary disable checks', async () => {
      const routine: WorkoutRoutine = {
        id: 'r-order',
        name: 'Order test',
        unit: 'lb',
        exercises: [
          { id: 'e-1', name: 'First' },
          { id: 'e-2', name: 'Second' },
          { id: 'e-3', name: 'Third' },
        ],
      };

      await act(async () => {
        root.render(
          <RoutineEditor store={store} routine={routine} expectedRevision={0} onClose={() => {}} />,
        );
      });

      expect(button('Move exercise 1 up').disabled).toBe(true);
      expect(button('Move exercise 1 down').disabled).toBe(false);
      expect(button('Move exercise 3 down').disabled).toBe(true);

      // Move First down
      await click('Move exercise 1 down');
      expect(field('Exercise 1 name').value).toBe('Second');
      expect(field('Exercise 2 name').value).toBe('First');
      expect(field('Exercise 3 name').value).toBe('Third');

      // Move First down again
      await click('Move exercise 2 down');
      expect(field('Exercise 1 name').value).toBe('Second');
      expect(field('Exercise 2 name').value).toBe('Third');
      expect(field('Exercise 3 name').value).toBe('First');
      expect(button('Move exercise 3 down').disabled).toBe(true);

      // Move First up
      await click('Move exercise 3 up');
      expect(field('Exercise 1 name').value).toBe('Second');
      expect(field('Exercise 2 name').value).toBe('First');
      expect(field('Exercise 3 name').value).toBe('Third');
    });

    it('reorders entire superset blocks together when moved past neighbouring exercises', async () => {
      const routine: WorkoutRoutine = {
        id: 'r-block-order',
        name: 'Block order test',
        unit: 'kg',
        exercises: [
          { id: 'e-1', name: 'Warmup Jog' },
          { id: 'e-2', name: 'Bench Press', superset: 'ss1' },
          { id: 'e-3', name: 'Dumbbell Row', superset: 'ss1' },
          { id: 'e-4', name: 'Cooldown Stretch' },
        ],
      };

      await act(async () => {
        root.render(
          <RoutineEditor store={store} routine={routine} expectedRevision={0} onClose={() => {}} />,
        );
      });

      // Move superset block up past Warmup Jog
      await click('Move exercise 2 up');
      expect(field('Exercise 1 name').value).toBe('Bench Press');
      expect(field('Exercise 2 name').value).toBe('Dumbbell Row');
      expect(field('Exercise 3 name').value).toBe('Warmup Jog');
      expect(field('Exercise 4 name').value).toBe('Cooldown Stretch');

      // Superset block is now at the top; its Move Up buttons should be disabled
      expect(button('Move exercise 1 up').disabled).toBe(true);
      expect(button('Move exercise 2 up').disabled).toBe(true);

      // Move Warmup Jog down past Cooldown Stretch
      await click('Move exercise 3 down');
      expect(field('Exercise 3 name').value).toBe('Cooldown Stretch');
      expect(field('Exercise 4 name').value).toBe('Warmup Jog');
    });
  });

  describe('optional target sets, reps, and weight', () => {
    it('omits blank targets on save and accepts zero or decimal targets', async () => {
      const onClose = vi.fn();
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={onClose} />);
      });

      await type('Routine name', 'Targets test');
      await type('Exercise 1 name', 'Pull-up');
      // Exercise 1: all targets left blank

      // Add Exercise 2
      await click('Add routine exercise');
      await type('Exercise 2 name', 'Deadlift');
      await type('Target sets for exercise 2', '3');
      await type('Target reps for exercise 2', '5');
      await type('Target weight for exercise 2 (lb)', '315.5');

      // Add Exercise 3
      await click('Add routine exercise');
      await type('Exercise 3 name', 'Plank');
      await type('Target sets for exercise 3', '4');
      await type('Target weight for exercise 3 (lb)', '0'); // explicit 0 weight

      await submit();

      expect(onClose).toHaveBeenCalledWith(true);
      const saved = store.getState().data.routines![0];
      expect(saved.exercises).toEqual([
        { id: expect.any(String), name: 'Pull-up' },
        { id: expect.any(String), name: 'Deadlift', targetSets: 3, targetReps: 5, targetWeight: 315.5 },
        { id: expect.any(String), name: 'Plank', targetSets: 4, targetWeight: 0 },
      ]);
    });
  });

  describe('superset grouping and bodyweight rows keeping their fields on save', () => {
    it('groups neighbouring exercises into a superset and ungroups them cleanly', async () => {
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={() => {}} />);
      });

      await type('Routine name', 'Superset create');
      await type('Exercise 1 name', 'Dip');

      await click('Add routine exercise');
      await type('Exercise 2 name', 'Chin-up');

      await click('Add routine exercise');
      await type('Exercise 3 name', 'Crunch');

      // Group Exercise 1 and 2
      const groupBtn = button('Group as superset');
      expect(groupBtn.disabled).toBe(true);

      await toggleCheckbox('Select exercise 1 for superset');
      expect(button('Group as superset').disabled).toBe(true);

      await toggleCheckbox('Select exercise 2 for superset');
      expect(button('Group as superset').disabled).toBe(false);

      await click('Group as superset');

      // Should render in a role="group" with label "Superset A"
      const groupEl = container.querySelector('[role="group"][aria-label="Superset A"]');
      expect(groupEl).not.toBeNull();
      expect(groupEl?.textContent).toContain('Superset A · 2 exercises');

      // Ungroup superset
      await click('Ungroup Superset A');
      expect(container.querySelector('[role="group"]')).toBeNull();
      expect(field('Exercise 1 name').value).toBe('Dip');
      expect(field('Exercise 2 name').value).toBe('Chin-up');
    });

    it('refuses to group non-neighbouring exercises and displays an error alert', async () => {
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={() => {}} />);
      });

      await type('Exercise 1 name', 'First');
      await click('Add routine exercise');
      await type('Exercise 2 name', 'Middle');
      await click('Add routine exercise');
      await type('Exercise 3 name', 'Last');

      // Select Exercise 1 and Exercise 3 (skipping Exercise 2)
      await toggleCheckbox('Select exercise 1 for superset');
      await toggleCheckbox('Select exercise 3 for superset');

      await click('Group as superset');

      const alert = container.querySelector('[role="alert"]');
      expect(alert?.textContent).toBe(
        'Choose exercises that are next to each other. Move them together first, then group them.',
      );
      expect(container.querySelector('[role="group"]')).toBeNull();
    });

    it('preserves bodyweight row with negative added weight and superset on save', async () => {
      const onClose = vi.fn();
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={onClose} />);
      });

      await type('Routine name', 'Assisted Routine');
      await type('Exercise 1 name', 'Assisted Dip');
      await toggleCheckbox('Bodyweight exercise for exercise 1');

      // Verify label updated for bodyweight
      expect(field('Target added weight for exercise 1 (lb)')).toBeDefined();
      await type('Target added weight for exercise 1 (lb)', '-25');
      await type('Target reps for exercise 1', '10');

      await click('Add routine exercise');
      await type('Exercise 2 name', 'Push-up');
      await toggleCheckbox('Bodyweight exercise for exercise 2');
      await type('Target reps for exercise 2', '15');

      // Group them into superset
      await toggleCheckbox('Select exercise 1 for superset');
      await toggleCheckbox('Select exercise 2 for superset');
      await click('Group as superset');

      await submit();

      expect(onClose).toHaveBeenCalledWith(true);
      const routine = store.getState().data.routines![0];
      expect(routine.exercises[0]).toMatchObject({
        name: 'Assisted Dip',
        bodyweight: true,
        targetWeight: -25,
        targetReps: 10,
        superset: expect.any(String),
      });
      expect(routine.exercises[1]).toMatchObject({
        name: 'Push-up',
        bodyweight: true,
        targetReps: 15,
        superset: routine.exercises[0].superset,
      });
    });

    it('preserves untouched bodyweight and superset properties when editing', async () => {
      await store.getState().createRoutine({
        name: 'Existing Routine',
        unit: 'lb',
        exercises: [
          { name: 'Pull-up', bodyweight: true, targetReps: 8, superset: 'grp1' },
          { name: 'Dip', bodyweight: true, targetReps: 12, superset: 'grp1' },
        ],
      });
      const routine = store.getState().data.routines![0];
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <RoutineEditor
            store={store}
            routine={routine}
            expectedRevision={store.getState().data.revision}
            onClose={onClose}
          />,
        );
      });

      // Modify only routine name
      await type('Routine name', 'Existing Routine Renamed');
      await submit();

      expect(onClose).toHaveBeenCalledWith(true);
      const updated = store.getState().data.routines![0];
      expect(updated.name).toBe('Existing Routine Renamed');
      expect(updated.exercises[0].bodyweight).toBe(true);
      expect(updated.exercises[0].superset).toBeDefined();
      expect(updated.exercises[1].bodyweight).toBe(true);
      expect(updated.exercises[1].superset).toBe(updated.exercises[0].superset);
    });
  });

  describe('validation errors keeping typed input', () => {
    it('keeps all typed inputs and does not close when save fails validation', async () => {
      const onClose = vi.fn();
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={onClose} />);
      });

      await type('Routine name', 'Valid Routine');
      await type('Exercise 1 name', 'Bench press');
      await type('Target sets for exercise 1', '4');
      await type('Target reps for exercise 1', '8');
      // Set weight exceeding allowable 10000 range to trigger store validation error
      await type('Target weight for exercise 1 (lb)', '10001');

      await submit();

      expect(onClose).not.toHaveBeenCalled();
      expect(store.getState().error).toBe('Enter a target weight from 0 to 10000, or leave it blank.');

      // Verify all typed inputs remain in the DOM
      expect((field('Routine name') as HTMLInputElement).value).toBe('Valid Routine');
      expect((field('Exercise 1 name') as HTMLInputElement).value).toBe('Bench press');
      expect((field('Target sets for exercise 1') as HTMLInputElement).value).toBe('4');
      expect((field('Target reps for exercise 1') as HTMLInputElement).value).toBe('8');
      expect((field('Target weight for exercise 1 (lb)') as HTMLInputElement).value).toBe('10001');

      // Correct the error and submit successfully
      await type('Target weight for exercise 1 (lb)', '225');
      await submit();

      expect(onClose).toHaveBeenCalledWith(true);
      expect(store.getState().data.routines![0].exercises[0].targetWeight).toBe(225);
    });
  });

  describe('stale-revision refusal', () => {
    it('refuses to save when expected revision does not match current store revision', async () => {
      await store.getState().createRoutine({
        name: 'Concurrent Routine',
        unit: 'lb',
        exercises: [{ name: 'Overhead Press' }],
      });
      const routine = store.getState().data.routines![0];
      const initialRevision = store.getState().data.revision;

      const onClose = vi.fn();
      await act(async () => {
        root.render(
          <RoutineEditor
            store={store}
            routine={routine}
            expectedRevision={initialRevision}
            onClose={onClose}
          />,
        );
      });

      // Simulate a concurrent change that bumps the store's revision
      await act(async () => {
        await store.getState().createRoutine({
          name: 'Another Routine elsewhere',
          unit: 'lb',
          exercises: [{ name: 'Deadlift' }],
        });
      });
      expect(store.getState().data.revision).toBeGreaterThan(initialRevision);

      // Now user attempts to save their edits
      await type('Routine name', 'Concurrent Routine Modified');
      await type('Exercise 1 name', 'Push Press');
      await submit();

      // updateRoutine rejects due to data.revision !== expectedRevision
      expect(onClose).not.toHaveBeenCalled();
      expect(store.getState().error).toBe(
        'Saved workouts or routines changed. Reopen this routine before saving your edits.',
      );

      // Edits remain preserved in the editor
      expect((field('Routine name') as HTMLInputElement).value).toBe('Concurrent Routine Modified');
      expect((field('Exercise 1 name') as HTMLInputElement).value).toBe('Push Press');
    });
  });

  describe('disabled states', () => {
    it('disables form controls when store is busy or needs reload', async () => {
      await act(async () => {
        root.render(<RoutineEditor store={store} expectedRevision={0} onClose={() => {}} />);
      });

      const formFieldset = container.querySelector<HTMLFieldSetElement>('form fieldset');
      expect(formFieldset?.disabled).toBe(false);

      // Busy state
      await act(async () => {
        store.setState({ busy: true });
      });
      expect(formFieldset?.disabled).toBe(true);
      expect((button('Cancel routine edit') as HTMLButtonElement).disabled).toBe(true);

      // Needs reload state
      await act(async () => {
        store.setState({ busy: false, needsReload: true });
      });
      expect(formFieldset?.disabled).toBe(true);
      expect((button('Cancel routine edit') as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
