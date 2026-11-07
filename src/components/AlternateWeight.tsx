import type { WeightUnit } from '@/types/workout';
import { weightParts } from './weightText';

/** The other unit in small text after a logged weight. The conversion is display only and never stored. */
export function AlternateWeight({ weight, unit, bodyweight = false }: { weight: number; unit: WeightUnit; bodyweight?: boolean }) {
  const { alternate } = weightParts(weight, unit, bodyweight);
  if (!alternate) return null;
  return <span className="ml-1 text-xs font-normal text-slate-500">≈ {alternate}</span>;
}
