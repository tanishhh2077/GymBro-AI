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
  constructor(private callback: ResizeObserverCallback) { observers.add(this); }
  observe() {}
  unobserve() {}
  disconnect() { observers.delete(this); }
  notify() { this.callback([], this); }
}

function points(x = .25, visibility: number | undefined = .8): NormalizedLandmark[] {
  const result = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 0 as number | undefined }));
  result[11] = { x, y: x, z: 0, visibility };
  return result;
}

function render(frames: PoseFrame[], targetFps = 30) {
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
    <div><video ref={attach} /><SkeletonOverlay videoRef={videoRef} frames={frames} targetFps={targetFps} /></div>,
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
});
