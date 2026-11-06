import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { WeightUnit, Workout, WorkoutData } from '@/types/workout';
import { WorkoutProgress } from './WorkoutProgress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const now = new Date(2026, 10, 6, 12).getTime();

function workout(id: string, month: number, weight: number, options: { name?: string; unit?: WeightUnit; warmupOnly?: boolean } = {}): Workout {
  const sets = options.warmupOnly ? [{ id: `${id}-warmup`, weight: 20, reps: 10, kind: 'warmup' as const }] :
    [{ id: `${id}-warmup`, weight: 20, reps: 10, kind: 'warmup' as const }, { id: `${id}-set`, weight, reps: 5 }];
  return { id, name: `Workout ${id}`, startedAt: 0, finishedAt: new Date(2026, month, 6, 10).getTime(), unit: options.unit ?? 'kg',
    exercises: [{ id: `${id}-exercise`, name: options.name ?? 'Bench press', sets }] };
}
const history = [
  workout('old', 2, 150), workout('recent', 10, 80),
  workout('pounds', 10, 200, { unit: 'lb' }),
  workout('lower', 10, 60, { name: 'bench press' }),
];
const data = (items: Workout[] = history, revision = 1): WorkoutData => ({ version: 3, revision, active: null, history: items });

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

async function render(source: WorkoutData, onHistory = vi.fn()) {
  await act(async () => root.render(<WorkoutProgress data={source} available onHome={() => {}} onWorkout={() => {}} onHistory={onHistory} />));
}
function button(label: string) {
  const found = [...container.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') ?? item.textContent) === label);
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
async function click(label: string) { await act(async () => button(label).click()); }
async function selectPeriod(value: string) {
  const control = container.querySelector<HTMLSelectElement>('#progress-period')!;
  await act(async () => { control.value = value; control.dispatchEvent(new Event('change', { bubbles: true })); });
}
const entries = () => [...container.querySelectorAll('[aria-label="Completed workouts for this exercise"] article')];

it('lists each exact name and unit group and opens its detail view and back', async () => {
  await render(data());
  const list = container.querySelector('[aria-label="Exercises"]')!;
  expect([...list.querySelectorAll('button')].map(item => item.getAttribute('aria-label'))).toEqual([
    'Open details for Bench press (kg)', 'Open details for Bench press (lb)', 'Open details for bench press (kg)',
  ]);
  await click('Open details for Bench press (kg)');
  expect(container.querySelector('h1')?.textContent).toBe('Bench press (kg)');
  expect(document.activeElement).toBe(container.querySelector('h1'));
  expect(container.querySelector('[aria-label="Exercises"]')).toBeNull();
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('150 kg × 5 reps');
  expect(container.querySelector('svg[role="img"] desc')?.textContent).toContain('2 completed workouts');
  expect(entries().map(entry => entry.querySelector('h3')?.textContent)).toEqual(['Workout recent', 'Workout old']);
  expect(entries()[0].textContent).toContain('Warm-up · 10 reps × 20 kg');
  expect(entries()[0].textContent).toContain('Regular · 5 reps × 80 kg');
  expect(container.textContent).not.toContain('200 lb');
  expect(container.textContent).not.toContain('60 kg');
  await click('Back to Progress');
  expect(container.querySelector('h1')?.textContent).toBe('Progress');
  expect(document.activeElement).toBe(button('Open details for Bench press (kg)'));
});

it('links each history entry to its workout and filters history with the selected period', async () => {
  const onHistory = vi.fn();
  await render(data(), onHistory);
  await click('Open details for Bench press (kg)');
  const recent = entries()[0].querySelector('button')!;
  expect(recent.getAttribute('aria-label')).toBe(`Open workout Workout recent from ${new Date(2026, 10, 6, 10).toLocaleString()}`);
  await act(async () => recent.click());
  expect(onHistory).toHaveBeenLastCalledWith('recent');
  await selectPeriod('month');
  expect(container.querySelector('h1')?.textContent).toBe('Bench press (kg)');
  expect(entries()).toHaveLength(1);
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('80 kg');
  await selectPeriod('all');
  expect(entries()).toHaveLength(2);
});

it('includes warm-up-only workouts in history but explains missing regular sets in a period', async () => {
  const items = [workout('old', 2, 150), workout('warm', 10, 0, { warmupOnly: true })];
  await render(data(items));
  await click('Open details for Bench press (kg)');
  await selectPeriod('month');
  expect(container.textContent).toContain('No regular sets for Bench press (kg) in Last month');
  expect(entries()).toHaveLength(1);
  expect(entries()[0].textContent).toContain('Warm-up');
});

it('pages long history and resets paging when the period changes', async () => {
  const items = Array.from({ length: 13 }, (_, index) => ({ ...workout(`w${index}`, 10, index + 1), finishedAt: now - (index + 1) * 60_000 }));
  await render(data(items));
  await click('Open details for Bench press (kg)');
  expect(entries()).toHaveLength(10);
  expect(container.textContent).toContain('Showing 10 of 13 completed workouts.');
  await click('Show more completed workouts');
  expect(entries()).toHaveLength(13);
  await selectPeriod('month');
  expect(entries()).toHaveLength(10);
});

it('explains deleted workouts when the open exercise no longer has history', async () => {
  await render(data());
  await click('Open details for Bench press (lb)');
  await render(data(history.filter(item => item.id !== 'pounds'), 2));
  expect(container.querySelector('h1')?.textContent).toBe('Bench press (lb)');
  expect(container.textContent).toContain('No completed workouts remain for Bench press (lb). They may have been deleted.');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')).toBeNull();
  await click('Back to Progress');
  expect(container.querySelector('h1')?.textContent).toBe('Progress');
});

it('shows weekly consistency on the Progress screen even without regular sets', async () => {
  await render(data([workout('warm', 10, 0, { warmupOnly: true })]));
  expect(container.querySelector('table[aria-label="Completed workouts per week"]')).not.toBeNull();
  expect(container.textContent).toContain('Complete a workout with a regular set to see your progress.');
});
