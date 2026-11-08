import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';

const analysis = vi.hoisted(() => ({ loads: 0 }));
vi.mock('@/components/AnalysisWorkspace', async importOriginal => {
  analysis.loads++;
  return importOriginal();
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// The analysis screen loads on first use, which can take several seconds on a busy machine; Vitest's 5 s default would cancel the test before the wait below could finish.
vi.setConfig({ testTimeout: 30_000 });
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
async function until(check: () => boolean) {
  for (let i = 0; i < 1000 && !check(); i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
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

it('shows reload recovery when analysis cannot load and keeps other screens usable', async () => {
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

it('keeps navigation usable while analysis loads and stays on Home after a late import', async () => {
  let finishImport!: () => void;
  let requested = false;
  const gate = new Promise<void>(resolve => { finishImport = resolve; });
  vi.doMock('@/components/AnalysisWorkspace', async importOriginal => {
    requested = true;
    await gate;
    return importOriginal();
  });
  await renderApp(); await nav('Analyze');
  expect(container.textContent).toContain('Opening video analysis');
  await vi.waitFor(() => expect(requested).toBe(true));
  await nav('Home');
  await act(async () => { finishImport(); await import('@/components/AnalysisWorkspace'); });
  expect(container.querySelector('h1')?.textContent).toBe('Your training.');
  expect(container.textContent).not.toContain('Opening video analysis');
});
