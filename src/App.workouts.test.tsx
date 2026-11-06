import { act, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkoutError } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  repository = createWorkoutRepository(new IDBFactory()); store = createWorkoutStore(repository);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); });
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => { const off = store.subscribe(s => { if (!s.busy) { off(); resolve(); } }); });
}
async function render() { await act(async () => root.render(<App workouts={store} />)); await act(idle); }
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  if (!found) throw new Error(`Missing button: ${name}`); return found;
}
async function settleLazy() {
  for (let i = 0; i < 100 && container.textContent?.includes('Opening video analysis'); i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); await settleLazy(); }
async function fill(name: string, value: string) {
  const label = [...container.querySelectorAll('label')].find(el => el.textContent?.trim() === name);
  const input = label && document.getElementById(label.htmlFor) as HTMLInputElement | HTMLSelectElement;
  if (!input) throw new Error(`Missing input: ${name}`);
  await act(async () => {
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit(name: string) {
  await act(async () => {
    container.querySelector(`form[aria-label="${name}"]`)!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await idle();
  });
}
async function draft() {
  await render(); await click('Start workout'); await fill('Workout name', 'Upper body');
  await fill('Weight unit', 'kg'); await submit('Start a workout');
  await fill('Exercise name', 'Bench press'); await submit('Add an exercise');
}
async function previousWorkout(unit: 'kg' | 'lb' = 'kg', exerciseName = 'Bench press') {
  await store.getState().load();
  await store.getState().startWorkout('Previous upper day', unit);
  await store.getState().addExercise(exerciseName);
  const exercise = store.getState().data.active!.exercises[0];
  await store.getState().addSet(exercise.id, 8, 60.5);
  await store.getState().addSet(exercise.id, 6, 65);
  await store.getState().finishWorkout();
}
async function autoRest() {
  const checkbox = container.querySelector<HTMLInputElement>('input[type=checkbox]');
  expect(checkbox, 'Auto-rest must be an explicit option').not.toBeNull();
  await act(async () => checkbox!.click());
}
it('shows both Home actions and an actual saved workout after logging and finish', async () => {
  await draft(); await fill('Reps', '8'); await fill('Weight (kg)', '60.5'); await submit('Log a set for Bench press');
  expect(container.querySelector('tbody')?.textContent).toContain('60.5 kg');
  await click('Finish workout');
  expect(container.textContent).toContain('Workout saved.');
  await click('Back to Home');
  expect(container.textContent).toContain('Upper body'); expect(button('Analyze video')).toBeTruthy();
  expect(store.getState().data.history[0].unit).toBe('kg');
});
it('preserves entered fields and confirmed state when a save fails', async () => {
  await draft(); vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await fill('Reps', '8'); await fill('Weight (kg)', '50'); await submit('Log a set for Bench press');
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Reload required');
  expect([...container.querySelectorAll('input')].map(el => el.value)).toContain('50');
  expect(store.getState().data.active?.exercises[0].sets).toEqual([]);
  expect(button('Reload saved workouts').disabled).toBe(false);
});
it('rejects invalid reps without recording a completed set', async () => {
  await draft(); await fill('Reps', '0'); await fill('Weight (kg)', '0'); await submit('Log a set for Bench press');
  expect(container.querySelector('[role=alert]')?.textContent).toContain('whole-number reps');
  expect(store.getState().data.active?.exercises[0].sets).toEqual([]);
});
it('requires confirmation before discarding the active workout', async () => {
  await draft(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Discard workout'); expect(store.getState().data.active).not.toBeNull();
  confirm.mockReturnValue(true); await click('Discard workout'); expect(store.getState().data.active).toBeNull();
});
it('keeps analysis usable when saved workout data cannot be opened', async () => {
  vi.spyOn(repository, 'load').mockRejectedValue(new Error('unavailable')); await render();
  expect(button('Start workout').disabled).toBe(true);
  await click('Analyze video');
  expect(container.querySelector('input[type=file]')).not.toBeNull();
  expect(container.textContent).toContain('could not be opened');
});

it('keeps the active workout timer through Home and Analyze navigation', async () => {
  await render(); expect(container.querySelector('output[aria-label="Rest time remaining"]')).toBeNull();
  await click('Start workout'); await fill('Workout name', 'Timer workout'); await submit('Start a workout');
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  await click('Start rest timer');
  await act(async () => vi.advanceTimersByTime(5_000));
  await click('Home'); expect(container.querySelector('output')?.textContent).toBe('1:25');
  await click('Analyze'); expect(container.querySelector('output')?.textContent).toBe('1:25');
  await click('Workout'); expect(container.querySelector('output')?.textContent).toBe('1:25');
});
it('removes the timer only after finish saves, then gives a new workout a fresh timer', async () => {
  await draft(); await fill('Reps', '5'); await fill('Weight (kg)', '20'); await submit('Log a set for Bench press');
  await autoRest();
  await click('Start rest timer');
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await click('Finish workout');
  expect(container.querySelector('output[aria-label="Rest time remaining"]')).not.toBeNull();
  await click('Reload saved workouts'); await click('Finish workout');
  expect(container.querySelector('output[aria-label="Rest time remaining"]')).toBeNull();
  await click('Back to Home'); await click('Start workout'); await fill('Workout name', 'Fresh workout'); await submit('Start a workout');
  expect(container.querySelector('output')?.textContent).toBe('1:30'); expect(button('Start rest timer')).toBeTruthy();
  expect(container.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked).toBe(false);
  vi.spyOn(window, 'confirm').mockReturnValue(true); await click('Discard workout');
  expect(container.querySelector('output[aria-label="Rest time remaining"]')).toBeNull();
});

it('copies a previous set into editable fields without recording a set', async () => {
  await previousWorkout(); await draft();
  expect(container.textContent).toContain('Previous upper day');
  expect(container.textContent).toContain('8 reps × 60.5 kg');
  await click('Use previous set 2 for Bench press');
  const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type=number]')];
  expect(inputs.map(input => input.value)).toEqual(['6', '65']);
  expect(document.activeElement).toBe(inputs[0]);
  expect(store.getState().data.active!.exercises[0].sets).toHaveLength(0);
  await submit('Log a set for Bench press');
  expect(store.getState().data.active!.exercises[0].sets[0]).toMatchObject({ reps: 6, weight: 65 });
  expect(document.activeElement).toBe(inputs[0]);
});

it.each([
  ['lb', 'Bench press'],
  ['kg', 'bench press'],
] as const)('keeps previous values separate for %s and exercise %s', async (unit, exerciseName) => {
  await previousWorkout(unit, exerciseName); await draft();
  expect(container.textContent).not.toContain('Previous upper day');
  expect(container.querySelector('button[aria-label^="Use previous set"]')).toBeNull();
});

it('repeats the latest actual set with a new ID and supports zero added load', async () => {
  await draft(); await fill('Reps', '8'); await fill('Weight (kg)', '0'); await submit('Log a set for Bench press');
  await fill('Reps', '12'); await fill('Weight (kg)', '40');
  await click('Repeat last set for Bench press');
  const sets = store.getState().data.active!.exercises[0].sets;
  expect(sets).toHaveLength(2);
  expect(sets[1]).toMatchObject({ reps: 8, weight: 0 });
  expect(sets[1].id).not.toBe(sets[0].id);
  expect(container.querySelector('output')?.textContent).toBe('1:30');
  expect(button('Start rest timer')).toBeTruthy();
  expect([...container.querySelectorAll<HTMLInputElement>('input[type=number]')].map(input => input.value)).toEqual(['12', '40']);
});

it('starts optional auto-rest only after a new set save is confirmed', async () => {
  await draft(); await autoRest();
  const save = repository.save.bind(repository);
  let release!: () => void;
  vi.spyOn(repository, 'save').mockImplementationOnce(async (...args) => {
    await new Promise<void>(resolve => { release = resolve; });
    return save(...args);
  });
  await fill('Reps', '8'); await fill('Weight (kg)', '60');
  await act(async () => container.querySelector('form[aria-label="Log a set for Bench press"]')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(store.getState().busy).toBe(true);
  expect(button('Start rest timer')).toBeTruthy();
  await act(async () => { release(); await idle(); });
  expect(button('Pause timer')).toBeTruthy();
  expect(container.querySelector('output')?.textContent).toBe('1:30');
});

it('restarts the full selected auto-rest duration after repeating a set, even while paused', async () => {
  await draft(); await autoRest(); await fill('Default rest', '30');
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  await fill('Reps', '8'); await fill('Weight (kg)', '60.5'); await submit('Log a set for Bench press');
  await act(async () => vi.advanceTimersByTime(5_000));
  expect(container.querySelector('output')?.textContent).toBe('0:25');
  await click('Pause timer'); await click('Repeat last set for Bench press');
  expect(container.querySelector('output')?.textContent).toBe('0:30');
  expect(button('Pause timer')).toBeTruthy();
  expect(store.getState().data.active!.exercises[0].sets).toHaveLength(2);
});

it('does not restart auto-rest after edits, removals, navigation or a library reload', async () => {
  await draft(); await autoRest();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  await fill('Reps', '8'); await fill('Weight (kg)', '60'); await submit('Log a set for Bench press');
  await act(async () => vi.advanceTimersByTime(10_000));
  await click('Edit set 1 for Bench press'); await fill('Reps', '9'); await submit('Log a set for Bench press');
  await click('Remove set 1 for Bench press');
  await click('Home'); await click('Workout');
  await act(async () => { await store.getState().load(); });
  expect(container.querySelector('output')?.textContent).toBe('1:20');
  expect(container.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked).toBe(true);
});

it('keeps the timer and entered values when an auto-rest set save fails', async () => {
  await draft(); await autoRest();
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await fill('Reps', '8'); await fill('Weight (kg)', '50'); await submit('Log a set for Bench press');
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Reload required');
  expect(button('Start rest timer')).toBeTruthy();
  expect(store.getState().data.active!.exercises[0].sets).toHaveLength(0);
  expect([...container.querySelectorAll<HTMLInputElement>('input[type=number]')].map(input => input.value)).toEqual(['8', '50']);
});

it('stops automatic restarts when opted out and lets the current rest finish', async () => {
  await draft(); await autoRest();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  await fill('Reps', '8'); await fill('Weight (kg)', '60'); await submit('Log a set for Bench press');
  await act(async () => vi.advanceTimersByTime(10_000));
  await autoRest(); await click('Repeat last set for Bench press');
  expect(container.querySelector('output')?.textContent).toBe('1:20');
  expect(button('Pause timer')).toBeTruthy();
});

it('keeps keyboard focus placed on a newly committed screen before passive effects run', async () => {
  let choose: HTMLButtonElement | undefined;
  await act(async () => root.render(<Profiler id="navigation" onRender={() => {
    if (choose) return;
    // A browser can focus the new control before React's passive effects run.
    choose = [...container.querySelectorAll('button')].find(el => el.textContent?.trim() === 'Choose video');
    choose?.focus();
  }}><App workouts={store} /></Profiler>));
  await act(idle);
  await click('Analyze');
  expect(choose).toBeDefined();
  expect(document.activeElement).toBe(choose);
});

it('searches the exercise library and selects a name without recording it until Add', async () => {
  await draft();
  await act(async () => container.querySelector('summary')!.click());
  await fill('Search exercise library', 'incline dumbbell');
  await click('Use Incline dumbbell press');
  expect(store.getState().data.active!.exercises).toHaveLength(1);
  expect((document.getElementById('exercise-name') as HTMLInputElement).value).toBe('Incline dumbbell press');
  expect(container.querySelector('details')?.open).toBe(false);
  await submit('Add an exercise');
  expect(store.getState().data.active!.exercises.map(exercise => exercise.name)).toEqual(['Bench press', 'Incline dumbbell press']);
});

it('reuses a saved custom exercise name after the workout editor is reopened', async () => {
  await draft(); await fill('Exercise name', 'My cable press'); await submit('Add an exercise');
  await click('Home'); await click('Workout');
  await act(async () => container.querySelector('summary')!.click());
  await fill('Search exercise library', 'my cable'); await click('Use My cable press');
  expect((document.getElementById('exercise-name') as HTMLInputElement).value).toBe('My cable press');
  expect(store.getState().data.active!.exercises).toHaveLength(2);
});

it('uses a custom search name as an editable draft and preserves it after a failed save', async () => {
  await draft();
  await act(async () => container.querySelector('summary')!.click());
  await fill('Search exercise library', 'My unusual press'); await click('Use custom exercise My unusual press');
  vi.spyOn(repository, 'save').mockRejectedValueOnce(new WorkoutError('storage', 'Reload required'));
  await submit('Add an exercise');
  expect((document.getElementById('exercise-name') as HTMLInputElement).value).toBe('My unusual press');
  expect(store.getState().data.active!.exercises).toHaveLength(1);
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Reload required');
});
