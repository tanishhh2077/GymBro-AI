import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { WorkoutData } from '@/types/workout';
import { emptyWorkoutData } from '@/core/workouts';
import { WeeklyTrainingSummary } from './WeeklyTrainingSummary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let container: HTMLDivElement;
const now = Date.UTC(2026, 10, 6, 18);
beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(now); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
it('shows an explicit empty window, both unit totals and zero elapsed time', async () => {
  await act(async () => root.render(<WeeklyTrainingSummary data={emptyWorkoutData()} />));
  expect(container.textContent).toContain('No completed workouts in this seven-day window.');
  expect(container.textContent).toContain('Entered-load volume (lb)0 lb');
  expect(container.textContent).toContain('Entered-load volume (kg)0 kg');
  expect(container.textContent).toContain('Elapsed workout time0s');
});
it('keeps its entry-time window across data rerenders and refreshes on a fresh entry', async () => {
  const data: WorkoutData = { ...emptyWorkoutData(), history: [{ id: 'w', name: 'Synthetic', unit: 'kg',
    startedAt: now, finishedAt: now + 1000, exercises: [{ id: 'e', name: 'Row', sets: [{ id: 's', reps: 5, weight: 0 }] }] }] };
  await act(async () => root.render(<WeeklyTrainingSummary data={data} />));
  vi.mocked(Date.now).mockReturnValue(now + 2000);
  await act(async () => root.render(<WeeklyTrainingSummary data={{ ...data, revision: 1 }} />));
  expect(container.textContent).toContain('Completed workouts0');
  await act(async () => root.render(<WeeklyTrainingSummary key="new-entry" data={data} />));
  expect(container.textContent).toContain('Completed workouts1');
  expect(container.textContent).toContain('Actual sets1');
  expect(container.textContent).toContain('Elapsed workout time1s');
});
