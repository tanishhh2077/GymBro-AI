import { formatWeight } from '@/core/weightDisplay';
import type { WeightUnit } from '@/types/workout';

/** The saved-unit text and, separately, the display-only converted value (null for plain bodyweight). */
export function weightParts(weight: number, unit: WeightUnit, bodyweight = false): { text: string; alternate: string | null } {
  const text = formatWeight(weight, unit, { bodyweight });
  const full = formatWeight(weight, unit, { bodyweight, alternate: true });
  // "−30 lb · −13.5 kg assist": the primary text already says "assist".
  const alternate = full.split(' · ')[1]?.replace(/ assist$/, '') ?? null;
  return { text, alternate };
}

/** One exact progress or goal group, e.g. "Pull-up (lb, bodyweight)". */
export function groupLabel(group: { name: string; unit: WeightUnit; bodyweight?: boolean }): string {
  return `${group.name} (${group.unit}${group.bodyweight ? ', bodyweight' : ''})`;
}
