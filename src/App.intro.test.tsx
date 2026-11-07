import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import App from './App';

// The shared test setup hides the intro from every other App test; this file
// checks the real first-run behaviour.
vi.unmock('@/components/introPreference');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  localStorage.clear();
  store = createWorkoutStore(createWorkoutRepository(new IDBFactory()));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<App workouts={store} />));
  if (store.getState().busy) await act(async () => new Promise<void>(resolve => {
    const off = store.subscribe(state => { if (!state.busy) { off(); resolve(); } });
  }));
}
const dialog = () => container.querySelector<HTMLElement>('[role="dialog"]');
const heading = () => dialog()!.querySelector('h2')!;
function button(name: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll('button')].find(element => element.textContent === name);
  expect(found, `button ${name}`).toBeDefined();
  return found!;
}
const buttonNames = () => [...dialog()!.querySelectorAll('button')].map(element => element.textContent);
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function press(key: string) {
  await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}
const homeHeading = () => [...container.querySelectorAll('h1')].find(element => element.textContent === 'Your training.')!;

it('shows a labelled three-step intro on first run and remembers Get started', async () => {
  await render();
  const intro = dialog();
  expect(intro, 'first run shows the intro').not.toBeNull();
  expect(intro!.getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(intro!.getAttribute('aria-labelledby')!)?.textContent).toBe('Welcome to GymBro AI');
  expect(intro!.textContent).toContain('Step 1 of 3');
  expect(heading().textContent).toBe('Log workouts and routines');
  expect(document.activeElement).toBe(heading());
  expect(buttonNames()).toEqual(['Skip intro', 'Next']);

  await click(button('Next', intro!));
  expect(dialog()!.textContent).toContain('Step 2 of 3');
  expect(heading().textContent).toBe('Progress, records and optional backups');
  expect(dialog()!.textContent).toContain('optional');
  expect(document.activeElement).toBe(heading());
  expect(buttonNames()).toEqual(['Skip intro', 'Back', 'Next']);

  await click(button('Back', dialog()!));
  expect(dialog()!.textContent).toContain('Step 1 of 3');
  await click(button('Next', dialog()!));
  await click(button('Next', dialog()!));
  expect(dialog()!.textContent).toContain('Step 3 of 3');
  expect(heading().textContent).toBe('Bench video analysis on this device');
  const text = dialog()!.textContent!;
  expect(text).toContain('side view');
  expect(text).toContain('never uploaded');
  expect(text).toContain('estimates');
  expect(buttonNames()).toEqual(['Skip intro', 'Back', 'Get started']);

  await click(button('Get started', dialog()!));
  expect(dialog()).toBeNull();
  expect(localStorage.getItem('gymbro-intro-v1')).toBe('seen');
  expect(document.activeElement).toBe(homeHeading());
});

it('closes with Skip intro or Escape on any step and remembers the choice', async () => {
  await render();
  await click(button('Next', dialog()!));
  await click(button('Skip intro', dialog()!));
  expect(dialog()).toBeNull();
  expect(localStorage.getItem('gymbro-intro-v1')).toBe('seen');
  expect(document.activeElement).toBe(homeHeading());

  await click(button('Show intro again'));
  expect(dialog()!.textContent).toContain('Step 1 of 3');
  expect(document.activeElement).toBe(heading());
  await press('Escape');
  expect(dialog()).toBeNull();
  expect(document.activeElement).toBe(homeHeading());
});

it('keeps Tab focus inside the open intro', async () => {
  await render();
  await click(button('Next', dialog()!));
  const [skip, , next] = dialog()!.querySelectorAll('button');
  next.focus();
  await press('Tab');
  expect(document.activeElement).toBe(skip);
  await act(async () => skip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
  expect(document.activeElement).toBe(next);
});

it('does not show the intro again once it was seen, but Home can reopen it', async () => {
  localStorage.setItem('gymbro-intro-v1', 'seen');
  await render();
  expect(dialog()).toBeNull();
  await click(button('Show intro again'));
  expect(heading().textContent).toBe('Log workouts and routines');
});

it('closes for this session only when the device cannot save the choice', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  await render();
  await click(button('Skip intro', dialog()!));
  expect(dialog()).toBeNull();
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain('The intro may show again next time you open the app.');
});

it('shows the intro when the device setting cannot be read', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
  await render();
  expect(dialog()).not.toBeNull();
});
