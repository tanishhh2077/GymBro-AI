import type { NormalizedLandmark, PoseResult } from '@/types';
import { POSE } from './landmarks';
import { angleAt } from './math';

export type ElbowSide = 'left' | 'right';
export type ElbowUnavailableReason = 'no-pose' | 'missing-joint' | 'invalid-coordinate' |
  'outside-image' | 'unknown-visibility' | 'low-visibility' | 'degenerate-geometry';
export type ElbowMeasurement = { degrees: number; reason: null } |
  { degrees: null; reason: ElbowUnavailableReason };
export interface ElbowSample {
  /** Stored observation index, not a decoded source-video frame number. */
  frameIndex: number;
  time: number;
  left: ElbowMeasurement;
  right: ElbowMeasurement;
}
export interface ElbowSeries {
  version: 'elbow-2d-v1';
  coordinateSystem: 'image-pixels';
  unit: 'degrees';
  minVisibility: number;
  width: number;
  height: number;
  duration: number;
  targetFps: number;
  samples: ElbowSample[];
}
export interface ElbowPoint { time: number; degrees: number }

const JOINTS = {
  left: [POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW, POSE.LEFT_WRIST],
  right: [POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST],
} as const;
const unavailable = (reason: ElbowUnavailableReason): ElbowMeasurement => ({ degrees: null, reason });
const positive = (n: number) => Number.isFinite(n) && n > 0;
const roundoff = (a: number, b: number) => 4 * Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b));

/** Interior angle of observed shoulder/elbow/wrist in image pixels. No model z
 * or inferred world coordinate participates; this is not anatomical ground truth. */
export function measureElbows(pose: Readonly<PoseResult>, minVisibility = .5): ElbowSeries {
  if (!Number.isSafeInteger(pose.width) || !positive(pose.width) ||
      !Number.isSafeInteger(pose.height) || !positive(pose.height) ||
      !positive(pose.duration) || !positive(pose.fps) || !Number.isFinite(2 / pose.fps) ||
      !Number.isFinite(minVisibility) || minVisibility < 0 || minVisibility > 1 || !Array.isArray(pose.frames)) {
    throw new RangeError('Invalid pose dimensions, duration, sampling target or visibility cutoff.');
  }
  let previousTime = -1;
  let previousIndex = -1;
  const samples = pose.frames.map((frame): ElbowSample => {
    if (!Number.isFinite(frame.time) || frame.time < 0 || frame.time > pose.duration ||
        frame.time <= previousTime || !Number.isSafeInteger(frame.index) || frame.index <= previousIndex) {
      throw new RangeError('Pose observations require ordered, unique media times and observation indices.');
    }
    previousTime = frame.time;
    previousIndex = frame.index;
    return {
      frameIndex: frame.index, time: frame.time,
      left: measureSide(frame.landmarks, 'left', pose, minVisibility),
      right: measureSide(frame.landmarks, 'right', pose, minVisibility),
    };
  });
  return {
    version: 'elbow-2d-v1', coordinateSystem: 'image-pixels', unit: 'degrees',
    minVisibility, width: pose.width, height: pose.height,
    duration: pose.duration, targetFps: pose.fps, samples,
  };
}

function measureSide(landmarks: readonly NormalizedLandmark[] | null, side: ElbowSide,
  dimensions: Pick<PoseResult, 'width' | 'height'>, cutoff: number): ElbowMeasurement {
  if (!landmarks) return unavailable('no-pose');
  const points = JOINTS[side].map((index) => landmarks[index]);
  for (const point of points) {
    if (!point) return unavailable('missing-joint');
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return unavailable('invalid-coordinate');
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return unavailable('outside-image');
    if (typeof point.visibility !== 'number' || !Number.isFinite(point.visibility) ||
        point.visibility < 0 || point.visibility > 1) return unavailable('unknown-visibility');
    if (point.visibility < cutoff) return unavailable('low-visibility');
  }
  const pixels = points.map(({ x, y }) => ({ x: x * dimensions.width, y: y * dimensions.height, z: 0 }));
  const degrees = angleAt(pixels[0], pixels[1], pixels[2]);
  return Number.isFinite(degrees) ? { degrees, reason: null } : unavailable('degenerate-geometry');
}

function validQuery(series: ElbowSeries, time: number): boolean {
  return Number.isFinite(time) && time >= 0 && time <= series.duration;
}
function lowerBound(samples: readonly ElbowSample[], time: number): number {
  let lo = 0; let hi = samples.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (samples[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Select a raw observation, including an unavailable one; never interpolate. */
export function nearestElbowSample(series: ElbowSeries, time: number): ElbowSample | null {
  if (!validQuery(series, time)) return null;
  const index = lowerBound(series.samples, time);
  const before = series.samples[index - 1];
  const after = series.samples[index];
  const sample = before && (!after || time - before.time <= after.time - time + roundoff(time, after.time))
    ? before : after;
  return sample && Math.abs(time - sample.time) <= 1 / series.targetFps + roundoff(time, sample.time) ? sample : null;
}

/** Plot raw points only; absent samples and long time gaps break the line. */
export function elbowSegments(series: ElbowSeries, side: ElbowSide): ElbowPoint[][] {
  const segments: ElbowPoint[][] = [];
  let current: ElbowPoint[] | null = null;
  for (const sample of series.samples) {
    const { degrees } = sample[side];
    if (degrees === null) { current = null; continue; }
    const last = current?.[current.length - 1];
    if (!current || (last && sample.time - last.time > 2 / series.targetFps + roundoff(sample.time, last.time))) {
      current = []; segments.push(current);
    }
    current.push({ time: sample.time, degrees });
  }
  return segments;
}

export function adjacentElbowSample(series: ElbowSeries, time: number, direction: 'previous' | 'next'): ElbowSample | null {
  if (!validQuery(series, time)) return null;
  const step = direction === 'next' ? 1 : -1;
  let index = lowerBound(series.samples, time) - (step === -1 ? 1 : 0);
  for (; index >= 0 && index < series.samples.length; index += step) {
    const sample = series.samples[index];
    if ((sample.time - time) * step <= roundoff(time, sample.time)) continue;
    if (sample.left.degrees !== null || sample.right.degrees !== null) return sample;
  }
  return null;
}
