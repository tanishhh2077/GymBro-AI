import { describe, expect, it } from 'vitest';
import type { ElbowSample, ElbowSeries } from './elbowAngles';
import { summarizeElbows } from './elbowSummary';

// Supplied synthetic measurements, not inference or real bench validation.
function sample(time: number, frameIndex: number, left: number | null, right: number | null): ElbowSample {
  return { time, frameIndex,
    left: left === null ? { degrees: null, reason: 'low-visibility' } : { degrees: left, reason: null },
    right: right === null ? { degrees: null, reason: 'no-pose' } : { degrees: right, reason: null } };
}
function series(samples: ElbowSample[]): ElbowSeries {
  return { version: 'elbow-2d-v1', coordinateSystem: 'image-pixels', unit: 'degrees',
    minVisibility: .5, width: 200, height: 100, duration: 3, targetFps: 30, samples };
}

describe('clip elbow summary', () => {
  it('counts sides independently and preserves extrema evidence timestamps/indices', () => {
    const result = summarizeElbows(series([
      sample(.1, 7, 90, null), sample(.4, 10, 45, 120), sample(1.2, 30, null, 60),
    ]));
    expect(result).toEqual({ totalSamples: 3,
      left: { measurableSamples: 2, unavailableSamples: 1,
        lowest: { degrees: 45, time: .4, frameIndex: 10 }, highest: { degrees: 90, time: .1, frameIndex: 7 } },
      right: { measurableSamples: 2, unavailableSamples: 1,
        lowest: { degrees: 60, time: 1.2, frameIndex: 30 }, highest: { degrees: 120, time: .4, frameIndex: 10 } } });
  });
  it('keeps empty and entirely unavailable sides null instead of replacing them with zero', () => {
    expect(summarizeElbows(series([]))).toEqual({ totalSamples: 0,
      left: { measurableSamples: 0, unavailableSamples: 0, lowest: null, highest: null },
      right: { measurableSamples: 0, unavailableSamples: 0, lowest: null, highest: null } });
    const result = summarizeElbows(series([sample(0, 0, null, 90), sample(2, 40, null, null)]));
    expect(result.left).toEqual({ measurableSamples: 0, unavailableSamples: 2, lowest: null, highest: null });
    expect(result.right.measurableSamples + result.right.unavailableSamples).toBe(result.totalSamples);
    expect(result.right.lowest).toEqual({ degrees: 90, time: 0, frameIndex: 0 });
    expect(result.right.highest).toEqual(result.right.lowest);
  });
  it('keeps legitimate endpoint degrees and time zero', () => {
    const result = summarizeElbows(series([sample(0, 0, 0, 180), sample(1.7, 51, 180, 0)]));
    expect(result.left.lowest).toEqual({ degrees: 0, time: 0, frameIndex: 0 });
    expect(result.left.highest?.degrees).toBe(180);
    expect(result.right.lowest?.degrees).toBe(0);
    expect(result.right.highest?.degrees).toBe(180);
  });
  it('compares raw angles and keeps the earliest tie with irregular media timestamps', () => {
    const result = summarizeElbows(series([
      sample(.013, 4, 89.9, 100), sample(.11, 9, 90.1, 100),
      sample(.7, 23, 89.9, 100), sample(2.1, 90, 90.1, 100),
    ]));
    expect(result.left.lowest).toEqual({ degrees: 89.9, time: .013, frameIndex: 4 });
    expect(result.left.highest).toEqual({ degrees: 90.1, time: .11, frameIndex: 9 });
    expect(result.right.lowest?.time).toBe(.013);
    expect(result.right.highest?.time).toBe(.013);
    expect(result.totalSamples).toBe(4);
  });
  it.each(['no-pose', 'missing-joint', 'invalid-coordinate', 'outside-image',
    'unknown-visibility', 'low-visibility', 'degenerate-geometry'] as const)('excludes %s measurements without imputing', reason => {
    const s = series([sample(0, 0, null, 30)]); s.samples[0].left = { degrees: null, reason };
    const result = summarizeElbows(s);
    expect(result.left).toEqual({ measurableSamples: 0, unavailableSamples: 1, lowest: null, highest: null });
    expect(result.right.measurableSamples).toBe(1);
  });
  it('does not mutate inputs or return a reference into the source measurements', () => {
    const s = series([sample(.4, 8, 45, null)]), before = structuredClone(s);
    Object.freeze(s.samples[0].left); Object.freeze(s.samples[0].right);
    Object.freeze(s.samples[0]); Object.freeze(s.samples); Object.freeze(s);
    const result = summarizeElbows(s);
    result.left.lowest!.degrees = 5;
    expect(s).toEqual(before);
    expect(result.left.highest?.degrees).toBe(45);
  });
  it.each([
    ['version', 'other'], ['unit', 'radians'], ['coordinateSystem', 'world'],
    ['duration', 0], ['duration', NaN], ['duration', Infinity], ['samples', null],
  ])('rejects incompatible %s=%s', (key, value) => {
    expect(() => summarizeElbows(Object.assign(series([]), { [key]: value }))).toThrow(RangeError);
  });
  it.each([
    [sample(-.1, 0, 90, 90)], [sample(NaN, 0, 90, 90)], [sample(3.1, 0, 90, 90)],
    [sample(0, -1, 90, 90)], [sample(0, .5, 90, 90)],
    [sample(0, 0, 90, 90), sample(0, 1, 90, 90)],
    [sample(1, 0, 90, 90), sample(.2, 1, 90, 90)],
    [sample(0, 1, 90, 90), sample(.1, 1, 90, 90)],
  ])('rejects malformed observation identity/time (case %#)', (...samples) => {
    expect(() => summarizeElbows(series(samples))).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -1, 181])('rejects invalid measured degrees %s', degrees => {
    expect(() => summarizeElbows(series([sample(0, 0, degrees, 90)]))).toThrow(RangeError);
  });
  it.each([{ degrees: null, reason: null }, { degrees: null, reason: 'made-up' },
    { degrees: 90, reason: 'low-visibility' }])('rejects contradictory or unknown measurement state %#', measurement => {
    const s = series([sample(0, 0, 90, 90)]); Object.assign(s.samples[0].left, measurement);
    expect(() => summarizeElbows(s)).toThrow(RangeError);
  });
});

describe('edge cases: single sample, all-missing clips, ties, and 0/180 degrees', () => {
  describe('single-sample clip behavior', () => {
    it('summarizes a single measurable sample where lowest and highest coincide', () => {
      const result = summarizeElbows(series([sample(0.5, 3, 90, 120)]));
      expect(result).toEqual({
        totalSamples: 1,
        left: {
          measurableSamples: 1,
          unavailableSamples: 0,
          lowest: { degrees: 90, time: 0.5, frameIndex: 3 },
          highest: { degrees: 90, time: 0.5, frameIndex: 3 },
        },
        right: {
          measurableSamples: 1,
          unavailableSamples: 0,
          lowest: { degrees: 120, time: 0.5, frameIndex: 3 },
          highest: { degrees: 120, time: 0.5, frameIndex: 3 },
        },
      });
    });

    it('summarizes a single unavailable sample with null extrema', () => {
      const result = summarizeElbows(series([sample(0.5, 3, null, null)]));
      expect(result).toEqual({
        totalSamples: 1,
        left: { measurableSamples: 0, unavailableSamples: 1, lowest: null, highest: null },
        right: { measurableSamples: 0, unavailableSamples: 1, lowest: null, highest: null },
      });
    });

    it('summarizes a single asymmetric sample where only one side is measurable', () => {
      const result = summarizeElbows(series([sample(0.1, 0, null, 75)]));
      expect(result.left).toEqual({ measurableSamples: 0, unavailableSamples: 1, lowest: null, highest: null });
      expect(result.right).toEqual({
        measurableSamples: 1,
        unavailableSamples: 0,
        lowest: { degrees: 75, time: 0.1, frameIndex: 0 },
        highest: { degrees: 75, time: 0.1, frameIndex: 0 },
      });
    });
  });

  describe('all-missing clip behavior', () => {
    it('summarizes multi-frame clips where all frames are unavailable on both sides', () => {
      const s = series([
        sample(0.1, 1, null, null),
        sample(0.2, 2, null, null),
        sample(0.3, 3, null, null),
        sample(0.4, 4, null, null),
        sample(0.5, 5, null, null),
      ]);
      s.samples[0].left = { degrees: null, reason: 'no-pose' };
      s.samples[1].left = { degrees: null, reason: 'low-visibility' };
      s.samples[2].left = { degrees: null, reason: 'outside-image' };
      s.samples[3].left = { degrees: null, reason: 'degenerate-geometry' };
      s.samples[4].left = { degrees: null, reason: 'missing-joint' };

      const result = summarizeElbows(s);
      expect(result.totalSamples).toBe(5);
      expect(result.left).toEqual({ measurableSamples: 0, unavailableSamples: 5, lowest: null, highest: null });
      expect(result.right).toEqual({ measurableSamples: 0, unavailableSamples: 5, lowest: null, highest: null });
    });

    it('summarizes clips where one side is completely unavailable and the other is fully measurable', () => {
      const s = series([
        sample(0.1, 0, null, 60),
        sample(0.2, 1, null, 110),
        sample(0.3, 2, null, 85),
      ]);
      const result = summarizeElbows(s);
      expect(result.left).toEqual({ measurableSamples: 0, unavailableSamples: 3, lowest: null, highest: null });
      expect(result.right).toEqual({
        measurableSamples: 3,
        unavailableSamples: 0,
        lowest: { degrees: 60, time: 0.1, frameIndex: 0 },
        highest: { degrees: 110, time: 0.2, frameIndex: 1 },
      });
    });
  });

  describe('ties for lowest and highest angle', () => {
    it('preserves the earliest observation when all samples have the identical angle', () => {
      const s = series([
        sample(0.1, 1, 90, 90),
        sample(0.2, 2, 90, 90),
        sample(0.3, 3, 90, 90),
        sample(0.4, 4, 90, 90),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 90, time: 0.1, frameIndex: 1 });
      expect(result.left.highest).toEqual({ degrees: 90, time: 0.1, frameIndex: 1 });
      expect(result.right.lowest).toEqual({ degrees: 90, time: 0.1, frameIndex: 1 });
      expect(result.right.highest).toEqual({ degrees: 90, time: 0.1, frameIndex: 1 });
    });

    it('keeps the earliest sample on ties for lowest angle', () => {
      const s = series([
        sample(0.1, 0, 45, 90),
        sample(0.2, 1, 80, 90),
        sample(0.3, 2, 45, 90),
        sample(0.4, 3, 120, 90),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 45, time: 0.1, frameIndex: 0 });
      expect(result.left.highest).toEqual({ degrees: 120, time: 0.4, frameIndex: 3 });
    });

    it('keeps the earliest sample on ties for highest angle', () => {
      const s = series([
        sample(0.1, 0, 70, 90),
        sample(0.2, 1, 140, 90),
        sample(0.3, 2, 80, 90),
        sample(0.4, 3, 140, 90),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 70, time: 0.1, frameIndex: 0 });
      expect(result.left.highest).toEqual({ degrees: 140, time: 0.2, frameIndex: 1 });
    });

    it('preserves earliest ties across alternating extrema', () => {
      const s = series([
        sample(0.1, 0, 40, 160),
        sample(0.2, 1, 150, 50),
        sample(0.3, 2, 40, 160),
        sample(0.4, 3, 150, 50),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 40, time: 0.1, frameIndex: 0 });
      expect(result.left.highest).toEqual({ degrees: 150, time: 0.2, frameIndex: 1 });
      expect(result.right.lowest).toEqual({ degrees: 50, time: 0.2, frameIndex: 1 });
      expect(result.right.highest).toEqual({ degrees: 160, time: 0.1, frameIndex: 0 });
    });

    it('preserves earliest tie when identical extrema are separated by unavailable observations', () => {
      const s = series([
        sample(0.1, 0, 60, 60),
        sample(0.2, 1, null, null),
        sample(0.3, 2, 60, 60),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 60, time: 0.1, frameIndex: 0 });
      expect(result.left.highest).toEqual({ degrees: 60, time: 0.1, frameIndex: 0 });
    });
  });

  describe('0 and 180 degree angles and range boundaries', () => {
    it('records 0 degrees as the lowest angle without treating 0 as falsy or unset', () => {
      const s = series([
        sample(0.1, 0, 90, 100),
        sample(0.2, 1, 0, 50),
        sample(0.3, 2, 45, 0),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 0, time: 0.2, frameIndex: 1 });
      expect(result.right.lowest).toEqual({ degrees: 0, time: 0.3, frameIndex: 2 });
    });

    it('records 180 degrees as the highest angle', () => {
      const s = series([
        sample(0.1, 0, 120, 180),
        sample(0.2, 1, 180, 130),
        sample(0.3, 2, 90, 80),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.highest).toEqual({ degrees: 180, time: 0.2, frameIndex: 1 });
      expect(result.right.highest).toEqual({ degrees: 180, time: 0.1, frameIndex: 0 });
    });

    it('supports 0 and 180 degrees occurring in the same clip', () => {
      const s = series([
        sample(0.1, 0, 0, 180),
        sample(0.2, 1, 90, 90),
        sample(0.3, 2, 180, 0),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 0, time: 0.1, frameIndex: 0 });
      expect(result.left.highest).toEqual({ degrees: 180, time: 0.3, frameIndex: 2 });
      expect(result.right.lowest).toEqual({ degrees: 0, time: 0.3, frameIndex: 2 });
      expect(result.right.highest).toEqual({ degrees: 180, time: 0.1, frameIndex: 0 });
    });

    it('keeps earliest sample on ties at 0 degrees and ties at 180 degrees', () => {
      const s = series([
        sample(0.1, 0, 0, 180),
        sample(0.2, 1, 45, 90),
        sample(0.3, 2, 0, 180),
      ]);
      const result = summarizeElbows(s);
      expect(result.left.lowest).toEqual({ degrees: 0, time: 0.1, frameIndex: 0 });
      expect(result.right.highest).toEqual({ degrees: 180, time: 0.1, frameIndex: 0 });
    });

    it.each([0.0001, 179.9999])('accepts near-boundary angle %s', (degrees) => {
      const s = series([sample(0.1, 0, degrees, degrees)]);
      const result = summarizeElbows(s);
      expect(result.left.lowest?.degrees).toBe(degrees);
      expect(result.left.highest?.degrees).toBe(degrees);
    });

    it.each([-0.0001, 180.0001])('rejects just-out-of-bounds angle %s', (degrees) => {
      expect(() => summarizeElbows(series([sample(0, 0, degrees, 90)]))).toThrow(RangeError);
    });
  });
});
