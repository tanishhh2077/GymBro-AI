import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WEEKLY_TARGET_KEY } from './weeklyTargetPreference';
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
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); localStorage.clear(); vi.restoreAllMocks();
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

const history = () => [
  finished('a', new Date(2026, 10, 2, 9).getTime()), finished('b', new Date(2026, 10, 3, 9).getTime()),
  finished('c', new Date(2026, 9, 27, 9).getTime()),
];
function targetSelect() {
  const label = [...container.querySelectorAll('label')].find(element => element.textContent === 'Weekly workout target');
  expect(label, 'a weekly target control is offered').toBeDefined();
  return document.getElementById(label!.htmlFor) as HTMLSelectElement;
}
async function chooseTarget(value: string) {
  const element = targetSelect();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

it('shows only the control, with no target, when none is set', async () => {
  await render(history());
  expect(targetSelect().value).toBe('');
  expect([...targetSelect().options].map(option => option.textContent)).toEqual(['No target', ...Array.from({ length: 14 }, (_, index) => String(index + 1))]);
  expect(container.textContent).not.toContain('workouts this week');
  expect(container.textContent).not.toContain('Target');
});

it('shows progress for the current week and met or not met text per week', async () => {
  await render(history());
  await chooseTarget('2');
  expect(localStorage.getItem(WEEKLY_TARGET_KEY)).toBe('2');
  expect(container.textContent).toContain('2 of 2 workouts this week');
  expect(rows()[11].textContent).toContain('Target met');
  expect(rows()[10].textContent).toContain('Target not met');
  expect(rows()[10].textContent).toContain('1 of 2');
  await chooseTarget('3');
  expect(container.textContent).toContain('2 of 3 workouts this week');
  expect(rows()[11].textContent).toContain('Target not met yet');
  expect(container.textContent).not.toMatch(/streak|miss|fail|behind/i);
});

it('clears the target and removes its stored value when No target is chosen', async () => {
  localStorage.setItem(WEEKLY_TARGET_KEY, '3');
  await render(history());
  expect(targetSelect().value).toBe('3');
  await chooseTarget('');
  expect(localStorage.getItem(WEEKLY_TARGET_KEY)).toBeNull();
  expect(container.textContent).not.toContain('Target');
});

it('ignores an invalid stored target', async () => {
  localStorage.setItem(WEEKLY_TARGET_KEY, '40');
  await render(history());
  expect(targetSelect().value).toBe('');
});

it('applies the target for this session and says so when storage refuses it', async () => {
  await render(history());
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  await chooseTarget('4');
  expect(container.textContent).toContain('2 of 4 workouts this week');
  expect(container.textContent).toContain('applies for this session');
});

it('says so when the target cannot be read', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  await render(history());
  expect(container.textContent).toContain('applies for this session');
});
