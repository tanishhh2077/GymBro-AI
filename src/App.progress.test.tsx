import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { WeightUnit, Workout } from '@/types/workout';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;

beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function workout(id: string, weight: number, options: {
  reps?: number; unit?: WeightUnit; exerciseName?: string; finishedAt?: number;
} = {}): Workout {
  return {
    id, name: `Workout ${id}`, unit: options.unit ?? 'kg', startedAt: 0,
    finishedAt: options.finishedAt ?? 1000,
    exercises: [{ id: `${id}-exercise`, name: options.exerciseName ?? 'Bench press',
      sets: [{ id: `${id}-set`, weight, reps: options.reps ?? 5 }] }],
  };
}
async function seed(history: readonly Workout[], active: Workout | null = null) {
  await repository.save(0, { ...emptyWorkoutData(), history, active });
}
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => {
    const unsubscribe = store.subscribe(state => { if (!state.busy) { unsubscribe(); resolve(); } });
  });
}
async function render() {
  await act(async () => root.render(<App workouts={store} />));
  await act(idle);
}
function button(name: string) {
  const found = [...container.querySelectorAll('button')].find(element =>
    (element.getAttribute('aria-label') ?? element.textContent?.trim()) === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}
async function click(name: string) {
  await act(async () => { button(name).click(); await idle(); });
}
async function selectGroup(label: string) {
  // The weekly target control is also a select, so pick the one that offers this group.
  const select = [...container.querySelectorAll('select')].find(item => [...item.options].some(o => o.textContent === label))!;
  const option = [...select.options].find(item => item.textContent === label)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, option.value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function historyRows() { return container.querySelectorAll('table[aria-label="Workout progress history"] tbody tr'); }

it('opens empty progress from Home and starts the existing workout flow', async () => {
  await render(); await click('View progress');
  expect(container.querySelector('h1')?.textContent).toBe('Progress');
  expect(container.textContent).toContain('Complete a workout with a regular set to see your progress.');
  expect(container.querySelector('svg[role="img"]')).toBeNull();
  await click('Start workout');
  expect(container.querySelector('h1')?.textContent).toBe('Start a workout');
});

it('shows separate units, opens the actual record workout and recomputes after deletion', async () => {
  await seed([
    workout('heavy', 50, { finishedAt: 2000 }),
    workout('reps', 30, { reps: 12, finishedAt: 1000 }),
    workout('pounds', 100, { unit: 'lb' }),
  ]);
  await render(); await click('View progress');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('50 kg × 5 reps');
  expect(container.querySelector('[aria-label="Most reps in a set"]')?.textContent).toContain('12 reps at 30 kg');
  await selectGroup('Bench press (lb)');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('100 lb × 5 reps');
  await selectGroup('Bench press (kg)');
  await click('View workout for heaviest set');
  expect(container.querySelector('h1')?.textContent).toBe('Workout heavy');
  expect(container.querySelector('tbody')?.textContent).toContain('50 kg');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await click('Delete workout'); await click('Home'); await click('View progress');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('30 kg × 12 reps');
  expect(historyRows()).toHaveLength(1);
});

it('renders a finite visible single-point chart for a zero-load set', async () => {
  await seed([workout('zero', 0)]); await render(); await click('View progress');
  const chart = container.querySelector('svg[role="img"]')!;
  expect(chart).not.toBeNull();
  expect(chart.querySelector('path')).not.toBeNull();
  expect(chart.querySelector('path')?.getAttribute('d')).not.toMatch(/NaN|Infinity/);
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('0 kg × 5 reps');
  expect(container.textContent).toContain('evenly spaced in finish order');
});

it('keeps all chart points, pages tables and resets rows when changing groups', async () => {
  await seed([
    ...Array.from({ length: 25 }, (_, index) => workout(`w-${index}`, index + 1, { finishedAt: index + 1 })),
    workout('row', 20, { exerciseName: 'Row', unit: 'lb' }),
  ]);
  await render(); await click('View progress');
  expect(historyRows()).toHaveLength(20);
  expect(container.querySelector('polyline')?.getAttribute('points')?.split(' ')).toHaveLength(25);
  await click('Show more workouts'); expect(historyRows()).toHaveLength(25);
  await click('Show more weight records');
  expect(container.querySelectorAll('table[aria-label="Rep records by weight"] tbody tr')).toHaveLength(25);
  await selectGroup('Row (lb)'); expect(historyRows()).toHaveLength(1);
  await selectGroup('Bench press (kg)'); expect(historyRows()).toHaveLength(20);
});

it('keeps the active timer while deriving records from completed workouts', async () => {
  const active = { ...workout('active', 999, { reps: 999 }), finishedAt: null };
  await seed([workout('finished', 40)], active);
  await render(); await click('Start rest timer'); await click('Pause timer'); await click('View progress');
  expect(button('Resume timer')).toBeTruthy();
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('40 kg × 5 reps');
  expect(historyRows()).toHaveLength(1);
});

it('shows reload recovery when saved progress becomes unavailable', async () => {
  await seed([workout('saved', 40)]); await render(); await click('View progress');
  vi.spyOn(repository, 'load').mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => { await store.getState().load(); });
  expect(container.textContent).toContain('Reload saved workouts to view progress.');
  expect(container.querySelector('svg[role="img"]')).toBeNull();
  await click('Reload saved workouts');
  expect(container.querySelector('svg[role="img"]')).not.toBeNull();
});

it('lets the running app add goals from Progress', async () => {
  await render(); await click('View progress');
  expect(button('Add goal')).toBeTruthy();
});
