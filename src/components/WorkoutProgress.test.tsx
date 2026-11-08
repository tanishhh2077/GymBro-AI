import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout, WorkoutData } from '@/types/workout';
import { WorkoutProgress } from './WorkoutProgress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const now = new Date(2026, 10, 6, 12).getTime();

function workout(id: string, month: number, weight: number, name = 'Bench press'): Workout {
  return {
    id,
    name: `Workout ${id}`,
    startedAt: 0,
    finishedAt: new Date(2026, month, 6, 10).getTime(),
    unit: 'kg',
    exercises: [{
      id: `${id}-exercise`,
      name,
      sets: [{ id: `${id}-set`, weight, reps: 5 }],
    }],
  };
}

const emptyData: WorkoutData = { version: 3, revision: 1, active: null, history: [] };
const singleOldWorkoutData: WorkoutData = {
  version: 3,
  revision: 1,
  active: null,
  history: [workout('old', 2, 100)],
};

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

describe('WorkoutProgress empty and loading states', () => {
  it('renders global empty state with clear next action when no workout data exists', async () => {
    const onWorkout = vi.fn();
    const onHome = vi.fn();
    await act(async () => {
      root.render(
        <WorkoutProgress
          data={emptyData}
          available
          onHome={onHome}
          onWorkout={onWorkout}
          onHistory={vi.fn()}
        />,
      );
    });

    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toContain('No workouts logged yet');
    expect(status?.textContent).toContain('Complete your first workout to see progress charts and records.');
    expect(status?.textContent).toContain('Complete a workout with a regular set to see your progress.');

    const ctaButton = status?.querySelector<HTMLButtonElement>('button');
    expect(ctaButton?.textContent).toBe('Start workout');
    await act(async () => {
      ctaButton?.click();
    });
    expect(onWorkout).toHaveBeenCalledTimes(1);
  });

  it('supports alternative onStartWorkout and onNavigate props for empty state actions', async () => {
    const onStartWorkout = vi.fn();
    const onNavigate = vi.fn();
    await act(async () => {
      root.render(
        <WorkoutProgress
          data={emptyData}
          available
          onStartWorkout={onStartWorkout}
          onNavigate={onNavigate}
          onHistory={vi.fn()}
        />,
      );
    });

    const startBtn = container.querySelector<HTMLButtonElement>('button.btn-primary');
    expect(startBtn?.textContent).toBe('Start workout');
    await act(async () => {
      startBtn?.click();
    });
    expect(onStartWorkout).toHaveBeenCalledTimes(1);

    const backBtn = container.querySelector<HTMLButtonElement>('button.underline');
    await act(async () => {
      backBtn?.click();
    });
    expect(onNavigate).toHaveBeenCalledWith('home');
  });

  it('renders range filter empty state with next action to show all time', async () => {
    await act(async () => {
      root.render(
        <WorkoutProgress
          data={singleOldWorkoutData}
          available
          onHome={vi.fn()}
          onWorkout={vi.fn()}
          onHistory={vi.fn()}
        />,
      );
    });

    // Switch to Last month (no workouts in last month since workout was in month 2)
    const select = container.querySelector<HTMLSelectElement>('#progress-period')!;
    await act(async () => {
      select.value = 'month';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const status = container.querySelector('[data-progress-status]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('No workouts in the selected time range. Try selecting a different period or all time.');
    expect(status?.textContent).toContain('No regular sets for Bench press (kg) in Last month.');

    const resetBtn = status?.querySelector<HTMLButtonElement>('button');
    expect(resetBtn?.textContent).toBe('Show all time');
    await act(async () => {
      resetBtn?.click();
    });

    // Should switch back to all time and display the heaviest set card
    expect(select.value).toBe('all');
    expect(container.querySelector('[aria-label="Heaviest logged set"]')).not.toBeNull();
  });

  it('renders distinct empty state for selected exercise with clear next action when data was deleted', async () => {
    const onWorkout = vi.fn();
    // First render with workout
    await act(async () => {
      root.render(
        <WorkoutProgress
          data={singleOldWorkoutData}
          available
          onHome={vi.fn()}
          onWorkout={onWorkout}
          onHistory={vi.fn()}
        />,
      );
    });

    // Open detail
    const detailBtn = container.querySelector<HTMLButtonElement>('button[data-group-key]')!;
    await act(async () => {
      detailBtn.click();
    });
    expect(container.querySelector('h1')?.textContent).toBe('Bench press (kg)');

    // Simulate workout data removed while in detail view
    await act(async () => {
      root.render(
        <WorkoutProgress
          data={emptyData}
          available
          onHome={vi.fn()}
          onWorkout={onWorkout}
          onHistory={vi.fn()}
        />,
      );
    });

    const status = container.querySelector('[data-progress-status]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('No data for the selected exercise');
    expect(status?.textContent).toContain('No completed workouts remain for Bench press (kg). They may have been deleted.');

    // Buttons to go back or start workout
    const backBtn = [...status?.querySelectorAll('button') ?? []].find(b => b.textContent === 'Back to Progress');
    const startBtn = [...status?.querySelectorAll('button') ?? []].find(b => b.textContent === 'Start workout');
    expect(backBtn).not.toBeUndefined();
    expect(startBtn).not.toBeUndefined();

    await act(async () => {
      startBtn?.click();
    });
    expect(onWorkout).toHaveBeenCalledTimes(1);

    await act(async () => {
      backBtn?.click();
    });
    expect(container.querySelector('h1')?.textContent).toBe('Progress');
  });

  it('renders accessible loading state with friendly message when loading prop is true', async () => {
    await act(async () => {
      root.render(
        <WorkoutProgress
          data={emptyData}
          available
          loading
          onHome={vi.fn()}
          onWorkout={vi.fn()}
          onHistory={vi.fn()}
        />,
      );
    });

    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('Loading progress…');
    expect(status?.textContent).toContain('Loading workout history and personal records.');
    // Should not render the empty state or other controls while loading
    expect(container.querySelector('#progress-exercise')).toBeNull();
  });

  it('renders accessible unavailable state with reload action', async () => {
    const mockStore = {
      getState: () => ({
        load: vi.fn(),
      }),
    } as unknown as WorkoutStore;

    await act(async () => {
      root.render(
        <WorkoutProgress
          data={emptyData}
          available={false}
          store={mockStore}
          onHome={vi.fn()}
          onWorkout={vi.fn()}
          onHistory={vi.fn()}
        />,
      );
    });

    const status = container.querySelector('[data-progress-status]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('Reload saved workouts to view progress.');
    const reloadBtn = status?.querySelector<HTMLButtonElement>('button');
    expect(reloadBtn?.textContent).toBe('Reload saved workouts');
  });

  it('shows resume workout CTA and warmup-only empty state when history has only warmups', async () => {
    const warmupOnlyWorkout: Workout = {
      id: 'warmup-1',
      name: 'Workout warmup',
      startedAt: 0,
      finishedAt: now - 1000,
      unit: 'kg',
      exercises: [{
        id: 'ex-1',
        name: 'Bench press',
        sets: [{ id: 's-1', weight: 20, reps: 10, kind: 'warmup' }],
      }],
    };
    const activeWorkout: Workout = {
      id: 'active-1',
      name: 'Active workout',
      startedAt: now - 500,
      finishedAt: null,
      unit: 'kg',
      exercises: [],
    };
    const onWorkout = vi.fn();

    await act(async () => {
      root.render(
        <WorkoutProgress
          data={{ version: 3, revision: 1, active: activeWorkout, history: [warmupOnlyWorkout] }}
          available
          onHome={vi.fn()}
          onWorkout={onWorkout}
          onHistory={vi.fn()}
        />,
      );
    });

    const status = container.querySelector('[data-progress-status]');
    expect(status?.textContent).toContain('No regular sets logged');
    expect(status?.textContent).toContain('Complete a workout with a regular set to see your progress.');
    expect(status?.textContent).toContain('Warm-ups are excluded from personal records.');

    const resumeBtn = status?.querySelector<HTMLButtonElement>('button');
    expect(resumeBtn?.textContent).toBe('Resume workout');
    await act(async () => {
      resumeBtn?.click();
    });
    expect(onWorkout).toHaveBeenCalledTimes(1);
  });
});
