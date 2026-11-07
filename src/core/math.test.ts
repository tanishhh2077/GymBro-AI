import { describe, expect, it } from 'vitest';
import {
  angleAt,
  angleFromVertical,
  clamp,
  cross,
  dot,
  fillGaps,
  meanFinite,
  midpoint,
  norm,
  ramp,
  round0,
  round1,
  smooth,
  stdFinite,
  sub,
} from './math';

describe('vector operations', () => {
  describe('sub', () => {
    it('subtracts 3D vectors correctly', () => {
      const a = { x: 5, y: 7, z: 9 };
      const b = { x: 2, y: 3, z: 4 };
      expect(sub(a, b)).toEqual({ x: 3, y: 4, z: 5 });
    });

    it('handles negative coordinates and zero vectors', () => {
      const a = { x: -1, y: 2, z: -3 };
      const b = { x: 4, y: -5, z: 6 };
      expect(sub(a, b)).toEqual({ x: -5, y: 7, z: -9 });

      const zero = { x: 0, y: 0, z: 0 };
      expect(sub(a, zero)).toEqual(a);
      expect(sub(zero, a)).toEqual({ x: 1, y: -2, z: 3 });
    });

    it('propagates NaN and handles infinite coordinates', () => {
      const a = { x: NaN, y: 1, z: 2 };
      const b = { x: 3, y: 4, z: 5 };
      const result = sub(a, b);
      expect(result.x).toBeNaN();
      expect(result.y).toBe(-3);
      expect(result.z).toBe(-3);

      const inf = { x: Infinity, y: 0, z: -Infinity };
      const diff = sub(inf, { x: 1, y: 0, z: 1 });
      expect(diff.x).toBe(Infinity);
      expect(diff.y).toBe(0);
      expect(diff.z).toBe(-Infinity);
    });
  });

  describe('dot', () => {
    it('returns 0 for orthogonal vectors', () => {
      const a = { x: 1, y: 0, z: 0 };
      const b = { x: 0, y: 1, z: 0 };
      expect(dot(a, b)).toBe(0);
    });

    it('returns positive product for parallel vectors and negative for opposing vectors', () => {
      const a = { x: 2, y: 0, z: 0 };
      const parallel = { x: 3, y: 0, z: 0 };
      const opposite = { x: -3, y: 0, z: 0 };
      expect(dot(a, parallel)).toBe(6);
      expect(dot(a, opposite)).toBe(-6);
    });

    it('computes dot product with all 3 coordinates', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: -5, z: 6 };
      // 1*4 + 2*(-5) + 3*6 = 4 - 10 + 18 = 12
      expect(dot(a, b)).toBe(12);
    });

    it('returns NaN if any coordinate is NaN and handles Infinity', () => {
      expect(dot({ x: NaN, y: 0, z: 0 }, { x: 1, y: 2, z: 3 })).toBeNaN();
      expect(dot({ x: 1, y: 0, z: 0 }, { x: Infinity, y: 0, z: 0 })).toBe(Infinity);
    });
  });

  describe('norm', () => {
    it('returns 0 for the zero vector', () => {
      expect(norm({ x: 0, y: 0, z: 0 })).toBe(0);
      expect(norm({ x: -0, y: -0, z: -0 })).toBe(0);
    });

    it('returns unit length for axis unit vectors', () => {
      expect(norm({ x: 1, y: 0, z: 0 })).toBe(1);
      expect(norm({ x: 0, y: -1, z: 0 })).toBe(1);
      expect(norm({ x: 0, y: 0, z: 1 })).toBe(1);
    });

    it('computes Euclidean length for 2D and 3D vectors with negative coordinates', () => {
      expect(norm({ x: 3, y: 4, z: 0 })).toBe(5);
      expect(norm({ x: -3, y: -4, z: 0 })).toBe(5);
      expect(norm({ x: 1, y: 2, z: 2 })).toBe(3);
    });

    it('returns NaN when coordinates contain NaN and Infinity when containing Infinity', () => {
      expect(norm({ x: NaN, y: 0, z: 0 })).toBeNaN();
      expect(norm({ x: Infinity, y: 0, z: 0 })).toBe(Infinity);
    });
  });

  describe('cross', () => {
    it('computes standard right-handed Cartesian basis cross products', () => {
      const i = { x: 1, y: 0, z: 0 };
      const j = { x: 0, y: 1, z: 0 };
      const k = { x: 0, y: 0, z: 1 };

      expect(cross(i, j)).toEqual(k);
      expect(cross(j, k)).toEqual(i);
      expect(cross(k, i)).toEqual(j);
    });

    it('satisfies anti-commutativity cross(a, b) = -cross(b, a)', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: 5, z: 6 };
      const ab = cross(a, b);
      const ba = cross(b, a);
      expect(ab).toEqual({ x: -ba.x, y: -ba.y, z: -ba.z });
    });

    it('returns zero vector for parallel vectors and zero vectors', () => {
      const a = { x: 2, y: 3, z: 4 };
      expect(cross(a, a)).toEqual({ x: 0, y: 0, z: 0 });
      expect(cross(a, { x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('propagates NaN when coordinates contain NaN', () => {
      const result = cross({ x: NaN, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
      expect(result.x).toBe(0);
      expect(result.y).toBeNaN();
      expect(result.z).toBeNaN();
    });
  });

  describe('midpoint', () => {
    it('calculates the midpoint between two vectors', () => {
      const a = { x: 0, y: 10, z: -20 };
      const b = { x: 10, y: 20, z: 30 };
      expect(midpoint(a, b)).toEqual({ x: 5, y: 15, z: 5 });
    });

    it('returns the same point if both vectors are identical', () => {
      const p = { x: -3.5, y: 7.2, z: 0 };
      expect(midpoint(p, p)).toEqual(p);
    });

    it('propagates NaN when coordinates contain NaN', () => {
      const result = midpoint({ x: NaN, y: 2, z: 4 }, { x: 0, y: 2, z: 4 });
      expect(result.x).toBeNaN();
      expect(result.y).toBe(2);
      expect(result.z).toBe(4);
    });
  });
});

describe('clamp', () => {
  it('keeps value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps value below lower bound to lo', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps value above upper bound to hi', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles boundary values exactly', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('works with negative ranges', () => {
    expect(clamp(-15, -10, -5)).toBe(-10);
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(-2, -10, -5)).toBe(-5);
  });

  it('returns NaN when any parameter is NaN', () => {
    expect(clamp(NaN, 0, 10)).toBeNaN();
    expect(clamp(5, NaN, 10)).toBeNaN();
    expect(clamp(5, 0, NaN)).toBeNaN();
  });

  it('handles degenerate identical bounds (lo === hi)', () => {
    expect(clamp(3, 5, 5)).toBe(5);
    expect(clamp(5, 5, 5)).toBe(5);
    expect(clamp(7, 5, 5)).toBe(5);
  });

  it('returns hi when range is inverted (lo > hi)', () => {
    expect(clamp(5, 10, 0)).toBe(0);
  });
});

describe('angleAt', () => {
  it('calculates 90 degree angle at vertex b', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 1, z: 0 };
    expect(angleAt(a, b, c)).toBeCloseTo(90, 5);
  });

  it('calculates 180 degree angle for collinear opposite rays', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: -1, y: 0, z: 0 };
    expect(angleAt(a, b, c)).toBeCloseTo(180, 5);
  });

  it('calculates 0 degree angle for collinear identical rays', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 2, y: 0, z: 0 };
    expect(angleAt(a, b, c)).toBeCloseTo(0, 5);
  });

  it('calculates 45 degree angle accurately', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 1, y: 1, z: 0 };
    expect(angleAt(a, b, c)).toBeCloseTo(45, 5);
  });

  it('works across 3D planes', () => {
    const a = { x: 0, y: 0, z: 2 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 3, z: 0 };
    expect(angleAt(a, b, c)).toBeCloseTo(90, 5);
  });

  it('returns NaN if any ray length is degenerate (below 1e-9)', () => {
    const p = { x: 1, y: 2, z: 3 };
    const other = { x: 4, y: 5, z: 6 };

    // ba is zero length
    expect(angleAt(p, p, other)).toBeNaN();
    // bc is zero length
    expect(angleAt(other, p, p)).toBeNaN();
    // all identical
    expect(angleAt(p, p, p)).toBeNaN();
  });

  it('returns NaN when coordinates contain NaN', () => {
    const a = { x: NaN, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 1, z: 0 };
    expect(angleAt(a, b, c)).toBeNaN();
    expect(angleAt(b, a, c)).toBeNaN();
    expect(angleAt(b, c, a)).toBeNaN();
  });

  it('clamps dot product to [-1, 1] avoiding NaN from float precision inaccuracies', () => {
    // For identical 3D vector (1,1,1), norm * norm = sqrt(3)*sqrt(3) which can slightly round to < 3,
    // making dot / denom slightly > 1 without clamping.
    const v = { x: 1, y: 1, z: 1 };
    const origin = { x: 0, y: 0, z: 0 };
    expect(angleAt(v, origin, v)).toBeCloseTo(0, 5);

    const negV = { x: -1, y: -1, z: -1 };
    expect(angleAt(v, origin, negV)).toBeCloseTo(180, 5);
  });
});

describe('angleFromVertical', () => {
  it('returns 0 for lines parallel to vertical axis (both upward and downward)', () => {
    const a = { x: 0, y: 0, z: 0 };
    const bUp = { x: 0, y: 5, z: 0 };
    const bDown = { x: 0, y: -5, z: 0 };

    expect(angleFromVertical(a, bUp)).toBeCloseTo(0, 5);
    expect(angleFromVertical(a, bDown)).toBeCloseTo(0, 5);
  });

  it('returns 90 for horizontal lines', () => {
    const a = { x: 0, y: 0, z: 0 };
    const bRight = { x: 5, y: 0, z: 0 };
    const bLeft = { x: -5, y: 0, z: 0 };

    expect(angleFromVertical(a, bRight)).toBeCloseTo(90, 5);
    expect(angleFromVertical(a, bLeft)).toBeCloseTo(90, 5);
  });

  it('returns 45 for diagonal lines', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 5, y: 5, z: 0 };
    expect(angleFromVertical(a, b)).toBeCloseTo(45, 5);
  });

  it('ignores the z coordinate', () => {
    const a = { x: 0, y: 0, z: 100 };
    const b = { x: 0, y: 5, z: -200 };
    expect(angleFromVertical(a, b)).toBeCloseTo(0, 5);
  });

  it('returns NaN if 2D distance in xy plane is degenerate (< 1e-9)', () => {
    const a = { x: 1, y: 2, z: 0 };
    // identical xy
    const b = { x: 1, y: 2, z: 10 };
    expect(angleFromVertical(a, b)).toBeNaN();
  });

  it('returns NaN when coordinates contain NaN', () => {
    const a = { x: NaN, y: 0, z: 0 };
    const b = { x: 0, y: 5, z: 0 };
    expect(angleFromVertical(a, b)).toBeNaN();
    expect(angleFromVertical(b, a)).toBeNaN();
  });
});

describe('meanFinite', () => {
  it('returns NaN for empty array', () => {
    expect(meanFinite([])).toBeNaN();
  });

  it('returns NaN if array contains only NaNs or Infinities', () => {
    expect(meanFinite([NaN])).toBeNaN();
    expect(meanFinite([NaN, NaN])).toBeNaN();
    expect(meanFinite([Infinity])).toBeNaN();
    expect(meanFinite([-Infinity])).toBeNaN();
    expect(meanFinite([Infinity, -Infinity, NaN])).toBeNaN();
  });

  it('calculates average of finite numbers and ignores NaNs and Infinities', () => {
    expect(meanFinite([10, 20, 30])).toBe(20);
    expect(meanFinite([10, NaN, 20, Infinity, 30, -Infinity])).toBe(20);
    expect(meanFinite([42])).toBe(42);
  });

  it('handles negative numbers and zeros correctly', () => {
    expect(meanFinite([-10, 0, 10])).toBe(0);
    expect(meanFinite([-20, -10])).toBe(-15);
    expect(meanFinite([0, -0])).toBe(0);
  });

  it('handles sparse arrays with empty slots', () => {
    const sparse: number[] = [];
    sparse[0] = 10;
    sparse[2] = 20;
    expect(meanFinite(sparse)).toBe(15);
  });
});

describe('stdFinite', () => {
  it('returns 0 for arrays with fewer than 2 finite numbers', () => {
    expect(stdFinite([])).toBe(0);
    expect(stdFinite([5])).toBe(0);
    expect(stdFinite([NaN])).toBe(0);
    expect(stdFinite([NaN, NaN])).toBe(0);
    expect(stdFinite([NaN, 42, NaN])).toBe(0);
    expect(stdFinite([Infinity, -Infinity])).toBe(0);
    expect(stdFinite([Infinity, 42])).toBe(0);
  });

  it('returns 0 for arrays of identical finite numbers', () => {
    expect(stdFinite([7, 7, 7, 7])).toBe(0);
  });

  it('calculates population standard deviation of finite values', () => {
    // [1, 5]: mean = 3. var = ((1-3)^2 + (5-3)^2)/2 = (4+4)/2 = 4. std = 2.
    expect(stdFinite([1, 5])).toBe(2);

    // [2, 4, 4, 4, 5, 5, 7, 9]: mean = 5.
    // squared diffs: 9, 1, 1, 1, 0, 0, 4, 16 -> sum = 32 / 8 = 4 -> std = 2.
    expect(stdFinite([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('filters out non-finite values before calculating std', () => {
    expect(stdFinite([NaN, 1, Infinity, 5, -Infinity, NaN])).toBe(2);
  });

  it('handles sparse arrays with empty slots', () => {
    const sparse: number[] = [];
    sparse[0] = 1;
    sparse[2] = 5;
    expect(stdFinite(sparse)).toBe(2);
  });
});

describe('smooth', () => {
  it('returns a shallow copy when window <= 0', () => {
    const input = [1, 2, 3];
    const res0 = smooth(input, 0);
    expect(res0).toEqual(input);
    expect(res0).not.toBe(input);

    const resNeg = smooth(input, -1);
    expect(resNeg).toEqual(input);
    expect(resNeg).not.toBe(input);
  });

  it('returns empty array when given empty array', () => {
    expect(smooth([], 2)).toEqual([]);
  });

  it('handles single-element and two-element arrays', () => {
    expect(smooth([42], 1)).toEqual([42]);

    const smoothedNaN = smooth([NaN], 1);
    expect(smoothedNaN).toHaveLength(1);
    expect(smoothedNaN[0]).toBeNaN();

    // Two elements with radius 1: each index averages [10, 20] -> 15
    expect(smooth([10, 20], 1)).toEqual([15, 15]);
  });

  it('computes centered moving average with window radius 1', () => {
    const values = [10, 20, 30, 40];
    const smoothed = smooth(values, 1);
    // index 0: [10, 20] -> 15
    // index 1: [10, 20, 30] -> 20
    // index 2: [20, 30, 40] -> 30
    // index 3: [30, 40] -> 35
    expect(smoothed).toEqual([15, 20, 30, 35]);
  });

  it('ignores NaNs and Infinities in the smoothing window and outputs NaN when no finite numbers are in range', () => {
    const values = [10, NaN, 30];
    const smoothed = smooth(values, 1);
    // index 0: [10, NaN] -> 10 / 1 = 10
    // index 1: [10, NaN, 30] -> 40 / 2 = 20
    // index 2: [NaN, 30] -> 30 / 1 = 30
    expect(smoothed).toEqual([10, 20, 30]);

    const withInfinities = [10, Infinity, 30];
    expect(smooth(withInfinities, 1)).toEqual([10, 20, 30]);

    const allNaN = [NaN, NaN, NaN];
    const smoothedNaN = smooth(allNaN, 1);
    expect(smoothedNaN).toHaveLength(3);
    for (const v of smoothedNaN) {
      expect(v).toBeNaN();
    }

    const allInfinite = [Infinity, -Infinity];
    const smoothedInf = smooth(allInfinite, 1);
    expect(smoothedInf).toHaveLength(2);
    expect(smoothedInf[0]).toBeNaN();
    expect(smoothedInf[1]).toBeNaN();
  });

  it('spreads a single finite value surrounded by NaNs across its window radius', () => {
    expect(smooth([NaN, 10, NaN], 1)).toEqual([10, 10, 10]);
  });

  it('handles window radius larger than the array length', () => {
    const values = [10, 20, 30];
    // radius 5 covers the entire array for all indices -> mean is 20 for all
    expect(smooth(values, 5)).toEqual([20, 20, 20]);
  });

  it('does not mutate the input array', () => {
    const values = [1, 2, 3];
    smooth(values, 1);
    expect(values).toEqual([1, 2, 3]);
  });
});

describe('fillGaps', () => {
  it('handles empty arrays', () => {
    expect(fillGaps([])).toEqual([]);
  });

  it('handles single-element arrays', () => {
    expect(fillGaps([42])).toEqual([42]);

    const singleNaN = fillGaps([NaN]);
    expect(singleNaN).toHaveLength(1);
    expect(singleNaN[0]).toBeNaN();

    expect(fillGaps([Infinity])).toEqual([Infinity]);
  });

  it('returns identical copy if array has no finite values', () => {
    const allNaN = [NaN, NaN];
    const result = fillGaps(allNaN);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
    expect(result).not.toBe(allNaN);

    const allInf = [Infinity, -Infinity];
    expect(fillGaps(allInf)).toEqual(allInf);
  });

  it('returns identical copy if array has no NaNs', () => {
    const input = [1, 2, 3, 4];
    const result = fillGaps(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it('fills leading NaNs and Infinities with the first finite value', () => {
    expect(fillGaps([NaN, NaN, 10, 20])).toEqual([10, 10, 10, 20]);
    expect(fillGaps([Infinity, -Infinity, 10, 20])).toEqual([10, 10, 10, 20]);
  });

  it('fills trailing NaNs and Infinities with the last finite value', () => {
    expect(fillGaps([10, 20, NaN, NaN])).toEqual([10, 20, 20, 20]);
    expect(fillGaps([10, 20, Infinity, -Infinity])).toEqual([10, 20, 20, 20]);
  });

  it('fills single finite value surrounded by NaNs', () => {
    expect(fillGaps([NaN, 42, NaN])).toEqual([42, 42, 42]);
  });

  it('linearly interpolates intermediate gaps of length 1 and greater', () => {
    // Gap of 1: span = 2 (positive slope)
    expect(fillGaps([10, NaN, 20])).toEqual([10, 15, 20]);

    // Gap of 2: span = 3 (positive slope)
    expect(fillGaps([10, NaN, NaN, 40])).toEqual([10, 20, 30, 40]);

    // Negative slope
    expect(fillGaps([20, NaN, 10])).toEqual([20, 15, 10]);
    expect(fillGaps([30, NaN, NaN, 0])).toEqual([30, 20, 10, 0]);

    // Flat gap (zero slope)
    expect(fillGaps([10, NaN, NaN, 10])).toEqual([10, 10, 10, 10]);

    // Interpolation over Infinities
    expect(fillGaps([10, Infinity, 20])).toEqual([10, 15, 20]);
    expect(fillGaps([20, -Infinity, 10])).toEqual([20, 15, 10]);
  });

  it('handles complex sequences with leading, intermediate, and trailing gaps', () => {
    const input = [NaN, 0, NaN, NaN, 30, NaN, 50, NaN];
    // leading NaN -> 0
    // span between 0 and 30 is 3 -> 10, 20
    // span between 30 and 50 is 2 -> 40
    // trailing NaN -> 50
    expect(fillGaps(input)).toEqual([0, 0, 10, 20, 30, 40, 50, 50]);
  });

  it('does not mutate the input array', () => {
    const input = [NaN, 10, NaN, 20];
    const inputCopy = [...input];
    fillGaps(input);
    expect(input).toEqual(inputCopy);
  });
});

describe('rounding helpers', () => {
  describe('round1', () => {
    it('rounds to one decimal place', () => {
      expect(round1(12.34)).toBe(12.3);
      expect(round1(12.36)).toBe(12.4);
      expect(round1(0)).toBe(0);
      expect(round1(-12.34)).toBe(-12.3);
      expect(round1(-12.36)).toBe(-12.4);
    });

    it('returns NaN for NaN input and preserves Infinities', () => {
      expect(round1(NaN)).toBeNaN();
      expect(round1(Infinity)).toBe(Infinity);
      expect(round1(-Infinity)).toBe(-Infinity);
    });
  });

  describe('round0', () => {
    it('rounds to nearest integer', () => {
      expect(round0(12.4)).toBe(12);
      expect(round0(12.6)).toBe(13);
      expect(round0(0)).toBe(0);
      expect(round0(-12.4)).toBe(-12);
      expect(round0(-12.6)).toBe(-13);
      expect(round0(-1.5)).toBe(-1); // standard JS Math.round behavior towards +Infinity
    });

    it('returns NaN for NaN input and preserves Infinities', () => {
      expect(round0(NaN)).toBeNaN();
      expect(round0(Infinity)).toBe(Infinity);
      expect(round0(-Infinity)).toBe(-Infinity);
    });
  });
});

describe('ramp', () => {
  it('returns 1 if hi === lo and value >= hi, else 0', () => {
    expect(ramp(5, 5, 5)).toBe(1);
    expect(ramp(6, 5, 5)).toBe(1);
    expect(ramp(4, 5, 5)).toBe(0);
    // When hi === lo and value is NaN, NaN >= hi is false -> 0
    expect(ramp(NaN, 5, 5)).toBe(0);
  });

  it('maps value proportionally between lo and hi, clamped between 0 and 1', () => {
    expect(ramp(0, 0, 10)).toBe(0);
    expect(ramp(10, 0, 10)).toBe(1);
    expect(ramp(5, 0, 10)).toBe(0.5);
    expect(ramp(2.5, 0, 10)).toBe(0.25);
    expect(ramp(7.5, 0, 10)).toBe(0.75);

    // Below lo clamped to 0
    expect(ramp(-5, 0, 10)).toBe(0);
    // Above hi clamped to 1
    expect(ramp(15, 0, 10)).toBe(1);
  });

  it('returns NaN when value or bounds are NaN (with hi !== lo)', () => {
    expect(ramp(NaN, 0, 10)).toBeNaN();
    expect(ramp(5, NaN, 10)).toBeNaN();
    expect(ramp(5, 0, NaN)).toBeNaN();
  });

  it('supports negative ranges', () => {
    // [-50, -10], width = 40. value = -20 -> (-20 - (-50)) / 40 = 30 / 40 = 0.75
    expect(ramp(-20, -50, -10)).toBe(0.75);
    expect(ramp(-60, -50, -10)).toBe(0);
    expect(ramp(0, -50, -10)).toBe(1);
  });

  it('computes inverted ramp when lo > hi', () => {
    expect(ramp(5, 10, 0)).toBe(0.5);
    expect(ramp(12, 10, 0)).toBe(0);
    expect(ramp(-2, 10, 0)).toBe(1);
  });
});
