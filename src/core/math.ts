/**
 * Geometry and signal-processing helpers used by the analyzers.
 * All angle math is designed to run on 3D world landmarks for view
 * invariance, but the vector helpers work on any {x,y,z}.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const dot = (a: Vec3, b: Vec3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

export const norm = (a: Vec3): number => Math.sqrt(dot(a, a));

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const midpoint = (a: Vec3, b: Vec3): Vec3 => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
});

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Interior angle at vertex `b` formed by points a-b-c, in degrees [0,180].
 */
export function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const ba = sub(a, b);
  const bc = sub(c, b);
  const denom = norm(ba) * norm(bc);
  if (denom < 1e-9) return NaN;
  const cosv = clamp(dot(ba, bc) / denom, -1, 1);
  return (Math.acos(cosv) * 180) / Math.PI;
}

/**
 * Angle of the line a->b relative to the vertical axis (gravity), in degrees.
 * 0 = perfectly vertical, 90 = horizontal. Uses the dominant 2D plane of the
 * world landmarks (y is up/down, x horizontal). z is ignored so this reads as
 * "lean" regardless of camera depth noise.
 */
export function angleFromVertical(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return NaN;
  // Vertical reference is (0, 1). cos = |dy| / len.
  const cosv = clamp(Math.abs(dy) / len, 0, 1);
  return (Math.acos(cosv) * 180) / Math.PI;
}

/** Mean of finite numbers; returns NaN if none are finite. */
export function meanFinite(values: number[]): number {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n === 0 ? NaN : sum / n;
}

/** Standard deviation of finite numbers. */
export function stdFinite(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 0;
  const m = meanFinite(finite);
  const variance =
    finite.reduce((acc, v) => acc + (v - m) * (v - m), 0) / finite.length;
  return Math.sqrt(variance);
}

/**
 * Centered moving-average smoothing over a numeric series, ignoring NaNs.
 * `window` is the half-window radius (so total window = 2*window+1).
 */
export function smooth(values: number[], window: number): number[] {
  if (window <= 0) return values.slice();
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = i - window; j <= i + window; j++) {
      if (j < 0 || j >= values.length) continue;
      const v = values[j];
      if (Number.isFinite(v)) {
        sum += v;
        n++;
      }
    }
    out[i] = n > 0 ? sum / n : NaN;
  }
  return out;
}

/**
 * Linearly interpolate NaN gaps in a series so downstream peak detection is
 * stable. Leading/trailing NaNs are filled with the nearest finite value.
 */
export function fillGaps(values: number[]): number[] {
  const out = values.slice();
  const n = out.length;
  let firstFinite = -1;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(out[i])) {
      firstFinite = i;
      break;
    }
  }
  if (firstFinite === -1) return out; // all NaN
  for (let i = 0; i < firstFinite; i++) out[i] = out[firstFinite];

  let lastFinite = firstFinite;
  for (let i = firstFinite + 1; i < n; i++) {
    if (Number.isFinite(out[i])) {
      if (i - lastFinite > 1) {
        const span = i - lastFinite;
        for (let k = 1; k < span; k++) {
          out[lastFinite + k] =
            out[lastFinite] + ((out[i] - out[lastFinite]) * k) / span;
        }
      }
      lastFinite = i;
    }
  }
  for (let i = lastFinite + 1; i < n; i++) out[i] = out[lastFinite];
  return out;
}

export const round1 = (v: number): number => Math.round(v * 10) / 10;
export const round0 = (v: number): number => Math.round(v);

/** Map a value through a linear ramp into [0,1], clamped. */
export function ramp(value: number, lo: number, hi: number): number {
  if (hi === lo) return value >= hi ? 1 : 0;
  return clamp((value - lo) / (hi - lo), 0, 1);
}
