import type { NormalizedLandmark, PoseFrame } from "@/types";

export interface DisplayPose {
  landmarks: NormalizedLandmark[];
  sampleTime: number;
  interpolated: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_INTERPOLATION_INTERVALS = 2;
const MAX_ENDPOINT_INTERVALS = 1;
const TIME_ROUNDOFF_ULPS = 4;

function withinInterval(a: number, b: number, limit: number): boolean {
  // Allow subtraction roundoff, not an additional perceptible display gap.
  const roundoff = TIME_ROUNDOFF_ULPS * Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= limit + roundoff;
}

function knownVisibility(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function observation(frame: PoseFrame): DisplayPose | null {
  if (!frame.landmarks?.length) return null;
  return {
    landmarks: frame.landmarks.map(point => ({ ...point })),
    sampleTime: frame.time,
    interpolated: false,
  };
}

/** Frames come from the engine's ordered, unique observations; output is display-only. */
export function samplePose(
  frames: readonly PoseFrame[], time: number, targetFps: number,
): DisplayPose | null {
  if (!frames.length || !Number.isFinite(time) || time < 0 ||
      !Number.isFinite(targetFps) || targetFps <= 0) return null;
  const maxGap = MAX_INTERPOLATION_INTERVALS / targetFps;
  const endpointHold = MAX_ENDPOINT_INTERVALS / targetFps;
  if (!Number.isFinite(maxGap) || !Number.isFinite(endpointHold)) return null;

  let lo = 0;
  let hi = frames.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (frames[mid].time < time) lo = mid + 1;
    else hi = mid;
  }

  if (lo < frames.length && frames[lo].time === time) return observation(frames[lo]);
  if (lo === 0) {
    return withinInterval(time, frames[0].time, endpointHold) ? observation(frames[0]) : null;
  }
  if (lo === frames.length) {
    const last = frames[frames.length - 1];
    return withinInterval(time, last.time, endpointHold) ? observation(last) : null;
  }

  const a = frames[lo - 1];
  const b = frames[lo];
  const span = b.time - a.time;
  if (!Number.isFinite(span) || span <= 0 || !withinInterval(a.time, b.time, maxGap) ||
      !a.landmarks?.length || !b.landmarks?.length ||
      a.landmarks.length !== b.landmarks.length) return null;

  const fraction = (time - a.time) / span;
  const landmarks = a.landmarks.map((point, index) => {
    const next = b.landmarks![index];
    return {
      x: point.x + (next.x - point.x) * fraction,
      y: point.y + (next.y - point.y) * fraction,
      z: point.z + (next.z - point.z) * fraction,
      visibility: knownVisibility(point.visibility) && knownVisibility(next.visibility)
        ? Math.min(point.visibility, next.visibility) : undefined,
    };
  });
  return { landmarks, sampleTime: time, interpolated: true };
}

export function isDrawableLandmark(
  point: NormalizedLandmark | undefined, minVisibility: number,
): boolean {
  return !!point && Number.isFinite(minVisibility) && minVisibility >= 0 && minVisibility <= 1 &&
    Number.isFinite(point.x) && point.x >= 0 && point.x <= 1 &&
    Number.isFinite(point.y) && point.y >= 0 && point.y <= 1 &&
    knownVisibility(point.visibility) && point.visibility >= minVisibility;
}

/** Centered object-fit: contain geometry in CSS pixels, independent of device-pixel ratio. */
export function videoContentRect(
  sourceWidth: number, sourceHeight: number, boxWidth: number, boxHeight: number,
): Rect | null {
  if (![sourceWidth, sourceHeight, boxWidth, boxHeight].every(value => Number.isFinite(value) && value > 0)) {
    return null;
  }
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { x: (boxWidth - width) / 2, y: (boxHeight - height) / 2, width, height };
}
