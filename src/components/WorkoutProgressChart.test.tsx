import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RecordedSet } from '@/types/progress';
import { WorkoutProgressChart } from './WorkoutProgressChart';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkoutProgressChart converted axis tick labels', () => {
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

  it('shows converted unit in axis ticks as "≈ …" for standard loaded workouts', async () => {
    const workouts: RecordedSet[] = [
      { workoutId: 'w1', workoutName: 'Leg Day', finishedAt: 1000, exerciseId: 'e1', setId: 's1', reps: 5, weight: 100 },
    ];

    await act(async () => {
      root.render(<WorkoutProgressChart workouts={workouts} unit="kg" />);
    });

    const axis = container.querySelector('[aria-hidden="true"]');
    expect(axis).toBeTruthy();
    const text = axis!.textContent ?? '';

    // Primary values
    expect(text).toContain('100');
    expect(text).toContain('50');
    expect(text).toContain('0');

    // Converted values with ≈
    expect(text).toContain('≈ 220.5 lb');
    expect(text).toContain('≈ 110 lb');
    expect(text).toContain('≈ 0 lb');
  });

  it('formats converted units for lb correctly', async () => {
    const workouts: RecordedSet[] = [
      { workoutId: 'w1', workoutName: 'Chest Day', finishedAt: 1000, exerciseId: 'e1', setId: 's1', reps: 5, weight: 100 },
    ];

    await act(async () => {
      root.render(<WorkoutProgressChart workouts={workouts} unit="lb" />);
    });

    const axis = container.querySelector('[aria-hidden="true"]');
    expect(axis).toBeTruthy();
    const text = axis!.textContent ?? '';

    expect(text).toContain('≈ 45.5 kg');
    expect(text).toContain('≈ 22.5 kg');
    expect(text).toContain('≈ 0 kg');
  });

  it('shows correct converted signs and unicode minus for negative assisted bodyweight ticks', async () => {
    const workouts: RecordedSet[] = [
      { workoutId: 'w1', workoutName: 'Pull Day 1', finishedAt: 1000, exerciseId: 'e1', setId: 's1', reps: 5, weight: 20 },
      { workoutId: 'w2', workoutName: 'Pull Day 2', finishedAt: 2000, exerciseId: 'e1', setId: 's2', reps: 5, weight: -20 },
    ];

    await act(async () => {
      root.render(<WorkoutProgressChart workouts={workouts} unit="kg" bodyweight />);
    });

    const axis = container.querySelector('[aria-hidden="true"]');
    expect(axis).toBeTruthy();
    const text = axis!.textContent ?? '';

    // Primary bodyweight labels (+20, 0, −20 with unicode minus)
    expect(text).toContain('+20');
    expect(text).toContain('0');
    expect(text).toContain('−20');

    // Converted bodyweight labels (+44 lb, 0 lb, −44 lb with unicode minus)
    expect(text).toContain('≈ +44 lb');
    expect(text).toContain('≈ 0 lb');
    expect(text).toContain('≈ −44 lb');
  });
});
