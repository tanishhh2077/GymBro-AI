import type { WeightUnit } from '@/types/workout';
import { weightParts } from './trainingDetailText';

/** A logged weight with the other unit in small text. Conversion is display-only and rounded to 0.5. */
export function WeightText({ weight, unit, bodyweight }: { weight: number; unit: WeightUnit; bodyweight?: boolean }) {
  const [main, alternate] = weightParts(weight, unit, bodyweight);
  return <>{main}{alternate && <span className="block text-xs text-slate-500">≈ {alternate}</span>}</>;
}

/** The other unit for a typed weight, shown under an input while the value is a valid number. */
export function AlternateWeightHint({ value, unit, bodyweight }: { value: string; unit: WeightUnit; bodyweight?: boolean }) {
  const weight = value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(weight)) return null;
  const [, alternate] = weightParts(weight, unit, bodyweight);
  return alternate ? <p className="mt-1 text-xs text-slate-500">≈ {alternate}</p> : null;
}

export function RpeText({ rpe }: { rpe?: number }) {
  return rpe === undefined ? <><span aria-hidden="true">—</span><span className="sr-only">None</span></> : <>{rpe}</>;
}
