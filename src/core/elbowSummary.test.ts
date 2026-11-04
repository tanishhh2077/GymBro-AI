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
