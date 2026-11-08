import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import App from './App';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, container: HTMLDivElement, store: WorkoutStore;
beforeAll(async () => { await import('@/components/BodyLog'); await import('@/components/RoutineShare'); });
beforeEach(async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  let sequence = 0; store = createWorkoutStore(createWorkoutRepository(new IDBFactory()), { id: () => `test-${++sequence}`, now: () => 1000 });
  await store.getState().load();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
async function click(name: string) {
  const button = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  expect(button, name).toBeDefined(); await act(async () => button!.click());
}
it('opens body log from Home and protects an unsaved entry on global navigation', async () => {
  await act(async () => { root.render(<App workouts={store} />); });
  await act(async () => { while (store.getState().busy) await new Promise(resolve => setTimeout(resolve, 0)); });
  await click('Body log'); expect(container.querySelector('h1')?.textContent).toBe('Body Log');
  await click('Add entry');
  const input = container.querySelector<HTMLInputElement>('input[type="number"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '80');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Home'); expect(confirm).toHaveBeenCalledOnce(); expect(container.querySelector('h1')?.textContent).toBe('Body Log');
  confirm.mockReturnValue(true); await click('Home'); expect(container.textContent).toContain('Your training.');
});
it('renders exact-name notes in the active workout and routine sharing in Routines', async () => {
  await store.getState().startWorkout('Synthetic', 'kg'); await store.getState().addExercise('Bench press');
  await act(async () => { root.render(<App workouts={store} />); });
  await act(async () => { while (store.getState().busy) await new Promise(resolve => setTimeout(resolve, 0)); }); await click('Workout');
  expect(store.getState().data.active?.exercises.map(e => e.name)).toEqual(['Bench press']);
  const form = container.querySelector('form[aria-label="Exercise note for Bench press"]')!;
  expect(form).not.toBeNull();
  const note = form.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(note, 'Seat 3');
    note.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Home'); expect(confirm).toHaveBeenCalledOnce(); expect(note.value).toBe('Seat 3');
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await act(async () => { while (store.getState().busy) await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(store.getState().data.exerciseNotes).toEqual({ 'Bench press': 'Seat 3' });

  await click('Routines'); await click('Import routine file'); expect(container.textContent).toContain('Choose routine JSON file');
});
