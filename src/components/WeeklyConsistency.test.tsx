import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Workout } from '@/types/workout';
import { WeeklyConsistency } from './WeeklyConsistency';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const now = new Date(2026, 10, 4, 12).getTime();

function finished(id: string, finishedAt: number | null): Workout {
  return { id, name: id, unit: 'kg', startedAt: 0, finishedAt, exercises: [] };
}
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function render(history: readonly Workout[]) {
  await act(async () => root.render(<WeeklyConsistency history={history} now={now} />));
}
const rows = () => [...container.querySelectorAll('table[aria-label="Completed workouts per week"] tbody tr')];

it('lists twelve labelled weeks oldest first with text counts and a partial current week', async () => {
  const history = [
    finished('a', new Date(2026, 10, 2, 9).getTime()), finished('b', new Date(2026, 10, 3, 9).getTime()),
    finished('c', new Date(2026, 9, 27, 9).getTime()), finished('active', null),
  ];
  await render(history);
  const section = container.querySelector('section[aria-labelledby]')!;
  expect(document.getElementById(section.getAttribute('aria-labelledby')!)?.textContent).toBe('Weekly consistency');
  expect(rows()).toHaveLength(12);
  const firstStart = new Date(2026, 7, 16).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  expect(rows()[0].querySelector('th')?.textContent).toContain(firstStart);
  expect(rows()[0].textContent).toContain('0 workouts');
  expect(rows()[10].textContent).toContain('1 workout');
  expect(rows()[10].textContent).not.toContain('1 workouts');
  expect(rows()[11].textContent).toContain('2 workouts');
  expect(rows()[11].textContent).toContain('This week, in progress');
  expect(rows().filter(row => row.textContent?.includes('in progress'))).toHaveLength(1);
  expect(container.textContent).toContain('3 completed workouts in the last 12 weeks. 2 of 12 weeks have at least one.');
  expect(container.textContent).toContain('Weeks run Sunday through Saturday in local time');
  for (const bar of container.querySelectorAll('[data-week-bar]')) {
    expect(bar.closest('[aria-hidden="true"]')).not.toBeNull();
  }
});

it('shows zero weeks and an empty explanation without history', async () => {
  await render([]);
  expect(rows()).toHaveLength(12);
  expect(rows().every(row => row.textContent?.includes('0 workouts'))).toBe(true);
  expect(container.textContent).toContain('No completed workouts in the last 12 weeks.');
});
