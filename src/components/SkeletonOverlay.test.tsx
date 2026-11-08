import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedLandmark, PoseFrame } from "@/types";
import { SkeletonOverlay } from "./SkeletonOverlay";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ctx = {
  setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
};
let container: HTMLDivElement;
let root: Root;
let video: HTMLVideoElement;
let videoRef: { current: HTMLVideoElement | null };
let videoBox: DOMRect;
let parentBox: DOMRect;
let media: { time: number; sourceW: number; sourceH: number; paused: boolean; seeking: boolean; ready: number };
let callbacks: Map<number, FrameRequestCallback>;
let nextFrame: number;
const observers = new Set<ControlledResizeObserver>();

class ControlledResizeObserver implements ResizeObserver {
  observedElements = new Set<Element>();
  constructor(private callback: ResizeObserverCallback) { observers.add(this); }
  observe(target: Element) { this.observedElements.add(target); }
  unobserve(target: Element) { this.observedElements.delete(target); }
  disconnect() { observers.delete(this); this.observedElements.clear(); }
  notify() { this.callback([], this); }
}

function points(x = .25, visibility: number | undefined = .8): NormalizedLandmark[] {
  const result = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 0 as number | undefined }));
  result[11] = { x, y: x, z: 0, visibility };
  return result;
}

function render(
  frames: PoseFrame[],
  targetFps = 30,
  props: { minVisibility?: number; color?: string; className?: string } = {},
) {
  const attach = (element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (!element) return;
    video = element;
    Object.defineProperties(element, {
      currentTime: { configurable: true, get: () => media.time },
      videoWidth: { configurable: true, get: () => media.sourceW },
      videoHeight: { configurable: true, get: () => media.sourceH },
      paused: { configurable: true, get: () => media.paused },
      seeking: { configurable: true, get: () => media.seeking },
      readyState: { configurable: true, get: () => media.ready },
    });
  };
  act(() => root.render(
    <div><video ref={attach} /><SkeletonOverlay videoRef={videoRef} frames={frames} targetFps={targetFps} {...props} /></div>,
  ));
}

function paint() {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(0);
  });
}

function notify(type: string) { act(() => { video.dispatchEvent(new Event(type)); }); }
const pose = (time = 0, x = .25): PoseFrame => ({ index: 0, time, landmarks: points(x), worldLandmarks: null });

beforeEach(() => {
  vi.clearAllMocks();
  callbacks = new Map();
  nextFrame = 0;
  videoRef = { current: null };
  media = { time: 0, sourceW: 1600, sourceH: 900, paused: true, seeking: false, ready: 2 };
  videoBox = new DOMRect(20, 50, 80, 140);
  parentBox = new DOMRect(10, 20, 80, 220);
  vi.stubGlobal("devicePixelRatio", 1);
  vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(++nextFrame, callback); return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { callbacks.delete(id); });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this instanceof HTMLVideoElement ? videoBox : parentBox;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(80);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(220);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  callbacks.clear();
  observers.clear();
});

describe("SkeletonOverlay", () => {
  it("projects into actual video content and applies DPR exactly once", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    render([pose()]);
    paint();
    const canvas = container.querySelector("canvas")!;
    expect(ctx.arc).toHaveBeenCalledWith(20, 58.75, 4.5, 0, Math.PI * 2);
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect([canvas.width, canvas.height]).toEqual([160, 280]);
    expect([canvas.style.left, canvas.style.top]).toEqual(["10px", "30px"]);
  });

  it("redraws at a paused seek without waiting for an animation frame", () => {
    render([pose(), { ...pose(.05, .75), index: 1 }]);
    paint();
    ctx.arc.mockClear();
    media.time = .05;
    notify("seeked");
    expect(ctx.arc).toHaveBeenCalledWith(60, 81.25, 4.5, 0, Math.PI * 2);
  });

  it("clears an exact missing observation instead of carrying a neighbor", () => {
    render([pose(), { index: 1, time: .05, landmarks: null, worldLandmarks: null }, { ...pose(.1), index: 2 }]);
    paint();
    expect(ctx.arc).toHaveBeenCalled();
    ctx.arc.mockClear();
    ctx.clearRect.mockClear();
    media.time = .05;
    notify("seeked");
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("clears long detection gaps and a reset to an empty result", () => {
    render([pose(), { ...pose(.2, .75), index: 1 }]);
    paint();
    expect(ctx.arc).toHaveBeenCalled();
    ctx.arc.mockClear();
    media.time = .1;
    notify("seeked");
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
    ctx.clearRect.mockClear();
    render([]);
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("hides missing visibility and does not draw an unsupported edge", () => {
    const missing = pose();
    missing.landmarks![11].visibility = undefined;
    render([missing]);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();

    const offImage = pose();
    offImage.landmarks![11].x = 1.1;
    offImage.landmarks![13] = { x: .5, y: .5, z: 0, visibility: .8 };
    ctx.moveTo.mockClear();
    render([offImage]);
    paint();
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledWith(40, 70, 4.5, 0, Math.PI * 2);
    expect(offImage.landmarks![11].x).toBe(1.1);
  });

  it.each(["seeking", "not-ready"])("clears stale drawing while %s", (reason) => {
    render([pose()]);
    paint();
    expect(ctx.arc).toHaveBeenCalled();
    ctx.arc.mockClear();
    ctx.clearRect.mockClear();
    if (reason === "seeking") media.seeking = true;
    else media.ready = 1;
    notify(reason === "seeking" ? "seeking" : "loadeddata");
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("uses the result's target sampling rate", () => {
    media.time = .025;
    render([pose(), { ...pose(.05, .75), index: 1 }], 60);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("reprojects after source/box resize in portrait layout", () => {
    render([pose()]);
    paint();
    ctx.arc.mockClear();
    media.sourceW = 900;
    media.sourceH = 1600;
    videoBox = new DOMRect(50, 60, 140, 80);
    act(() => { for (const observer of observers) observer.notify(); });
    expect(ctx.arc).toHaveBeenCalledWith(58.75, 20, 4.5, 0, Math.PI * 2);
    expect(container.querySelector("canvas")!.style.left).toBe("40px");
  });

  it("animates only while playing and releases frame, observer, and event ownership", () => {
    render([pose()]);
    expect(callbacks.size).toBe(0);
    const added = vi.spyOn(video, "addEventListener");
    const removed = vi.spyOn(video, "removeEventListener");
    // Remount the effect with a new observations identity to capture its listeners.
    render([pose()]);
    media.paused = false;
    notify("play");
    expect(callbacks.size).toBe(1);
    paint();
    expect(callbacks.size).toBe(1);
    media.paused = true;
    notify("pause");
    expect(callbacks.size).toBe(0);
    act(() => root.render(null));
    expect(observers.size).toBe(0);
    for (const [type, listener] of added.mock.calls) expect(removed).toHaveBeenCalledWith(type, listener);
  });

  it("skips undefined points in landmarks array and draws remaining valid joints/bones", () => {
    const p = points();
    (p as (NormalizedLandmark | undefined)[])[11] = undefined;
    p[12] = { x: .5, y: .5, z: 0, visibility: .8 };
    render([{ index: 0, time: 0, landmarks: p, worldLandmarks: null }]);
    paint();
    expect(ctx.arc).toHaveBeenCalledWith(40, 70, 4.5, 0, Math.PI * 2);
  });

  it("clears canvas and does not draw when frame landmarks array is empty", () => {
    render([{ index: 0, time: 0, landmarks: [], worldLandmarks: null }]);
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("gracefully handles landmarks array with fewer than 33 elements without error", () => {
    const shortLandmarks = [
      { x: .5, y: .5, z: 0, visibility: .9 },
      { x: .6, y: .6, z: 0, visibility: .9 },
    ];
    render([{ index: 0, time: 0, landmarks: shortLandmarks, worldLandmarks: null }]);
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("clears and does not draw when frame landmarks is null", () => {
    render([{ index: 0, time: 0, landmarks: null, worldLandmarks: null }]);
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws bone when both connected landmarks are visible, and skips bone when one is low visibility", () => {
    const p = points();
    p[11] = { x: .25, y: .25, z: 0, visibility: .8 };
    p[12] = { x: .75, y: .75, z: 0, visibility: .8 };
    render([{ index: 0, time: 0, landmarks: p, worldLandmarks: null }]);
    paint();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();

    ctx.moveTo.mockClear();
    ctx.lineTo.mockClear();
    p[12].visibility = .2;
    render([{ index: 0, time: 0, landmarks: p, worldLandmarks: null }]);
    paint();
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });

  it("does not draw joints or bones when landmark visibility is below default 0.3 floor", () => {
    const p = points(.25, .29);
    render([{ index: 0, time: 0, landmarks: p, worldLandmarks: null }]);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("filters joints by custom minVisibility prop", () => {
    const p = points(.25, .55);
    render([{ index: 0, time: 0, landmarks: p, worldLandmarks: null }], 30, { minVisibility: 0.6 });
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();

    ctx.arc.mockClear();
    render([{ index: 0, time: 0, landmarks: p, worldLandmarks: null }], 30, { minVisibility: 0.5 });
    paint();
    expect(ctx.arc).toHaveBeenCalledWith(20, 58.75, 4.5, 0, Math.PI * 2);
  });

  it("does not draw when video bounding rect width or height is zero or negative", () => {
    videoBox = new DOMRect(20, 50, 0, 140);
    render([pose()]);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
    const canvas = container.querySelector("canvas")!;
    expect(canvas.width).toBe(0);

    videoBox = new DOMRect(20, 50, -80, -140);
    render([pose()]);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("does not draw when video source width or height is zero or negative", () => {
    media.sourceW = 0;
    media.sourceH = 900;
    render([pose()]);
    paint();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();

    ctx.arc.mockClear();
    media.sourceW = 1600;
    media.sourceH = -900;
    render([pose()]);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("observes the video element with ResizeObserver and triggers redraw on observer notification", () => {
    render([pose()]);
    paint();
    expect(observers.size).toBe(1);
    const observer = [...observers][0];
    expect(observer.observedElements.has(video)).toBe(true);

    ctx.arc.mockClear();
    videoBox = new DOMRect(20, 50, 160, 280);
    act(() => { observer.notify(); });
    const canvas = container.querySelector("canvas")!;
    expect(canvas.style.width).toBe("160px");
    expect(canvas.style.height).toBe("280px");
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("triggers redraw when window resize event fires", () => {
    render([pose()]);
    paint();
    ctx.arc.mockClear();

    videoBox = new DOMRect(10, 10, 100, 200);
    act(() => { window.dispatchEvent(new Event("resize")); });
    const canvas = container.querySelector("canvas")!;
    expect(canvas.style.width).toBe("100px");
    expect(canvas.style.height).toBe("200px");
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("triggers redraw when window orientationchange event fires", () => {
    render([pose()]);
    paint();
    ctx.arc.mockClear();

    act(() => { window.dispatchEvent(new Event("orientationchange")); });
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("draws pose at t=0 when first frame is at t=0", () => {
    media.time = 0;
    render([pose(0, .25)]);
    paint();
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("holds first frame at t=0 when first frame is within endpoint hold", () => {
    media.time = 0;
    render([pose(.02, .25)]);
    paint();
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("does not draw at t=0 when first frame is beyond endpoint hold", () => {
    media.time = 0;
    render([pose(.05, .25)]);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws when t is before first frame within endpoint hold, and hides when beyond", () => {
    const frames = [pose(1, .25), pose(1.05, .75)];
    media.time = .98;
    render(frames);
    paint();
    expect(ctx.arc).toHaveBeenCalled();

    ctx.arc.mockClear();
    media.time = .95;
    notify("seeked");
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws when t is after last frame within endpoint hold, and hides when beyond", () => {
    const frames = [pose(1, .25), pose(1.05, .75)];
    media.time = 1.07;
    render(frames);
    paint();
    expect(ctx.arc).toHaveBeenCalled();

    ctx.arc.mockClear();
    media.time = 1.12;
    notify("seeked");
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("interpolates across short gaps (span <= 2 intervals) and hides skeleton across long gaps (span > 2 intervals)", () => {
    const shortGap = [pose(0, .25), { ...pose(2 / 30, .75), index: 1 }];
    media.time = 1 / 30;
    render(shortGap, 30);
    paint();
    expect(ctx.arc).toHaveBeenCalled();

    ctx.arc.mockClear();
    const longGap = [pose(0, .25), { ...pose(.1, .75), index: 1 }];
    media.time = .05;
    render(longGap, 30);
    paint();
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});
