import { beforeEach, describe, expect, it } from "vitest";
import type { NormalizedLandmark, PoseFrame } from "@/types";
import { isDrawableLandmark, samplePose, videoContentRect } from "./poseDisplay";

describe("samplePose", () => {
  let frames: PoseFrame[];
  beforeEach(() => {
    frames = [
      { index: 0, time: 0, landmarks: [{ x: .25, y: .25, z: -.25, visibility: .8 }], worldLandmarks: null },
      { index: 1, time: .05, landmarks: [{ x: .75, y: .75, z: .25, visibility: .4 }], worldLandmarks: null },
    ];
  });

  it("returns an exact observation with its actual time and no interpolation label", () => {
    expect(samplePose(frames, .05, 30)).toEqual({
      landmarks: [{ x: .75, y: .75, z: .25, visibility: .4 }],
      sampleTime: .05, interpolated: false,
    });
  });

  it("shows no skeleton at an exact missing observation", () => {
    frames[1].landmarks = null;
    expect(samplePose(frames, .05, 30)).toBeNull();
  });

  it.each([0, 1])("does not substitute a neighboring pose when observation %s is missing", (missing) => {
    frames[missing].landmarks = null;
    expect(samplePose(frames, .025, 30)).toBeNull();
  });

  it("interpolates adjacent detected poses only for display", () => {
    const original = structuredClone(frames);
    expect(samplePose(frames, .025, 30)).toEqual({
      landmarks: [{ x: .5, y: .5, z: 0, visibility: .4 }],
      sampleTime: .025, interpolated: true,
    });
    expect(frames).toEqual(original);
  });

  it("accepts a gap at two target-sampling intervals", () => {
    frames[1].time = 2 / 30;
    expect(samplePose(frames, 1 / 30, 30)?.interpolated).toBe(true);
  });

  it("does not turn subtraction roundoff into a larger observation gap", () => {
    frames[0].time = 2.9;
    frames[1].time = 2.9 + 2 / 30;
    const pose = samplePose(frames, 2.9 + 1 / 30, 30);
    expect(pose?.interpolated).toBe(true);
    expect(pose?.landmarks[0].x).toBeCloseTo(.5, 12);
  });

  it("hides the gap just beyond two target-sampling intervals", () => {
    frames[1].time = 2 / 30 + .000001;
    expect(samplePose(frames, 1 / 30, 30)).toBeNull();
  });

  it("hides a long gap even when both ends have detected poses", () => {
    frames[1].time = .5;
    expect(samplePose(frames, .25, 30)).toBeNull();
  });

  it("uses the requested target rate rather than assuming 30fps", () => {
    expect(samplePose(frames, .025, 60)).toBeNull();
  });

  it.each([undefined, NaN, Infinity, 1.2])("preserves unknown or invalid interpolation visibility %s", (visibility) => {
    frames[0].landmarks![0].visibility = visibility;
    const pose = samplePose(frames, .025, 30);
    expect(pose?.interpolated).toBe(true);
    expect(pose?.landmarks[0].visibility).toBeUndefined();
  });

  it("holds the first endpoint only within one sampling interval", () => {
    frames[0].time = 1;
    frames[1].time = 1.05;
    expect(samplePose(frames, 1 - 1 / 30, 30)).toMatchObject({ sampleTime: 1, interpolated: false });
    expect(samplePose(frames, 1 - 1 / 30 - .000001, 30)).toBeNull();
  });

  it("holds the last endpoint only within one sampling interval", () => {
    frames[0].time = 1;
    frames[1].time = 1.05;
    expect(samplePose(frames, 1.05 + 1 / 30, 30)).toMatchObject({ sampleTime: 1.05, interpolated: false });
    expect(samplePose(frames, 1.05 + 1 / 30 + .000001, 30)).toBeNull();
  });

  it("does not replace a missing endpoint with a more distant pose", () => {
    frames[1].landmarks = null;
    expect(samplePose(frames, .06, 30)).toBeNull();
  });

  it("does not expose stored coordinate objects to mutable display output", () => {
    const pose = samplePose(frames, 0, 30);
    expect(pose).not.toBeNull();
    pose!.landmarks[0].x = .9;
    expect(frames[0].landmarks![0].x).toBe(.25);
  });

  it("declines interpolation between different landmark layouts", () => {
    frames[1].landmarks!.push({ x: .5, y: .5, z: 0, visibility: 1 });
    expect(samplePose(frames, .025, 30)).toBeNull();
  });

  it("returns no pose for an empty observation list", () => {
    expect(samplePose([], 0, 30)).toBeNull();
  });

  it.each([0, -1, NaN, Infinity])("returns no pose for an invalid target rate %s", (fps) => {
    expect(samplePose(frames, .025, fps)).toBeNull();
  });

  it.each([-1, NaN, Infinity])("returns no pose for invalid playback time %s", (time) => {
    expect(samplePose(frames, time, 30)).toBeNull();
  });

  it("returns null when an observation has an empty landmarks array", () => {
    frames[0].landmarks = [];
    expect(samplePose(frames, 0, 30)).toBeNull();
    expect(samplePose(frames, .01, 30)).toBeNull();
  });

  it("returns null during interpolation when either frame has an empty landmarks array", () => {
    frames[0].landmarks = [];
    expect(samplePose(frames, .025, 30)).toBeNull();
    frames[0].landmarks = [{ x: .25, y: .25, z: -.25, visibility: .8 }];
    frames[1].landmarks = [];
    expect(samplePose(frames, .025, 30)).toBeNull();
  });

  it("returns null when an observation has undefined landmarks", () => {
    frames[0].landmarks = undefined as unknown as null;
    expect(samplePose(frames, 0, 30)).toBeNull();
  });

  it("samples at t=0 when first frame is at t=0", () => {
    const pose = samplePose(frames, 0, 30);
    expect(pose).toEqual({
      landmarks: [{ x: .25, y: .25, z: -.25, visibility: .8 }],
      sampleTime: 0,
      interpolated: false,
    });
  });

  it("holds first observation at t=0 when first frame is within endpoint hold", () => {
    frames[0].time = .02;
    frames[1].time = .06;
    const pose = samplePose(frames, 0, 30);
    expect(pose).toMatchObject({ sampleTime: .02, interpolated: false });
  });

  it("returns null at t=0 when first frame is beyond endpoint hold", () => {
    frames[0].time = .05;
    frames[1].time = .1;
    expect(samplePose(frames, 0, 30)).toBeNull();
  });

  it("samples t < first frame within endpoint hold and returns null beyond endpoint hold", () => {
    frames[0].time = .5;
    frames[1].time = .55;
    expect(samplePose(frames, .5 - .5 / 30, 30)).toMatchObject({ sampleTime: .5, interpolated: false });
    expect(samplePose(frames, .5 - 1.5 / 30, 30)).toBeNull();
  });

  it("samples t > last frame within endpoint hold and returns null beyond endpoint hold", () => {
    frames[0].time = 1;
    frames[1].time = 1.05;
    expect(samplePose(frames, 1.05 + .5 / 30, 30)).toMatchObject({ sampleTime: 1.05, interpolated: false });
    expect(samplePose(frames, 1.05 + 1.5 / 30, 30)).toBeNull();
  });

  it("handles a single-frame sequence at exact time, within endpoint hold, and beyond endpoint hold", () => {
    const single = [frames[0]];
    expect(samplePose(single, 0, 30)).toMatchObject({ sampleTime: 0, interpolated: false });
    expect(samplePose(single, .5 / 30, 30)).toMatchObject({ sampleTime: 0, interpolated: false });
    expect(samplePose(single, 1.5 / 30, 30)).toBeNull();
  });

  it.each([.5 / 30, 1 / 30, 1.5 / 30, 2 / 30])("interpolates short gaps where span <= 2 intervals (span = %s)", (span) => {
    frames[1].time = span;
    const pose = samplePose(frames, span / 2, 30);
    expect(pose?.interpolated).toBe(true);
  });

  it.each([2 / 30 + .0001, 3 / 30, .5, 1])("returns null and does not invent observations across long gaps (span = %s)", (span) => {
    frames[1].time = span;
    expect(samplePose(frames, span / 2, 30)).toBeNull();
  });
});

describe("isDrawableLandmark", () => {
  it.each([0, 1])("allows image-boundary coordinates %s at the visibility floor", (edge) => {
    expect(isDrawableLandmark({ x: edge, y: edge, z: 0, visibility: .3 }, .3)).toBe(true);
  });

  it.each([undefined, NaN, Infinity, -.1, .299999, 1.1])("hides unknown, invalid or low visibility %s", (visibility) => {
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility }, .3)).toBe(false);
  });

  it.each([
    { x: -.01, y: .5 }, { x: 1.01, y: .5 },
    { x: .5, y: -.01 }, { x: .5, y: 1.01 },
    { x: NaN, y: .5 }, { x: .5, y: Infinity },
  ])("hides unsupported coordinates $x, $y without clamping", (coordinates) => {
    const point = { ...coordinates, z: 0, visibility: .9 };
    expect(isDrawableLandmark(point, .3)).toBe(false);
    expect(point).toEqual({ ...coordinates, z: 0, visibility: .9 });
  });

  it("hides an absent point", () => {
    expect(isDrawableLandmark(undefined, .3)).toBe(false);
  });

  it.each([NaN, -1, 1.1])("does not draw using an invalid visibility floor %s", (floor) => {
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: .9 }, floor)).toBe(false);
  });

  it.each([0, .1, .299999])("rejects landmarks below default visibility floor 0.3 (visibility = %s)", (vis) => {
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: vis }, .3)).toBe(false);
  });

  it("evaluates boundaries against custom minVisibility thresholds", () => {
    const pt = { x: .5, y: .5, z: 0, visibility: .5 };
    expect(isDrawableLandmark(pt, .5)).toBe(true);
    expect(isDrawableLandmark(pt, .50001)).toBe(false);
    expect(isDrawableLandmark(pt, .49999)).toBe(true);
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: .7 }, .7)).toBe(true);
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: .699 }, .7)).toBe(false);
  });

  it("allows minVisibility = 0 and requires visibility to be a valid non-negative number", () => {
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: 0 }, 0)).toBe(true);
    expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: -.01 }, 0)).toBe(false);
  });

  it("returns false for undefined point or missing coordinate properties", () => {
    expect(isDrawableLandmark(undefined, .3)).toBe(false);
    expect(isDrawableLandmark({} as unknown as NormalizedLandmark, .3)).toBe(false);
    expect(isDrawableLandmark({ x: .5 } as unknown as NormalizedLandmark, .3)).toBe(false);
    expect(isDrawableLandmark({ x: .5, y: null as unknown as number, z: 0, visibility: .8 }, .3)).toBe(false);
    expect(isDrawableLandmark({ x: null as unknown as number, y: .5, z: 0, visibility: .8 }, .3)).toBe(false);
  });
});

describe("videoContentRect", () => {
  it("places landscape content inside a tall video box in CSS pixels", () => {
    expect(videoContentRect(1600, 900, 80, 140)).toEqual({ x: 0, y: 47.5, width: 80, height: 45 });
  });

  it("places portrait content inside a wide video box", () => {
    expect(videoContentRect(900, 1600, 140, 80)).toEqual({ x: 47.5, y: 0, width: 45, height: 80 });
  });

  it("uses the whole box when the aspect ratios match", () => {
    expect(videoContentRect(640, 360, 320, 180)).toEqual({ x: 0, y: 0, width: 320, height: 180 });
  });

  it("retains fractional layout dimensions rather than rounding to device pixels", () => {
    expect(videoContentRect(1280, 720, 123.5, 200)).toEqual({
      x: 0, y: 65.265625, width: 123.5, height: 69.46875,
    });
  });

  it.each([
    [0, 900, 80, 140], [1600, 0, 80, 140], [1600, 900, 0, 140], [1600, 900, 80, 0],
    [-1, 900, 80, 140], [1600, NaN, 80, 140], [1600, 900, Infinity, 140],
  ])("declines invalid source or box dimensions %s,%s,%s,%s", (sourceW, sourceH, boxW, boxH) => {
    expect(videoContentRect(sourceW, sourceH, boxW, boxH)).toBeNull();
  });

  it.each([
    [0, 100, 100, 100], [100, 0, 100, 100], [100, 100, 0, 100], [100, 100, 100, 0],
    [0, 0, 100, 100], [100, 100, 0, 0], [0, 0, 0, 0],
  ])("returns null when any dimension is zero (%s, %s, %s, %s)", (sourceW, sourceH, boxW, boxH) => {
    expect(videoContentRect(sourceW, sourceH, boxW, boxH)).toBeNull();
  });

  it.each([
    [-10, 100, 100, 100], [100, -10, 100, 100], [100, 100, -10, 100], [100, 100, 100, -10],
    [-50, -50, -50, -50],
  ])("returns null when any dimension is negative (%s, %s, %s, %s)", (sourceW, sourceH, boxW, boxH) => {
    expect(videoContentRect(sourceW, sourceH, boxW, boxH)).toBeNull();
  });

  it("returns null for non-finite or subnormal dimensions", () => {
    expect(videoContentRect(-0, 100, 100, 100)).toBeNull();
    expect(videoContentRect(100, 100, -Infinity, 100)).toBeNull();
    expect(videoContentRect(NaN, 100, 100, 100)).toBeNull();
  });
});
