import { beforeEach, describe, expect, it } from "vitest";
import type { PoseFrame } from "@/types";
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
});
