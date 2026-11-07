import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Workout, WorkoutData } from '@/types/workout';
import { WorkoutProgress } from './WorkoutProgress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const finished = new Date(2026, 10, 2, 10).getTime();

function workout(id: string, weights: number[], bodyweight: boolean, offset = 0): Workout {
  return { id, name: `Workout ${id}`, unit: 'lb', startedAt: 0, finishedAt: finished + offset,
    exercises: [{ id: `${id}-e`, name: 'Pull-up', ...(bodyweight ? { bodyweight: true as const } : {}),
      sets: weights.map((weight, index) => ({ id: `${id}-s${index}`, reps: 5 + index, weight })) }] };
}
const data: WorkoutData = { version: 5, revision: 1, active: null, history: [
  workout('assisted', [-30, -20], true), workout('added', [20], true, 1000), workout('loaded', [100], false, 2000),
] };
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

async function render() {
  await act(async () => root.render(<WorkoutProgress data={data} available onHome={() => {}} onWorkout={() => {}} onHistory={() => {}} />));
}
async function open(label: string) {
  await act(async () => container.querySelector<HTMLButtonElement>(`button[aria-label="Open details for ${label}"]`)!.click());
}
const entries = () => [...container.querySelectorAll('[aria-label="Completed workouts for this exercise"] article')];

it('lists bodyweight and loaded entries of one name as separate labelled groups', async () => {
  await render();
  expect([...container.querySelectorAll('[aria-label="Exercises"] button')].map(item => item.getAttribute('aria-label')))
    .toEqual(['Open details for Pull-up (lb)', 'Open details for Pull-up (lb, bodyweight)']);
  expect([...container.querySelectorAll('#progress-exercise option')].map(item => item.textContent))
    .toEqual(['Pull-up (lb)', 'Pull-up (lb, bodyweight)']);
});

it('shows added and assisted loads with formatted weights and only bodyweight history in its detail view', async () => {
  await render();
  await open('Pull-up (lb, bodyweight)');
  expect(container.querySelector('h1')?.textContent).toBe('Pull-up (lb, bodyweight)');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('+20 lb × 5 reps');
  expect(container.querySelector('[aria-label="Most reps in a set"]')?.textContent).toContain('6 reps at −20 lb assist');
  expect(container.querySelector('table[aria-label="Rep records by weight"]')?.textContent).toContain('−30 lb assist');
  expect(entries().map(entry => entry.querySelector('h3')?.textContent)).toEqual(['Workout added', 'Workout assisted']);
  expect(entries()[1].textContent).toContain('5 reps × −30 lb assist');
  expect(container.textContent).not.toContain('100 lb');
  expect(container.textContent).toContain('Added weight (lb); negative values are assistance');
});

it('keeps every assisted chart point inside the plot', async () => {
  await render();
  await open('Pull-up (lb, bodyweight)');
  const points = container.querySelector('svg[role="img"] polyline')!.getAttribute('points')!
    .split(' ').map(point => Number(point.split(',')[1]));
  expect(points.every(y => y >= 4 && y <= 96)).toBe(true);
});

it('shows the other unit in small display-only text next to records', async () => {
  await render();
  await open('Pull-up (lb)');
  expect(container.querySelector('[aria-label="Heaviest logged set"]')?.textContent).toContain('100 lb × 5 reps');
  expect(container.querySelector('[aria-label="Heaviest logged set"] .text-xs')?.textContent).toBe('≈ 45.5 kg');
  expect(container.querySelector('table[aria-label="Workout progress history"]')?.textContent).toContain('45.5 kg');
});
