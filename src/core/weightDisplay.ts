import type { WeightUnit } from '@/types/workout';
import { WorkoutError } from './workouts';

const POUNDS_PER_KILOGRAM = 2.20462262185;
const MINUS = '−';

/** Display-only conversion rounded to the nearest 0.5; converted values are never stored. */
function convert(weight: number, unit: WeightUnit): number {
  const value = unit === 'kg' ? weight * POUNDS_PER_KILOGRAM : weight / POUNDS_PER_KILOGRAM;
  // `|| 0` turns a rounded -0 into 0 so it never prints with a sign.
  return Math.round(value * 2) / 2 || 0;
}
function signed(weight: number, unit: WeightUnit): string {
  return `${weight > 0 ? '+' : weight < 0 ? MINUS : ''}${Math.abs(weight)} ${unit}`;
}

/**
 * Formats a logged load in its saved unit, e.g. "100 kg · 220.5 lb" with `alternate`. For a bodyweight
 * exercise the weight is added load: "Bodyweight", "+20 lb", or "−30 lb assist" for assisted (negative) weight.
 */
export function formatWeight(weight: number, unit: WeightUnit, options: { bodyweight?: boolean; alternate?: boolean } = {}): string {
  if (!Number.isFinite(weight) || (unit !== 'kg' && unit !== 'lb')) throw new WorkoutError('validation', 'This weight cannot be displayed.');
  const other: WeightUnit = unit === 'kg' ? 'lb' : 'kg';
  if (!options.bodyweight) return `${weight} ${unit}${options.alternate ? ` · ${convert(weight, unit)} ${other}` : ''}`;
  if (weight === 0) return 'Bodyweight';
  const text = `${signed(weight, unit)}${options.alternate ? ` · ${signed(convert(weight, unit), other)}` : ''}`;
  return weight < 0 ? `${text} assist` : text;
}
