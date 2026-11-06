import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Workout, WorkoutData } from '@/types/workout';
import { WorkoutProgress } from './WorkoutProgress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const now = new Date(2026, 10, 6, 12).getTime();

function workout(id: string, month: number, weight: number, reps = 5, name = 'Bench press', unit: 'kg' | 'lb' = 'kg'): Workout {
  return { id, name: id, startedAt: 0, finishedAt: new Date(2026, month, 6, 10).getTime(), unit,
    exercises: [{ id: `${id}-exercise`, name, sets: [
      { id: `${id}-set`, weight, reps },
      { id: `${id}-warmup`, weight: 999, reps: 999, kind: 'warmup' },
    ] }] };
}
const data: WorkoutData = { version: 3, revision: 1, active: null, history: [
  workout('old', 2, 150, 20), workout('six', 5, 120, 15),
  workout('three', 8, 100, 10), workout('recent', 10, 80, 8),
  workout('row', 2, 70, 5, 'Row', 'lb'),
] };

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function render(onHistory = vi.fn(), source = data) {
  await act(async () => root.render(<WorkoutProgress data={source} available onHome={() => {}}
    onWorkout={() => {}} onHistory={onHistory} />));
}
async function select(id: string, value: string) {
  const control = container.querySelector<HTMLSelectElement>(`#${id}`);
  expect(control, `Missing ${id} selector`).not.toBeNull();
  await act(async () => {
    control!.value = value;
    control!.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function rows(label: string) { return container.querySelectorAll(`table[aria-label="${label}"] tbody tr`); }

it('defaults to all time and filters cards, chart, both tables, counts and record source links together', async () => {
  const onHistory = vi.fn();
  const before = JSON.stringify(data);
  await render(onHistory);
  expect(container.querySelector<HTMLSelectElement>('#progress-period')?.value).toBe('all');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('150 kg');
  for (const [period, count, weight, reps, source] of [
    ['month', 1, 80, 8, 'recent'], ['three-months', 2, 100, 10, 'three'],
    ['six-months', 3, 120, 15, 'six'], ['all', 4, 150, 20, 'old'],
  ] as const) {
    await select('progress-period', period);
    expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain(`${weight} kg`);
    expect(container.querySelector('[aria-label="Most reps in a set"]')?.textContent).toContain(`${reps} reps`);
    expect(container.textContent).toContain(`${count} completed workouts with ${count} regular sets in kg.`);
    expect(rows('Workout progress history')).toHaveLength(count);
    expect(rows('Rep records by weight')).toHaveLength(count);
    expect(container.querySelector('svg desc')?.textContent).toContain(`${count} completed workouts`);
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="View workout for heaviest set"]')!.click());
    expect(onHistory).toHaveBeenLastCalledWith(source);
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="View workout for most reps"]')!.click());
    expect(onHistory).toHaveBeenLastCalledWith(source);
  }
  await select('progress-period', 'month');
  expect(container.textContent).toContain('Records for Last month');
  expect(JSON.stringify(data)).toBe(before);
});

it('keeps the exact exercise/unit selected when a period has no sets and restores its all-time records', async () => {
  await render();
  const key = JSON.stringify(['Row', 'lb']);
  await select('progress-exercise', key);
  await select('progress-period', 'month');
  expect(container.querySelector<HTMLSelectElement>('#progress-exercise')?.value).toBe(key);
  expect(container.textContent).toContain('No regular sets for Row (lb) in Last month');
  expect(container.textContent).toContain('Choose a longer period');
  expect(container.querySelector('svg')).toBeNull();
  expect(container.querySelector('table')).toBeNull();
  expect(container.querySelector('[aria-label="Heaviest logged set"]')).toBeNull();
  await select('progress-period', 'all');
  expect(container.querySelector<HTMLSelectElement>('#progress-exercise')?.value).toBe(key);
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('70 lb');
});

it('resets both table pages when the period changes', async () => {
  await render(vi.fn(), { ...data, history: Array.from({ length: 25 }, (_, index) => workout(`w${index}`, 10, index)) });
  for (const label of ['Show more workouts', 'Show more weight records']) {
    const button = [...container.querySelectorAll('button')].find(item => item.textContent === label)!;
    await act(async () => button.click());
  }
  expect(rows('Workout progress history')).toHaveLength(25);
  expect(rows('Rep records by weight')).toHaveLength(25);
  await select('progress-period', 'month');
  expect(rows('Workout progress history')).toHaveLength(20);
  expect(rows('Rep records by weight')).toHaveLength(20);
});
