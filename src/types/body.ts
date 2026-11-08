import type { WeightUnit } from './workout';

export type LengthUnit = 'cm' | 'in';
/** The fixed schema6 set of tape measurements; any other name is rejected. */
export type BodyMeasurementName = 'neck' | 'chest' | 'waist' | 'hips' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh';
/** Each value is in the entry's `lengthUnit`, greater than 0 and at most 500. */
export type BodyMeasurements = { readonly [K in BodyMeasurementName]?: number };
/**
 * Schema6 body log entry: what the lifter wrote down about their body on one day, never derived from
 * workouts. `unit` is present exactly when `weight` is, and `lengthUnit` exactly when `measurements` is,
 * so a unit never describes a missing value. Stored values are never converted.
 */
export interface BodyEntryInput {
  /** Epoch milliseconds of the local day the entry describes (the editor's chosen date). */
  readonly date: number;
  /** Body weight, greater than 0 and at most 1000, in `unit`. */
  readonly weight?: number;
  readonly unit?: WeightUnit;
  /** At least one measurement when present. */
  readonly measurements?: BodyMeasurements;
  readonly lengthUnit?: LengthUnit;
  /** Trimmed text of 1-500 characters; omitted when empty. */
  readonly note?: string;
}
export interface BodyEntry extends BodyEntryInput { readonly id: string }
/** A body log value to chart: body weight or one named measurement. */
export type BodyTrendKey = 'weight' | BodyMeasurementName;
export interface BodyTrendPoint { readonly id: string; readonly date: number; readonly value: number }
/** An in-range entry left out of the chart because it was recorded in another unit. */
export interface BodyTrendExclusion {
  readonly id: string;
  readonly date: number;
  readonly value: number;
  readonly unit: WeightUnit | LengthUnit;
  readonly reason: 'different-unit';
}
export interface BodyTrend {
  readonly key: BodyTrendKey;
  /** The one unit every point uses; null when no entry in range records this value. */
  readonly unit: WeightUnit | LengthUnit | null;
  /** Oldest first; same-day entries keep ID order. */
  readonly points: readonly BodyTrendPoint[];
  readonly excluded: readonly BodyTrendExclusion[];
  /** Every unit recorded for this value in range, so a chart can offer a unit switch. */
  readonly units: readonly (WeightUnit | LengthUnit)[];
}
