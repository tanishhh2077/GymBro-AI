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

describe('edge cases: geometry, visibility, coordinates and missingness', () => {
  describe('collinear and coincident geometry', () => {
    it.each([
      ['vertical straight (180 deg)', { x: .5, y: .2 }, { x: .5, y: .5 }, { x: .5, y: .8 }, 180],
      ['vertical folded (0 deg)', { x: .5, y: .2 }, { x: .5, y: .8 }, { x: .5, y: .2 }, 0],
      ['diagonal straight (180 deg)', { x: .2, y: .2 }, { x: .5, y: .5 }, { x: .8, y: .8 }, 180],
      ['diagonal folded (0 deg)', { x: .2, y: .2 }, { x: .5, y: .5 }, { x: .3, y: .3 }, 0],
      ['horizontal folded arm (0 deg)', { x: .3, y: .5 }, { x: .7, y: .5 }, { x: .4, y: .5 }, 0],
    ])('computes exact collinear angle for %s', (_, shoulder, elbow, wrist, expected) => {
      const f = frame();
      Object.assign(f.landmarks![11], shoulder);
      Object.assign(f.landmarks![13], elbow);
      Object.assign(f.landmarks![15], wrist);
      expect(measureElbows(pose([f])).samples[0].left.degrees).toBeCloseTo(expected, 4);
    });

    it('computes 0 degrees when shoulder and wrist are coincident but elbow is distinct', () => {
      const f = frame();
      Object.assign(f.landmarks![11], { x: .2, y: .4 });
      Object.assign(f.landmarks![13], { x: .2, y: .8 });
      Object.assign(f.landmarks![15], { x: .2, y: .4 });
      const sample = measureElbows(pose([f])).samples[0];
      expect(sample.left).toEqual({ degrees: 0, reason: null });
    });

    it.each([
      ['elbow coincident with wrist', 13, 15],
      ['elbow coincident with shoulder', 13, 11],
      ['all three joints coincident', -1, -1],
    ])('abstains with degenerate-geometry when %s', (_, j1, j2) => {
      const f = frame();
      if (j1 === -1) {
        Object.assign(f.landmarks![11], { x: .3, y: .3 });
        Object.assign(f.landmarks![13], { x: .3, y: .3 });
        Object.assign(f.landmarks![15], { x: .3, y: .3 });
      } else {
        Object.assign(f.landmarks![j1], { ...f.landmarks![j2] });
      }
      expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason: 'degenerate-geometry' });
    });

    it('measures right side collinear 0 and 180 degrees', () => {
      const f180 = frame();
      Object.assign(f180.landmarks![12], { x: .1, y: .5 });
      Object.assign(f180.landmarks![14], { x: .5, y: .5 });
      Object.assign(f180.landmarks![16], { x: .9, y: .5 });
      expect(measureElbows(pose([f180])).samples[0].right.degrees).toBeCloseTo(180);

      const f0 = frame();
      Object.assign(f0.landmarks![12], { x: .1, y: .5 });
      Object.assign(f0.landmarks![14], { x: .5, y: .5 });
      Object.assign(f0.landmarks![16], { x: .2, y: .5 });
      expect(measureElbows(pose([f0])).samples[0].right.degrees).toBeCloseTo(0);
    });
  });

  describe('coordinate validation: NaN, Infinity and outside-image bounds', () => {
    it.each([
      ['wrist y = NaN', 15, 'y', NaN, 'invalid-coordinate'],
      ['wrist y = Infinity', 15, 'y', Infinity, 'invalid-coordinate'],
      ['wrist y = -Infinity', 15, 'y', -Infinity, 'invalid-coordinate'],
      ['wrist x = -Infinity', 15, 'x', -Infinity, 'invalid-coordinate'],
      ['elbow x = NaN', 13, 'x', NaN, 'invalid-coordinate'],
      ['elbow y = Infinity', 13, 'y', Infinity, 'invalid-coordinate'],
      ['shoulder x = NaN', 11, 'x', NaN, 'invalid-coordinate'],
      ['shoulder y = -Infinity', 11, 'y', -Infinity, 'invalid-coordinate'],
      ['wrist y = -0.01 (outside)', 15, 'y', -0.01, 'outside-image'],
      ['wrist y = 1.01 (outside)', 15, 'y', 1.01, 'outside-image'],
      ['elbow x = -0.1 (outside)', 13, 'x', -0.1, 'outside-image'],
      ['shoulder x = 1.05 (outside)', 11, 'x', 1.05, 'outside-image'],
    ] as const)('abstains with %s for joint %s.%s = %s', (_, jointIdx, axis, val, expectedReason) => {
      const f = frame();
      f.landmarks![jointIdx][axis] = val;
      expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason: expectedReason });
    });
  });

  describe('missing landmarks and partial landmark arrays', () => {
    it('abstains with missing-joint if landmark array is completely empty', () => {
      const f = frame();
      f.landmarks = [];
      expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason: 'missing-joint' });
      expect(measureElbows(pose([f])).samples[0].right).toEqual({ degrees: null, reason: 'missing-joint' });
    });

    it.each([
      ['shoulder is undefined', 11],
      ['elbow is undefined', 13],
      ['wrist is undefined', 15],
    ])('abstains with missing-joint when %s', (_, jointIndex) => {
      const f = frame();
      delete (f.landmarks as unknown as Record<number, unknown>)[jointIndex];
      expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason: 'missing-joint' });
      expect(measureElbows(pose([f])).samples[0].right.degrees).toBeCloseTo(90);
    });

    it('abstains on right side only when right wrist (16) is missing', () => {
      const f = frame();
      f.landmarks = f.landmarks!.slice(0, 16);
      const sample = measureElbows(pose([f])).samples[0];
      expect(sample.left.degrees).toBeCloseTo(90);
      expect(sample.right).toEqual({ degrees: null, reason: 'missing-joint' });
    });
  });

  describe('visibility edge cases and exact threshold cutoffs', () => {
    it('accepts landmark with visibility exactly equal to the default cutoff 0.5', () => {
      const f = frame();
      f.landmarks![13].visibility = 0.5;
      expect(measureElbows(pose([f])).samples[0].left.degrees).toBeCloseTo(90);
    });

    it('rejects landmark with visibility just below cutoff (0.499999)', () => {
      const f = frame();
      f.landmarks![13].visibility = 0.499999;
      expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason: 'low-visibility' });
    });

    it('allows cutoff = 0 and admits visibility = 0', () => {
      const f = frame();
      f.landmarks![11].visibility = 0;
      f.landmarks![13].visibility = 0;
      f.landmarks![15].visibility = 0;
      expect(measureElbows(pose([f]), 0).samples[0].left.degrees).toBeCloseTo(90);
    });

    it('enforces cutoff = 1 requiring perfect visibility = 1.0', () => {
      const f = frame();
      f.landmarks![13].visibility = 0.9999;
      expect(measureElbows(pose([f]), 1).samples[0].left).toEqual({ degrees: null, reason: 'low-visibility' });

      f.landmarks![13].visibility = 1.0;
      expect(measureElbows(pose([f]), 1).samples[0].left.degrees).toBeCloseTo(90);
    });

    it.each([11, 13, 15])('reports low-visibility when only joint %i is below cutoff', (jointIdx) => {
      const f = frame();
      f.landmarks![jointIdx].visibility = 0.3;
      expect(measureElbows(pose([f])).samples[0].left).toEqual({ degrees: null, reason: 'low-visibility' });
    });
  });

  describe('single-sample series behavior', () => {
    it('produces exactly one sample and queries nearest/adjacent samples correctly', () => {
      const p = pose([frame(0.2, 5)]);
      const s = measureElbows(p);
      expect(s.samples).toHaveLength(1);
      expect(s.samples[0]).toMatchObject({ frameIndex: 5, time: 0.2 });

      expect(nearestElbowSample(s, 0.2)?.frameIndex).toBe(5);
      expect(nearestElbowSample(s, 0.2 + 1 / 30)?.frameIndex).toBe(5);
      expect(nearestElbowSample(s, 0.2 + 1 / 30 + 0.001)).toBeNull();

      expect(adjacentElbowSample(s, 0.2, 'next')).toBeNull();
      expect(adjacentElbowSample(s, 0.2, 'previous')).toBeNull();

      expect(elbowSegments(s, 'left')).toEqual([[{ time: 0.2, degrees: 90 }]]);
    });

    it('returns empty segments for a single unavailable sample', () => {
      const f = frame(0.1, 0);
      f.landmarks = null;
      const s = measureElbows(pose([f]));
      expect(elbowSegments(s, 'left')).toEqual([]);
      expect(nearestElbowSample(s, 0.1)?.left.reason).toBe('no-pose');
    });
  });

  describe('all-missing clip behavior', () => {
    it('handles series where every frame has missing pose across entire clip', () => {
      const frames = [frame(0, 0), frame(0.1, 1), frame(0.2, 2)];
      for (const f of frames) f.landmarks = null;
      const s = measureElbows(pose(frames));

      expect(s.samples).toHaveLength(3);
      for (const sample of s.samples) {
        expect(sample.left).toEqual({ degrees: null, reason: 'no-pose' });
        expect(sample.right).toEqual({ degrees: null, reason: 'no-pose' });
      }

      expect(elbowSegments(s, 'left')).toEqual([]);
      expect(elbowSegments(s, 'right')).toEqual([]);
      expect(adjacentElbowSample(s, 0, 'next')).toBeNull();
      expect(adjacentElbowSample(s, 0.2, 'previous')).toBeNull();
      expect(nearestElbowSample(s, 0.1)?.frameIndex).toBe(1);
    });

    it('handles series where left side is completely obscured but right is measurable', () => {
      const frames = [frame(0, 0), frame(1 / 30, 1), frame(2 / 30, 2)];
      for (const f of frames) f.landmarks![13].visibility = 0.1;
      const s = measureElbows(pose(frames));

      expect(elbowSegments(s, 'left')).toEqual([]);
      expect(elbowSegments(s, 'right')).toHaveLength(1);
      expect(elbowSegments(s, 'right')[0]).toHaveLength(3);
    });
  });
});
