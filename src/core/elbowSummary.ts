import type { ElbowSeries, ElbowUnavailableReason } from './elbowAngles';

export interface ElbowExtremum { degrees: number; time: number; frameIndex: number }
export interface ElbowSideSummary {
  measurableSamples: number;
  unavailableSamples: number;
  lowest: ElbowExtremum | null;
  highest: ElbowExtremum | null;
}
export interface ElbowClipSummary {
  totalSamples: number;
  left: ElbowSideSummary;
  right: ElbowSideSummary;
}
const REASONS = new Set<ElbowUnavailableReason>(['no-pose', 'missing-joint', 'invalid-coordinate',
  'outside-image', 'unknown-visibility', 'low-visibility', 'degenerate-geometry']);

/** Summarize raw observed angles only; no interpolation or movement assessment. */
export function summarizeElbows(series: Readonly<ElbowSeries>): ElbowClipSummary {
  if (!series || series.version !== 'elbow-2d-v1' || series.unit !== 'degrees' ||
      series.coordinateSystem !== 'image-pixels' || !Number.isFinite(series.duration) ||
      series.duration <= 0 || !Array.isArray(series.samples)) {
    throw new RangeError('Invalid elbow series version, units, duration or samples.');
  }
  const emptySide = (): ElbowSideSummary => ({ measurableSamples: 0, unavailableSamples: 0, lowest: null, highest: null });
  const result = { totalSamples: series.samples.length, left: emptySide(), right: emptySide() };
  let previousTime = -1, previousIndex = -1;
  for (const sample of series.samples) {
    if (!sample || !Number.isFinite(sample.time) || sample.time < 0 ||
        sample.time > series.duration || sample.time <= previousTime ||
        !Number.isSafeInteger(sample.frameIndex) || sample.frameIndex <= previousIndex) {
      throw new RangeError('Elbow observations require ordered, unique media times and indices.');
    }
    previousTime = sample.time; previousIndex = sample.frameIndex;
    for (const side of ['left', 'right'] as const) {
      const summary = result[side];
      const measurement = sample[side];
      if (!measurement || (measurement.degrees === null
        ? !REASONS.has(measurement.reason)
        : !Number.isFinite(measurement.degrees) || measurement.degrees < 0 ||
          measurement.degrees > 180 || measurement.reason !== null)) {
        throw new RangeError('Invalid elbow measurement value or missingness reason.');
      }
      const { degrees } = measurement;
      if (degrees === null) { summary.unavailableSamples++; continue; }
      summary.measurableSamples++;
      const point = { degrees, time: sample.time, frameIndex: sample.frameIndex };
      // Strict comparison keeps the earliest supporting observation on a tie.
      if (!summary.lowest || degrees < summary.lowest.degrees) summary.lowest = { ...point };
      if (!summary.highest || degrees > summary.highest.degrees) summary.highest = { ...point };
    }
  }
  return result;
}
