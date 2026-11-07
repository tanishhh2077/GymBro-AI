import type { WeightUnit } from '@/types/workout';
import { formatWeight } from '@/core/weightDisplay';

export const BODYWEIGHT_HELP = 'Use 0 for bodyweight only, a negative number for assistance.';
export const RPE_HELP = 'Rate of perceived exertion, 1 to 10 in steps of 0.5. Leave blank for none. It never changes records or volume.';

/** Saved-unit text plus the converted unit, e.g. ["60 kg", "132.5 lb"], or ["−20 kg assist", "−44 lb assist"]. */
export function weightParts(weight: number, unit: WeightUnit, bodyweight = false): [string, string | null] {
  const main = formatWeight(weight, unit, { bodyweight });
  // formatWeight puts the converted value after " · "; "Bodyweight" alone has no second unit.
  const alternate = formatWeight(weight, unit, { bodyweight, alternate: true }).split(' · ')[1] ?? null;
  return [main, alternate];
}

/** Visible names for each superset in order of appearance: "Superset A", "Superset B", ... */
export function supersetNames(exercises: readonly { readonly superset?: string }[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const { superset } of exercises) {
    if (superset === undefined || names.has(superset)) continue;
    const index = names.size;
    names.set(superset, `Superset ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`);
  }
  return names;
}

/** Splits an ordered list into blocks: a whole superset, or one ungrouped exercise. */
export function exerciseBlocks<T extends { readonly superset?: string }>(exercises: readonly T[]) {
  const blocks: { group?: string; start: number; items: T[] }[] = [];
  exercises.forEach((exercise, index) => {
    const last = blocks[blocks.length - 1];
    if (exercise.superset !== undefined && last?.group === exercise.superset) last.items.push(exercise);
    else blocks.push({ group: exercise.superset, start: index, items: [exercise] });
  });
  return blocks;
}
