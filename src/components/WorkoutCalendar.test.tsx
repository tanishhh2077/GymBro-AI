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
  try {
    await act(async () => root.render(<WorkoutCalendar history={history} from="" to="" onSelect={onSelect} />));
    const day = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('November 3, 2026'))!;
    expect(day.getAttribute('aria-label')).toContain('2 workouts');
    await act(async () => day.click()); expect(onSelect).toHaveBeenCalledWith('2026-11-03');
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next month"]')!.click());
    expect(container.textContent).toContain('December 2026');
    expect(container.textContent).toContain('No completed workouts this month.');
  } finally { await act(async () => root.unmount()); }
});
