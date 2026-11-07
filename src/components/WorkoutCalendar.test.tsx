import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { WorkoutCalendar } from './WorkoutCalendar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it('counts local completion days, selects days and navigates empty months accessibly', async () => {
  const onSelect = vi.fn();
  const history = [{ id: 'w', name: 'Upper', unit: 'kg' as const, startedAt: 0,
    finishedAt: new Date(2026, 10, 3, 23, 59).getTime(), exercises: [] },
    { id: 'w2', name: 'Later', unit: 'kg' as const, startedAt: 0,
      finishedAt: new Date(2026, 10, 3, 12).getTime(), exercises: [] }];
  const container = document.createElement('div'); const root = createRoot(container);
  document.body.appendChild(container);
  try {
    await act(async () => root.render(<WorkoutCalendar history={history} from="" to="" onSelect={onSelect} />));
    const day = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('November 3, 2026'))!;
    expect(day.getAttribute('aria-label')).toContain('2 workouts');
    await act(async () => day.click()); expect(onSelect).toHaveBeenCalledWith('2026-11-03');
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next month"]')!.click());
    expect(container.textContent).toContain('December 2026');
    expect(container.textContent).toContain('No completed workouts this month.');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('supports keyboard navigation with arrow keys, Home/End, roving tabIndex and accessible names', async () => {
  const onSelect = vi.fn();
  const history = [{ id: 'w', name: 'Upper', unit: 'kg' as const, startedAt: 0,
    finishedAt: new Date(2026, 10, 3, 12).getTime(), exercises: [] }];
  const container = document.createElement('div'); const root = createRoot(container);
  document.body.appendChild(container);
  try {
    // Selected day 3 initially gets tabIndex 0, other day buttons have tabIndex -1
    await act(async () => root.render(<WorkoutCalendar history={history} from="2026-11-03" to="2026-11-03" onSelect={onSelect} />));
    const getDayBtn = (d: number) => [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes(`November ${d}, 2026`))!;

    const day3 = getDayBtn(3);
    const day1 = getDayBtn(1);
    const day4 = getDayBtn(4);

    // Verify clear accessible names with date and workout status
    expect(day3.getAttribute('aria-label')).toMatch(/Tuesday, November 3, 2026, 1 workout/);
    expect(day1.getAttribute('aria-label')).toMatch(/Sunday, November 1, 2026, 0 workouts/);

    // Verify roving tabIndex
    expect(day3.getAttribute('tabindex')).toBe('0');
    expect(day1.getAttribute('tabindex')).toBe('-1');
    expect(day4.getAttribute('tabindex')).toBe('-1');

    // Focus day 3
    await act(async () => {
      day3.focus();
    });
    expect(document.activeElement).toBe(day3);

    // ArrowRight moves 1 day forward (to day 4)
    await act(async () => {
      day3.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day4);
    expect(day4.getAttribute('tabindex')).toBe('0');
    expect(day3.getAttribute('tabindex')).toBe('-1');

    // ArrowLeft moves 1 day backward (back to day 3)
    await act(async () => {
      day4.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day3);

    // ArrowDown moves 7 days forward (1 week, to day 10)
    const day10 = getDayBtn(10);
    await act(async () => {
      day3.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day10);
    expect(day10.getAttribute('tabindex')).toBe('0');

    // ArrowUp moves 7 days backward (1 week, back to day 3)
    await act(async () => {
      day10.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day3);

    // Home moves to start of month (day 1)
    await act(async () => {
      day3.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day1);
    expect(day1.getAttribute('tabindex')).toBe('0');

    // Boundary: ArrowLeft and ArrowUp on day 1 do not move past boundary
    await act(async () => {
      day1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day1);
    await act(async () => {
      day1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day1);

    // End moves to end of month (day 30 for November)
    const day30 = getDayBtn(30);
    await act(async () => {
      day1.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day30);
    expect(day30.getAttribute('tabindex')).toBe('0');

    // Boundary: ArrowRight and ArrowDown on day 30 do not move past boundary
    await act(async () => {
      day30.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day30);
    await act(async () => {
      day30.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(day30);

    // Non-navigation keys (e.g. Tab) are not prevented
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => {
      day30.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(false);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('defaults active tabIndex to day 1 without selection, updates on click, and resets on month navigation', async () => {
  const onSelect = vi.fn();
  const history = [{ id: 'w', name: 'Upper', unit: 'kg' as const, startedAt: 0,
    finishedAt: new Date(2026, 10, 3, 12).getTime(), exercises: [] }];
  const container = document.createElement('div'); const root = createRoot(container);
  document.body.appendChild(container);
  try {
    await act(async () => root.render(<WorkoutCalendar history={history} from="" to="" onSelect={onSelect} />));
    const day1 = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('November 1, 2026'))!;
    const day5 = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('November 5, 2026'))!;

    // When from is empty, day 1 defaults to tabIndex 0
    expect(day1.getAttribute('tabindex')).toBe('0');
    expect(day5.getAttribute('tabindex')).toBe('-1');

    // Clicking day 5 focuses and selects it
    await act(async () => day5.click());
    expect(onSelect).toHaveBeenCalledWith('2026-11-05');
    expect(day5.getAttribute('tabindex')).toBe('0');
    expect(day1.getAttribute('tabindex')).toBe('-1');

    // Navigating to next month resets focus to day 1 of the new month
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next month"]')!.click());
    const decDay1 = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('December 1, 2026'))!;
    const decDay5 = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('December 5, 2026'))!;
    expect(decDay1.getAttribute('tabindex')).toBe('0');
    expect(decDay5.getAttribute('tabindex')).toBe('-1');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
