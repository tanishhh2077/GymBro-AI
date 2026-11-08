import type { WeightUnit, WorkoutSet } from '@/types/workout';
import { WorkoutError } from './workouts';

export interface WarmupStep { readonly reps: number; readonly weight: number }

/** Fractions of the working weight and the reps for each step; a starting point, not a prescription. */
const STEPS: readonly (readonly [number, number])[] = [[0.4, 5], [0.6, 3], [0.8, 2]];
const INCREMENT: Record<WeightUnit, number> = { lb: 5, kg: 2.5 };

/**
 * Proposes up to four lighter sets that climb toward the working weight. Each load is rounded to the nearest
 * 5 lb or 2.5 kg; loads that round to zero, reach the working weight or repeat an earlier load are left out,
 * so a very light working weight can produce fewer steps or none.
 */
export function suggestWarmupRamp(workingWeight: number, unit: WeightUnit): WarmupStep[] {
  if (!Number.isFinite(workingWeight) || workingWeight <= 0) throw new WorkoutError('validation', 'Enter a working weight above 0.');
  const increment = INCREMENT[unit];
  if (!increment) throw new WorkoutError('validation', 'This weight unit is not supported.');
  const steps: WarmupStep[] = [];
  for (const [fraction, reps] of STEPS) {
    const weight = Math.round(workingWeight * fraction / increment) * increment;
    if (weight <= 0 || weight >= workingWeight || steps.some(step => step.weight === weight)) continue;
    steps.push({ reps, weight });
  }
  return steps.slice(0, 4);
}

/** The largest positive logged load, used to prefill the working weight; undefined when there is none. */
export function heaviestWeight(sets: readonly WorkoutSet[]): number | undefined {
  const heaviest = Math.max(0, ...sets.map(set => set.weight));
  return heaviest > 0 ? heaviest : undefined;
}
