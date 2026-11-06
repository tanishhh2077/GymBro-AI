import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { MotionGlobalConfig } from 'framer-motion';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutBackup, parseWorkoutBackup } from '@/core/workoutBackup';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { createSessionStore, type SessionEngine, type SessionStore } from '@/store/useSessionStore';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let session: SessionStore;

// Processing never finishes by itself and stops when cancelled, so each test
// exercises linking rather than video decoding.
function fakeSession(): SessionStore {
  let urls = 0;
  const engine = (): SessionEngine => ({
    processVideo: (_video, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('cancelled')));
    }),
    close: () => {},
  });
  return createSessionStore({
    createEngine: engine,
    createVideo: () => document.createElement('video'),
    createObjectURL: () => `blob:test-${++urls}`,
    revokeObjectURL: () => {},
    now: () => 0,
  });
}

beforeEach(() => {
  // Instant exit animations keep clip removal independent of animation timing.
  MotionGlobalConfig.skipAnimations = true;
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  store = createWorkoutStore(createWorkoutRepository(new IDBFactory()));
  session = fakeSession();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); document.body.replaceChildren(); vi.restoreAllMocks();
  MotionGlobalConfig.skipAnimations = false;
});

function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => { const off = store.subscribe(s => { if (!s.busy) { off(); resolve(); } }); });
}
async function render() { await act(async () => root.render(<App workouts={store} session={session} />)); await act(idle); }
function findButton(name: string) {
  return [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
}
function button(name: string) {
  const found = findButton(name);
  if (!found) throw new Error(`Missing button: ${name}`); return found;
}
async function settleLazy() {
  for (let i = 0; i < 100 && container.textContent?.includes('Opening video analysis'); i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
}
async function click(name: string) { await act(async () => { button(name).click(); await idle(); }); await settleLazy(); }
async function nav(name: string) {
  const found = [...container.querySelectorAll('nav button')].find(el => el.textContent?.trim() === name) as HTMLButtonElement;
  await act(async () => { found.click(); await idle(); });
  await settleLazy();
}
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
async function chooseVideo(name = 'bench.mp4') {
  const input = container.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input, 'files', { value: [new File([new Uint8Array(10)], name, { type: 'video/mp4' })], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function logSet(exercise: string, reps: string, weight: string) {
  await fill('Reps', reps); await fill('Weight (kg)', weight); await submit(`Log a set for ${exercise}`);
}
/** An active "Upper body" workout in kg with one bench set of 5 × 100. */
async function benchWorkout() {
  await render(); await click('Start workout'); await fill('Workout name', 'Upper body');
  await fill('Weight unit', 'kg'); await submit('Start a workout');
  await fill('Exercise name', 'Bench press'); await submit('Add an exercise');
  await logSet('Bench press', '5', '100');
}
function benchIds() {
  const workout = store.getState().data.active ?? store.getState().data.history[0];
  const exercise = workout.exercises.find(e => e.name === 'Bench press')!;
  return { workoutId: workout.id, exerciseId: exercise.id, setId: exercise.sets[0].id };
}
const clip = () => session.getState().clips[0];
/**
 * Admission reopens only after a removed clip's player unmounts and releases its
 * video. React renders that unmount only between act() scopes, so wait in short
 * separate scopes, never inside one.
 */
async function untilReleased() {
  for (let i = 0; i < 100 && session.getState().processingState !== 'idle'; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  }
  expect(session.getState().processingState).toBe('idle');
}
const entered = 'For your logged set 1 of Bench press: 5 reps × 100 kg (entered by you, not counted from the video), in Upper body.';
const unlinked = 'The linked set was removed from your workouts, so this video is no longer linked.';

it('offers analysis only on bench-press sets, and not while workouts are saving', async () => {
  await benchWorkout();
  await fill('Exercise name', 'Incline bench press'); await submit('Add an exercise');
  const incline = store.getState().data.active!.exercises[1];
  await act(async () => { await store.getState().addSet(incline.id, 8, 60); await idle(); });
  expect(container.textContent).toContain('Incline bench press');
  expect(findButton('Analyze video for set 1 of Bench press')).toBeTruthy();
  expect(findButton('Analyze video for set 1 of Incline bench press')).toBeUndefined();
  await act(async () => { store.setState({ busy: true }); });
  expect(button('Analyze video for set 1 of Bench press').disabled).toBe(true);
});

it('links an admitted clip to the pending set and returns to that focused row', async () => {
  await benchWorkout();
  await click('Analyze video for set 1 of Bench press');
  expect(container.textContent).toContain(entered);
  expect(container.textContent).toContain('This video and its link last until you reload, close the app, or leave the app while it is still processing. They are not saved.');

  await chooseVideo();
  expect(clip().link).toEqual(benchIds());
  expect(container.textContent).not.toContain('For your logged set');
  expect(container.textContent).toContain('Linked to your logged set 1 of Bench press: 5 reps × 100 kg');

  await click('Back to set');
  expect(document.activeElement?.id).toBe(`set-row-${benchIds().setId}`);
  await click('View analysis for set 1 of Bench press');
  expect(container.textContent).not.toContain('For your logged set');
  expect(clip().link).toEqual(benchIds());
});

it('shows edited set values and admits an unlinked clip after Analyze without linking', async () => {
  await benchWorkout();
  await click('Edit set 1 for Bench press'); await fill('Reps', '3'); await submit('Log a set for Bench press');
  await click('Analyze video for set 1 of Bench press');
  expect(container.textContent).toContain('For your logged set 1 of Bench press: 3 reps × 100 kg');
  await click('Analyze without linking');
  expect(container.textContent).not.toContain('For your logged set');
  await chooseVideo();
  expect(clip()).not.toHaveProperty('link');
  expect(findButton('Back to set')).toBeUndefined();
});

it('keeps the pending link after a rejected file and clears it when leaving Analyze', async () => {
  await benchWorkout();
  await click('Analyze video for set 1 of Bench press');
  await chooseVideo('bench.mov');
  expect(session.getState().clips).toHaveLength(0);
  expect(container.textContent).toContain(entered);

  await nav('Home'); await nav('Analyze');
  expect(container.textContent).not.toContain('For your logged set');
  await chooseVideo();
  expect(clip()).not.toHaveProperty('link');
});

it('never relinks an open clip; a newer pending set applies only to the next video', async () => {
  await benchWorkout(); await logSet('Bench press', '4', '110');
  await click('Analyze video for set 1 of Bench press'); await chooseVideo();
  await click('Back to set'); await click('Analyze video for set 2 of Bench press');
  expect(container.textContent).toContain('Remove the open video to analyze set 2 of Bench press.');
  expect(clip().link).toEqual(benchIds());

  await click('Cancel processing and remove clip');
  await untilReleased();
  await chooseVideo();
  const second = store.getState().data.active!.exercises[0].sets[1].id;
  expect(clip().link?.setId).toBe(second);
});

it('detaches the link when the set is removed and keeps it detached after a restore', async () => {
  await benchWorkout();
  const saved = parseWorkoutBackup(createWorkoutBackup(store.getState().data, 1));
  await click('Analyze video for set 1 of Bench press'); await chooseVideo();
  await click('Back to set'); await click('Discard workout');
  // Detaching does not wait for the Analyze screen, so a restore cannot relink it first.
  expect(clip()).not.toHaveProperty('link');
  await nav('Analyze');
  expect(container.textContent).toContain(unlinked);
  expect(clip()).not.toHaveProperty('link');
  expect(findButton('Back to set')).toBeUndefined();

  await act(async () => { await store.getState().restoreBackup(saved, store.getState().data.revision); });
  expect(store.getState().data.active?.id).toBe(benchIds().workoutId);
  expect(container.textContent).toContain(unlinked);
  expect(clip()).not.toHaveProperty('link');
});

it('detaches the link when only the linked set is removed', async () => {
  await benchWorkout(); await logSet('Bench press', '4', '110');
  await click('Analyze video for set 1 of Bench press'); await chooseVideo();
  await click('Back to set'); await click('Remove set 1 for Bench press');
  await nav('Analyze');
  expect(container.textContent).toContain(unlinked);
});

it('follows a finished workout into history and detaches when it is deleted', async () => {
  await benchWorkout();
  await click('Analyze video for set 1 of Bench press'); await chooseVideo();
  await click('Back to set'); await click('Finish workout');
  await nav('Analyze');
  expect(container.textContent).toContain('Linked to your logged set 1 of Bench press');

  await click('Back to set');
  expect(container.textContent).toContain('Back to history');
  expect(document.activeElement?.id).toBe(`set-row-${benchIds().setId}`);
  expect(findButton('View analysis for set 1 of Bench press')).toBeTruthy();
  await click('Delete workout');
  await nav('Analyze');
  expect(container.textContent).toContain(unlinked);
});

it('refuses a video for a pending set that disappeared before admission', async () => {
  await benchWorkout();
  const { exerciseId, setId } = benchIds();
  await click('Analyze video for set 1 of Bench press');
  await act(async () => { await store.getState().removeSet(exerciseId, setId); });
  expect(container.textContent).toContain('That set is no longer in your workouts.');

  await chooseVideo();
  expect(session.getState().clips).toHaveLength(0);
  expect(container.textContent).toContain('That set is no longer in your workouts, so the video was not opened.');
  await chooseVideo();
  expect(clip()).not.toHaveProperty('link');
});

it('never detaches a link from unconfirmed data and keeps Back to set disabled until reload', async () => {
  await benchWorkout();
  const ids = benchIds();
  await click('Analyze video for set 1 of Bench press'); await chooseVideo();
  const confirmed = store.getState().data;

  await act(async () => { store.setState({ needsReload: true }); });
  expect(button('Back to set').disabled).toBe(true);
  // Data that cannot be trusted, here missing the set, must not remove the link.
  await act(async () => { store.setState({ data: { ...confirmed, active: null } }); });
  expect(clip().link).toEqual(ids);
  await act(async () => { store.setState({ loaded: false, needsReload: false, data: emptyWorkoutData() }); });
  expect(clip().link).toEqual(ids);

  await act(async () => { store.setState({ loaded: true, data: { ...confirmed, active: null } }); });
  expect(clip()).not.toHaveProperty('link');
  expect(clip().linkRemoved).toBe(true);
});
