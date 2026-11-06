import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let systemDark: boolean;
let meta: HTMLMetaElement;
const listeners = new Set<() => void>();
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  localStorage.clear(); systemDark = false; listeners.clear();
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return systemDark; }, media: '(prefers-color-scheme: dark)', onchange: null,
    addEventListener: (_name: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_name: string, listener: () => void) => listeners.delete(listener),
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => true,
  }));
  store = createWorkoutStore(createWorkoutRepository(new IDBFactory()));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  meta = document.createElement('meta'); meta.name = 'theme-color'; meta.content = '#123456'; document.head.append(meta);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren(); meta.remove(); localStorage.clear();
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<App workouts={store} />));
  if (store.getState().busy) await act(async () => new Promise<void>(resolve => {
    const off = store.subscribe(state => { if (!state.busy) { off(); resolve(); } });
  }));
}
function selection() {
  const label = [...container.querySelectorAll('label')].find(element => element.textContent === 'Appearance');
  expect(label, 'Home must offer an appearance choice').toBeDefined();
  return document.getElementById(label!.htmlFor) as HTMLSelectElement;
}
async function choose(value: string) {
  const select = selection();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function system(dark: boolean) {
  await act(async () => { systemDark = dark; for (const listener of listeners) listener(); });
}

it('defaults to the device appearance and applies it to the root and browser chrome', async () => {
  await render();
  expect(selection().value).toBe('system');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(meta.content).toBe('#f5f7fb');
  await system(true);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(meta.content).toBe('#05070d');
});

it('keeps a manual override through system changes and resumes following System when selected', async () => {
  await render(); await choose('dark'); await system(false);
  expect(document.documentElement.dataset.theme).toBe('dark');
  await choose('system');
  expect(document.documentElement.dataset.theme).toBe('light');
  await system(true);
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('restores the selected appearance after the app is remounted', async () => {
  await render(); await choose('dark');
  expect(localStorage.getItem('gymbro-ai:appearance')).toBe('dark');
  await act(async () => root.unmount()); root = createRoot(container);
  await render();
  expect(selection().value).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('treats an unknown saved preference as System without rewriting it during a read', async () => {
  localStorage.setItem('gymbro-ai:appearance', 'old-value');
  await render();
  expect(selection().value).toBe('system');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem('gymbro-ai:appearance')).toBe('old-value');
});

it('applies a session choice and reports a failed preference write without blocking workouts', async () => {
  await render();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  await choose('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(container.textContent).toContain('this session');
  expect(store.getState().needsReload).toBe(false);
});

it('uses System and keeps the app usable when preference storage cannot be read', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  await render();
  expect(selection().value).toBe('system');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(container.textContent).toContain('this session');
  expect(store.getState().loaded).toBe(true);
});

it('releases the system-change listener and restores owned document changes on unmount', async () => {
  const previous = document.documentElement.dataset.theme;
  await render(); expect(listeners.size).toBe(1);
  await act(async () => root.render(null));
  expect(listeners.size).toBe(0);
  expect(document.documentElement.dataset.theme).toBe(previous);
  expect(meta.content).toBe('#123456');
});
