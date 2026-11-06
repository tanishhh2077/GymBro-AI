import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';

// The factory runs only when the analysis screen's module is first imported.
const analysis = vi.hoisted(() => ({ loads: 0 }));
vi.mock('@/components/AnalysisWorkspace', async importOriginal => {
  analysis.loads++;
  return importOriginal();
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); document.body.replaceChildren();
  vi.doUnmock('@/components/AnalysisWorkspace'); vi.resetModules(); vi.restoreAllMocks(); analysis.loads = 0;
});

async function renderApp() {
  const { default: App } = await import('./App');
  const workouts = createWorkoutStore(createWorkoutRepository(new IDBFactory()));
  await act(async () => root.render(<App workouts={workouts} />));
}
async function nav(name: string) {
  const target = [...container.querySelectorAll('nav button')].find(el => el.textContent?.trim() === name) as HTMLButtonElement;
  await act(async () => { target.click(); });
}
/** Lazy screens resolve after a module import, so wait in separate act() scopes. */
async function until(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(check()).toBe(true);
}

it('starts without the analysis screen and loads it when Analyze opens', async () => {
  await renderApp();
  expect(container.textContent).toContain('Start workout');
  expect(analysis.loads).toBe(0);

  await nav('Analyze');
  await until(() => container.textContent!.includes('Choose video'));
  expect(analysis.loads).toBe(1);
  expect(container.textContent).not.toContain('Opening video analysis');
});

it('shows a reload message when the analysis screen cannot load, and other screens still work', async () => {
  vi.doMock('@/components/AnalysisWorkspace', () => { throw new Error('chunk unavailable'); });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await renderApp();

  await nav('Analyze');
  await until(() => container.querySelector('[role="alert"]')?.textContent?.includes('Video analysis could not be opened') ?? false);
  expect(container.textContent).toContain('Reload the app to try again.');
  expect([...container.querySelectorAll('button')].some(el => el.textContent?.trim() === 'Reload app')).toBe(true);

  await nav('Home');
  expect(container.textContent).toContain('Start workout');
});
