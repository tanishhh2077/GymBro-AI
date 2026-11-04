import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark, PoseFrame, PoseResult } from '@/types';
import { measureElbows, nearestElbowSample, elbowSegments, adjacentElbowSample } from './elbowAngles';

// Synthetic geometry only: no model observation or human-video accuracy claim.
function frame(time = 0, index = 0): PoseFrame {
  const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1 }));
  for (const offset of [0, 1]) {
    landmarks[11 + offset] = { x: .2, y: .4, z: 0, visibility: 1 };
    landmarks[13 + offset] = { x: .2, y: .6, z: 0, visibility: 1 };
    landmarks[15 + offset] = { x: .4, y: .6, z: 0, visibility: 1 };
  }
  return { index, time, landmarks, worldLandmarks: null };
}
function pose(frames = [frame()]): PoseResult {
  return { frames, width: 200, height: 100, duration: 2, fps: 30, delegate: 'GPU',
    coverage: { totalFrames: frames.length, framesWithPose: frames.length, detectionRate: 1, meanVisibility: 1 } };
}
function series(times = [0, 1 / 30, 2 / 30]) {
  return measureElbows(pose(times.map((time, index) => frame(time, index))));
}

describe('image-space elbow measurements', () => {
  it('measures both elbows and records explicit units, version and source geometry', () => {
    const result = measureElbows(pose());
    expect(result).toMatchObject({ version: 'elbow-2d-v1', unit: 'degrees', coordinateSystem: 'image-pixels', width: 200, height: 100, minVisibility: .5, targetFps: 30 });
    expect(result.samples[0].left.degrees).toBeCloseTo(90);
    expect(result.samples[0].right.degrees).toBeCloseTo(90);
  });
  it.each([[200, 100, 45], [100, 200, 75.963756532]])('corrects axis scaling in %sx%s sources', (width, height, angle) => {
    const f = frame();
    Object.assign(f.landmarks![11], { x: .5, y: 0 });
    Object.assign(f.landmarks![13], { x: 0, y: 0 });
    Object.assign(f.landmarks![15], { x: .5, y: 1 });
    expect(measureElbows({ ...pose([f]), width, height }).samples[0].left.degrees).toBeCloseTo(angle, 5);
  });
  it.each([[.9, 180], [.1, 0]])('retains a legitimate endpoint angle %s / %s', (wristX, expected) => {
    const f = frame();
    Object.assign(f.landmarks![11], { x: .1, y: .5 });
    Object.assign(f.landmarks![13], { x: .5, y: .5 });
    Object.assign(f.landmarks![15], { x: wristX, y: .5 });
    expect(measureElbows(pose([f])).samples[0].left.degrees).toBeCloseTo(expected);
  });
  it('preserves observation indices/media times and ignores model z/world coordinates', () => {
    const frames = [frame(.12, 7), frame(.41, 20)];
    for (const f of frames) for (const p of f.landmarks!) p.z = 1000;
    const result = measureElbows(pose(frames));
    expect(result.samples.map(({ time, frameIndex }) => [time, frameIndex])).toEqual([[.12, 7], [.41, 20]]);
    expect(result.samples[0].left.degrees).toBeCloseTo(90);
  });
  it('keeps the other side when one elbow is obscured', () => {
    const f = frame(); f.landmarks![13].visibility = .49;
    const sample = measureElbows(pose([f])).samples[0];
    expect(sample.left).toEqual({ degrees: null, reason: 'low-visibility' });
    expect(sample.right.degrees).toBeCloseTo(90);
  });
  it.each([undefined, NaN, Infinity, -.1, 1.1])('abstains for unavailable visibility %s', (visibility) => {
    const f = frame(); f.landmarks![11].visibility = visibility;
    expect(measureElbows(pose([f])).samples[0].left.reason).toBe('unknown-visibility');
  });
  it('includes the cutoff and supports an explicit different cutoff', () => {
    const f = frame(); f.landmarks![11].visibility = .5;
    expect(measureElbows(pose([f])).samples[0].left.degrees).toBeCloseTo(90);
    f.landmarks![11].visibility = .4;
    expect(measureElbows(pose([f]), .3).samples[0].left.degrees).toBeCloseTo(90);
  });
  it.each([[NaN, 'invalid-coordinate'], [Infinity, 'invalid-coordinate'], [-.1, 'outside-image'], [1.1, 'outside-image']] as const)('abstains for x=%s', (x, reason) => {
    const f = frame(); f.landmarks![15].x = x;
    expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason });
  });
  it('keeps distinct no-pose, missing-joint and degenerate reasons', () => {
    const absent = frame(); absent.landmarks = null;
    const short = frame(); short.landmarks = short.landmarks!.slice(0, 15);
    const coincident = frame(); coincident.landmarks![11] = { ...coincident.landmarks![13] };
    expect(measureElbows(pose([absent])).samples[0].left.reason).toBe('no-pose');
    expect(measureElbows(pose([short])).samples[0].left.reason).toBe('missing-joint');
    expect(measureElbows(pose([coincident])).samples[0].left.reason).toBe('degenerate-geometry');
  });
  it.each([['width', 0], ['height', 1.5], ['fps', 0], ['duration', NaN]] as const)('rejects invalid %s', (key, value) => {
    expect(() => measureElbows({ ...pose(), [key]: value })).toThrow(RangeError);
  });
  it.each([-.1, 1.1, NaN, Infinity])('rejects invalid cutoff %s', (cutoff) => {
    expect(() => measureElbows(pose(), cutoff)).toThrow(RangeError);
  });
  it.each([[frame(-1)], [frame(NaN)], [frame(3)], [frame(0), frame(0, 1)], [frame(1), frame(.5, 1)], [frame(0, -1)], [frame(0, 1.5)]])('rejects invalid observation order/identity (case %#)', (...frames) => {
    expect(() => measureElbows(pose(frames))).toThrow(RangeError);
  });
  it('does not modify raw observations', () => {
    const p = pose(); const before = structuredClone(p);
    for (const point of p.frames[0].landmarks!) Object.freeze(point);
    Object.freeze(p.frames[0].landmarks); Object.freeze(p.frames[0]); Object.freeze(p.frames);
    measureElbows(p);
    expect(p).toEqual(before);
  });
});

describe('observed sample selection and discontinuous evidence', () => {
  it('selects exact observations, earlier ties and bounded endpoints', () => {
    const s = series([0, .04]);
    expect(nearestElbowSample(s, .04)?.time).toBe(.04);
    expect(nearestElbowSample(s, .02)?.time).toBe(0);
    expect(nearestElbowSample(series([0]), 1 / 30)?.time).toBe(0);
    expect(nearestElbowSample(series([0]), 1 / 30 + 1e-7)).toBeNull();
  });
  it('never replaces an exact missing observation with valid neighbors', () => {
    const frames = [frame(0), frame(1 / 30, 1), frame(2 / 30, 2)]; frames[1].landmarks = null;
    const sample = nearestElbowSample(measureElbows(pose(frames)), 1 / 30);
    expect(sample?.left.reason).toBe('no-pose');
  });
  it('returns no sample in long gaps, invalid queries or empty input', () => {
    expect(nearestElbowSample(series([0, 1]), .5)).toBeNull();
    for (const time of [-1, NaN, Infinity, 3]) expect(nearestElbowSample(series(), time)).toBeNull();
    expect(nearestElbowSample(measureElbows(pose([])), 0)).toBeNull();
  });
  it('splits each side independently at unavailable observations and large gaps', () => {
    const frames = [0, 1 / 30, 2 / 30, .1, .3, 1 / 3].map((time, i) => frame(time, i));
    frames[1].landmarks![11].visibility = 0;
    const s = measureElbows(pose(frames));
    expect(elbowSegments(s, 'left').map(points => points.map(p => p.time))).toEqual([[0], [2 / 30, .1], [.3, 1 / 3]]);
    expect(elbowSegments(s, 'right').map(points => points.map(p => p.time))).toEqual([[0, 1 / 30, 2 / 30, .1], [.3, 1 / 3]]);
    expect(elbowSegments(measureElbows(pose([])), 'left')).toEqual([]);
  });
  it('keeps a two-interval segment boundary, allowing only subtraction roundoff', () => {
    expect(elbowSegments(series([1, 1 + 2 / 30]), 'left')).toHaveLength(1);
    expect(elbowSegments(series([1, 1 + 2 / 30 + 1e-7]), 'left')).toHaveLength(2);
  });
  it('navigates to actual measured times, skipping wholly unavailable observations', () => {
    const frames = [frame(.1), frame(.2, 1), frame(.7, 2)]; frames[1].landmarks = null;
    const s = measureElbows(pose(frames));
    expect(adjacentElbowSample(s, .1, 'next')?.time).toBe(.7);
    expect(adjacentElbowSample(s, .7, 'previous')?.time).toBe(.1);
    expect(adjacentElbowSample(s, .1, 'previous')).toBeNull();
    expect(adjacentElbowSample(s, .7, 'next')).toBeNull();
    expect(adjacentElbowSample(s, NaN, 'next')).toBeNull();
  });
});
