import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseHistoryWorkout } from '@/core/exerciseHistory';
import { ExerciseWorkoutHistory } from './ExerciseWorkoutHistory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ExerciseWorkoutHistory a11y', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  function makeEntries(count: number): ExerciseHistoryWorkout[] {
    return Array.from({ length: count }, (_, i) => ({
      workoutId: `w-${i + 1}`,
      workoutName: `Workout ${i + 1}`,
      finishedAt: 1000 + i * 1000,
      exercises: [
        {
          id: `e-${i + 1}`,
          name: 'Bench press',
          sets: [{ id: `s-${i + 1}`, reps: 5, weight: 100 }],
        },
      ],
    }));
  }

  it('exposes accessible names on article list items and role="status" on counter', async () => {
    const entries = makeEntries(2);
    await act(async () => {
      root.render(
        <ExerciseWorkoutHistory
          entries={entries}
          name="Bench press"
          unit="lb"
          periodLabel="all time"
          onHistory={() => {}}
        />,
      );
    });

    const list = container.querySelector('[role="list"]');
    expect(list?.getAttribute('aria-label')).toBe('Completed workouts for this exercise');

    const articles = container.querySelectorAll('article[role="listitem"]');
    expect(articles).toHaveLength(2);
    for (const article of articles) {
      const labelledBy = article.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      const heading = document.getElementById(labelledBy!);
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toMatch(/Workout \d/);
    }

    const counter = container.querySelector('p[aria-live="polite"]');
    expect(counter?.getAttribute('role')).toBe('status');
  });

  it('shifts focus appropriately when "Show more completed workouts" causes the button to disappear', async () => {
    const entries = makeEntries(12); // PAGE_SIZE is 10, so 12 leaves 2 for show more
    const onHistory = vi.fn();
    await act(async () => {
      root.render(
        <ExerciseWorkoutHistory
          entries={entries}
          name="Bench press"
          unit="lb"
          periodLabel="all time"
          onHistory={onHistory}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>('button.btn-ghost');
    expect(button?.textContent).toBe('Show more completed workouts');
    button!.focus();
    expect(document.activeElement).toBe(button);

    await act(async () => {
      button!.click();
    });

    // Button should now be gone, and activeElement should NOT be document.body
    expect(container.querySelector('button.btn-ghost')).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
  });
});
