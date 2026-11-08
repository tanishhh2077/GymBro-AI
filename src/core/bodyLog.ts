import type { BodyEntry, BodyTrend, BodyTrendExclusion, BodyTrendKey, BodyTrendPoint, LengthUnit } from '@/types/body';
import type { WeightUnit, WorkoutData } from '@/types/workout';
import { BODY_MEASUREMENT_NAMES, WorkoutError } from './workouts';

/** The saved note for this exact exercise name, or null. Own keys only, so "constructor" is just a name. */
export function exerciseNoteFor(data: WorkoutData, name: string): string | null {
  const notes = data.exerciseNotes;
  return notes && Object.prototype.hasOwnProperty.call(notes, name) ? notes[name] : null;
}

const byDate = (a: BodyEntry, b: BodyEntry) => a.date - b.date || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** A sorted copy for lists; the saved order is left unchanged. */
export function bodyLogNewestFirst(entries: readonly BodyEntry[]): BodyEntry[] {
  return [...entries].sort((a, b) => byDate(b, a));
}

/**
 * Chart points for body weight or one measurement in a single stored unit, oldest first. Values are never
 * converted: entries in another unit are listed in `excluded` with a reason. Without a chosen unit, the
 * unit of the latest in-range entry is used. `range` matches `progressRangeStart`; null means all time.
 */
export function bodyTrend(entries: readonly BodyEntry[], key: BodyTrendKey,
  range: { readonly start: number | null; readonly end?: number }, unit?: WeightUnit | LengthUnit): BodyTrend {
  const weight = key === 'weight';
  if (!weight && !(BODY_MEASUREMENT_NAMES as readonly string[]).includes(key)) {
    throw new WorkoutError('validation', 'Choose body weight or a listed body measurement to chart.');
  }
  if (unit !== undefined && weight && unit !== 'kg' && unit !== 'lb') throw new WorkoutError('validation', 'Choose kg or lb to chart body weight.');
  if (unit !== undefined && !weight && unit !== 'cm' && unit !== 'in') throw new WorkoutError('validation', 'Choose cm or in to chart this measurement.');
  const recorded: { entry: BodyEntry; value: number; unit: WeightUnit | LengthUnit }[] = [];
  for (const entry of [...entries].sort(byDate)) {
    if ((range.start !== null && entry.date < range.start) || (range.end !== undefined && entry.date > range.end)) continue;
    const value = weight ? entry.weight : entry.measurements?.[key as Exclude<BodyTrendKey, 'weight'>];
    const stored = weight ? entry.unit : entry.lengthUnit;
    if (value !== undefined && stored !== undefined) recorded.push({ entry, value, unit: stored });
  }
  const units = [...new Set(recorded.map(item => item.unit))].sort();
  const chosen = unit ?? recorded[recorded.length - 1]?.unit ?? null;
  const points: BodyTrendPoint[] = [], excluded: BodyTrendExclusion[] = [];
  for (const { entry, value, unit: stored } of recorded) {
    if (stored === chosen) points.push({ id: entry.id, date: entry.date, value });
    else excluded.push({ id: entry.id, date: entry.date, value, unit: stored, reason: 'different-unit' });
  }
  return { key, unit: chosen, points, excluded, units };
}
