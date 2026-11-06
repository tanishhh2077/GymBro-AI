import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PoseLandmarkerOptions, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type { PoseProgress, PoseResult } from "@/types";
import { PoseEngine } from "@/core/PoseEngine";
import { createSessionStore, type SessionEngine } from "./useSessionStore";

interface Detector {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult;
  close(): void;
}

const sdk = vi.hoisted(() => ({
  fileset: vi.fn<(path: string) => Promise<object>>(),
  create: vi.fn<(fileset: unknown, options: PoseLandmarkerOptions) => Promise<Detector>>(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: sdk.fileset },
  PoseLandmarker: { createFromOptions: sdk.create },
}));

// Synthetic SDK responses check orchestration only, never anatomical accuracy.
function poseResult(): PoseLandmarkerResult {
  return {
    landmarks: [Array.from({ length: 33 }, () => ({ x: .2, y: .4, z: -.1, visibility: .9 }))],
    worldLandmarks: [Array.from({ length: 33 }, () => ({ x: 1, y: 2, z: 3, visibility: .9 }))],
    segmentationMasks: undefined,
    close: () => {},
  };
}

function noPoseResult(): PoseLandmarkerResult {
  return { landmarks: [], worldLandmarks: [], segmentationMasks: undefined, close: () => {} };
}

function makeDetector() {
  return {
    detectForVideo: vi.fn<Detector["detectForVideo"]>(() => poseResult()),
    close: vi.fn<Detector["close"]>(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}

/** Controlled hidden-decoder video; seeks complete on a microtask unless stalled. */
function videoFixture(options: { duration?: number; stallSeeks?: boolean } = {}) {
  const video = document.createElement("video");
  const state = { time: 0, seeking: false };
  Object.defineProperties(video, {
    duration: { value: options.duration ?? .2 },
    videoWidth: { value: 640 },
    videoHeight: { value: 360 },
    readyState: { value: 2 },
    seeking: { get: () => state.seeking },
    pause: { value: () => {} },
    load: { value: vi.fn() },
    currentTime: {
      get: () => state.time,
      set: (time: number) => {
        state.seeking = true;
        if (options.stallSeeks) return;
        queueMicrotask(() => {
          state.time = time;
          state.seeking = false;
          video.dispatchEvent(new Event("seeked"));
          video.dispatchEvent(new Event("loadeddata"));
        });
      },
    },
  });
  return video;
}

function setup(options: {
  video?: () => HTMLVideoElement;
  engine?: () => SessionEngine;
  now?: () => number;
} = {}) {
  const videos: HTMLVideoElement[] = [];
  let urls = 0;
  const createObjectURL = vi.fn<(media: Blob) => string>(() => `blob:clip-${++urls}`);
  const revokeObjectURL = vi.fn<(url: string) => void>();
  const store = createSessionStore({
    createObjectURL,
    revokeObjectURL,
    createVideo: () => {
      const video = (options.video ?? (() => videoFixture()))();
      videos.push(video);
      return video;
    },
    ...(options.engine ? { createEngine: options.engine } : {}),
    ...(options.now ? { now: options.now } : {}),
  });
  return { store, createObjectURL, revokeObjectURL, videos };
}

function mp4(name = "bench.mp4", size = 1_000) {
  return new File([new Uint8Array(size)], name, { type: "video/mp4" });
}

const settle = () => vi.advanceTimersByTimeAsync(0);

/** A clock that returns the given readings in order; an Error reading throws. */
function clock(...readings: Array<number | Error>) {
  return vi.fn<() => number>(() => {
    const next = readings.shift();
    if (next === undefined) throw new Error("Unexpected extra clock reading");
    if (next instanceof Error) throw next;
    return next;
  });
}

describe("session store: one clip, owned job, leased media", () => {
  let detector: ReturnType<typeof makeDetector>;
  beforeEach(() => {
    vi.useFakeTimers();
    detector = makeDetector();
    sdk.fileset.mockReset().mockResolvedValue({
      wasmLoaderPath: "/wasm/vision_wasm_internal.js",
      wasmBinaryPath: "/wasm/vision_wasm_internal.wasm",
    });
    sdk.create.mockReset().mockResolvedValue(detector);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("admits one valid MP4 as the fixed bench-press side-view upload", async () => {
    const { store, createObjectURL, revokeObjectURL, videos } = setup();

    expect(store.getState().startClip(mp4())).toBeNull();
    expect(store.getState()).toMatchObject({ exercise: "bench", processingState: "processing" });
    expect(store.getState().clips).toHaveLength(1);
    expect(store.getState().clips[0]).toMatchObject({
      name: "bench.mp4", source: "upload", angle: "side", status: "processing", url: "blob:clip-1",
    });

    await settle();
    const [clip] = store.getState().clips;
    expect(clip.status).toBe("ready");
    expect(clip.pose?.frames.length).toBeGreaterThan(0);
    expect(store.getState()).toMatchObject({ processingState: "idle", engineDelegate: "GPU" });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(detector.close).toHaveBeenCalledTimes(1);
    // The hidden decoder is detached once its job ends.
    expect(videos[0].getAttribute("src")).toBeNull();
    expect(videos[0].load).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects an invalid selection before creating a URL, video, or engine", () => {
    const { store, createObjectURL, videos } = setup();

    expect(store.getState().startClip(mp4("bench.mp4", 0))).toMatchObject({ code: "empty" });
    expect(store.getState().startClip(mp4("bench.mov"))).toMatchObject({ code: "format" });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(videos).toHaveLength(0);
    expect(sdk.fileset).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({ clips: [], processingState: "idle" });
  });

  it("rejects a second clip while one is processing and while one is loaded", async () => {
    const { store, createObjectURL } = setup();
    store.getState().startClip(mp4());

    expect(store.getState().startClip(mp4("second.mp4"))).toMatchObject({ code: "busy" });
    await settle();
    expect(store.getState().clips[0].status).toBe("ready");
    expect(store.getState().startClip(mp4("second.mp4"))).toMatchObject({ code: "busy" });
    expect(store.getState().clips).toHaveLength(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("reports an over-limit video from decoded metadata before any model work", async () => {
    const { store } = setup({ video: () => videoFixture({ duration: 61 }) });
    store.getState().startClip(mp4());
    await settle();

    expect(store.getState().clips[0]).toMatchObject({ status: "error", errorKind: "validation" });
    expect(store.getState().clips[0].error).toEqual(expect.any(String));
    expect(sdk.fileset).not.toHaveBeenCalled();
    expect(store.getState().processingState).toBe("idle");
  });

  it("removing a processing clip aborts it and blocks admission until cleanup ends", async () => {
    const { store, revokeObjectURL, videos } = setup({ video: () => videoFixture({ stallSeeks: true }) });
    store.getState().startClip(mp4());
    await settle();
    const { id } = store.getState().clips[0];

    store.getState().removeClip(id);
    expect(store.getState().clips).toEqual([]);
    expect(store.getState().processingState).toBe("cancelling");
    expect(store.getState().startClip(mp4("next.mp4"))).toMatchObject({ code: "busy" });

    await settle();
    expect(store.getState().processingState).toBe("idle");
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:clip-1");
    expect(videos[0].getAttribute("src")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(store.getState().startClip(mp4("next.mp4"))).toBeNull();
  });

  it("reset aborts processing and leaves the bench workflow ready for a new clip", async () => {
    const { store, revokeObjectURL } = setup({ video: () => videoFixture({ stallSeeks: true }) });
    store.getState().startClip(mp4());
    await settle();

    store.getState().reset();
    expect(store.getState()).toMatchObject({ exercise: "bench", clips: [], processingState: "cancelling" });
    await settle();
    expect(store.getState().processingState).toBe("idle");
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(store.getState().startClip(mp4("next.mp4"))).toBeNull();
  });

  it("ignores progress and results that arrive after the clip was removed", async () => {
    const pending = deferred<PoseResult>();
    let reportProgress: ((progress: PoseProgress) => void) | undefined;
    // An engine that ignores cancellation, so its late callbacks still arrive.
    const lateEngine: SessionEngine = {
      processVideo: vi.fn((_video, options) => {
        reportProgress = options?.onProgress;
        return pending.promise;
      }),
      close: vi.fn(),
    };
    const { store, revokeObjectURL } = setup({ engine: () => lateEngine });
    store.getState().startClip(mp4());
    const { id } = store.getState().clips[0];

    store.getState().removeClip(id);
    reportProgress?.({ processedFrames: 1, estimatedTotalFrames: 6, fraction: .2, currentTime: .03, duration: .2 });
    expect(store.getState().processingState).toBe("cancelling");
    expect(revokeObjectURL).not.toHaveBeenCalled();
    pending.resolve({
      frames: [], fps: 30, duration: .2, width: 640, height: 360, delegate: "CPU",
      coverage: { totalFrames: 0, framesWithPose: 0, detectionRate: 0, meanVisibility: 0 },
    });
    await settle();

    expect(store.getState()).toMatchObject({ clips: [], engineDelegate: null, processingState: "idle" });
    expect(lateEngine.close).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("finishes cleanup when removed during model start, then disposes the late detector", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const { store, revokeObjectURL } = setup();
    store.getState().startClip(mp4());
    await settle();

    store.getState().removeClip(store.getState().clips[0].id);
    await settle();
    expect(store.getState().processingState).toBe("idle");
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    gate.resolve(detector);
    await settle();
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(detector.detectForVideo).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({ clips: [], engineDelegate: null, processingState: "idle" });
  });

  it("reports no detected pose as its own completed outcome, not an error", async () => {
    detector.detectForVideo.mockReturnValue(noPoseResult());
    const { store } = setup();
    store.getState().startClip(mp4());
    await settle();

    const [clip] = store.getState().clips;
    expect(clip.status).toBe("no-pose");
    expect(clip.pose?.coverage.framesWithPose).toBe(0);
    expect(clip.error).toBeUndefined();
    expect(clip.errorKind).toBeUndefined();
    expect(store.getState().engineDelegate).toBe("GPU");
  });

  it("reports a typed processing failure, and admits a new clip once the failed one is removed", async () => {
    detector.detectForVideo.mockImplementationOnce(() => { throw new Error("Inference failed"); });
    const { store, revokeObjectURL } = setup();
    store.getState().startClip(mp4());
    await settle();

    const [failed] = store.getState().clips;
    expect(failed).toMatchObject({ status: "error", errorKind: "detect" });
    expect(store.getState().processingState).toBe("idle");
    expect(store.getState().startClip(mp4("next.mp4"))).toMatchObject({ code: "busy" });

    store.getState().removeClip(failed.id);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(store.getState().processingState).toBe("idle");
    expect(store.getState().startClip(mp4("next.mp4"))).toBeNull();
    await settle();
    expect(store.getState().clips[0]).toMatchObject({ name: "next.mp4", status: "ready" });
    expect(store.getState().clips[0].error).toBeUndefined();
    // Each admitted clip creates its own detector rather than reusing one.
    expect(sdk.create).toHaveBeenCalledTimes(2);
  });

  it("keeps removed media until the last view lease is released", async () => {
    const { store, revokeObjectURL } = setup();
    store.getState().startClip(mp4());
    await settle();
    const { id } = store.getState().clips[0];
    const release = store.getState().retainClipMedia(id);
    expect(store.getState().engineDelegate).toBe("GPU");

    store.getState().removeClip(id);
    expect(store.getState().engineDelegate).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(store.getState().processingState).toBe("cancelling");
    expect(store.getState().startClip(mp4("next.mp4"))).toMatchObject({ code: "busy" });

    release();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(store.getState().processingState).toBe("idle");
    release();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("survives StrictMode-style retain, release, retain on a live clip", async () => {
    const { store, revokeObjectURL } = setup();
    store.getState().startClip(mp4());
    await settle();
    const { id } = store.getState().clips[0];

    store.getState().retainClipMedia(id)();
    const release = store.getState().retainClipMedia(id);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    store.getState().removeClip(id);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    release();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("records the admission-to-result time for ready and no-pose results", async () => {
    const ready = setup({ now: clock(1_000, 5_123.4) });
    ready.store.getState().startClip(mp4());
    await settle();
    expect(ready.store.getState().clips[0]).toMatchObject({ status: "ready", processingMs: 4_123.4 });

    detector.detectForVideo.mockReturnValue(noPoseResult());
    const empty = setup({ now: clock(20, 20) });
    empty.store.getState().startClip(mp4());
    await settle();
    expect(empty.store.getState().clips[0]).toMatchObject({ status: "no-pose", processingMs: 0 });
  });

  it("delivers the time in the same update as the result", async () => {
    const { store } = setup({ now: clock(10, 40) });
    const resultStates: Array<number | undefined> = [];
    const unsubscribe = store.subscribe((state) => {
      const [clip] = state.clips;
      if (clip?.pose) resultStates.push(clip.processingMs);
    });
    store.getState().startClip(mp4());
    await settle();
    unsubscribe();

    expect(resultStates.length).toBeGreaterThan(0);
    expect(resultStates.every((ms) => ms === 30)).toBe(true);
  });

  it("records no time for a failed job", async () => {
    detector.detectForVideo.mockImplementationOnce(() => { throw new Error("Inference failed"); });
    const now = clock(1_000);
    const { store } = setup({ now });
    store.getState().startClip(mp4());
    await settle();

    expect(store.getState().clips[0].status).toBe("error");
    expect(store.getState().clips[0].processingMs).toBeUndefined();
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("ignores a late result after removal and times a later clip from its own start", async () => {
    const pending = deferred<PoseResult>();
    const lateEngine: SessionEngine = { processVideo: vi.fn(() => pending.promise), close: vi.fn() };
    let engines = 0;
    const now = clock(100, 200, 250);
    const { store } = setup({
      now,
      engine: () => (engines++ === 0 ? lateEngine : new PoseEngine()),
    });
    store.getState().startClip(mp4());
    store.getState().removeClip(store.getState().clips[0].id);
    pending.resolve({
      frames: [], fps: 30, duration: .2, width: 640, height: 360, delegate: "CPU",
      coverage: { totalFrames: 0, framesWithPose: 0, detectionRate: 0, meanVisibility: 0 },
    });
    await settle();
    expect(store.getState().clips).toEqual([]);
    expect(now).toHaveBeenCalledTimes(1);

    expect(store.getState().startClip(mp4("next.mp4"))).toBeNull();
    await settle();
    expect(store.getState().clips[0]).toMatchObject({ name: "next.mp4", status: "ready", processingMs: 50 });
  });

  it.each([
    ["a non-finite start", [Number.NaN, 5]],
    ["a non-finite end", [5, Number.POSITIVE_INFINITY]],
    ["a backwards reading", [500, 499]],
    ["a throwing end reading", [5, new Error("clock unavailable")]],
  ] as const)("completes without a time after %s", async (_label, readings) => {
    const { store } = setup({ now: clock(...readings) });
    store.getState().startClip(mp4());
    await settle();

    const [clip] = store.getState().clips;
    expect(clip.status).toBe("ready");
    expect(clip).not.toHaveProperty("processingMs");
  });

  it("reads the start time before creating the engine or the URL", async () => {
    const now = clock(1, 2);
    const createEngine = vi.fn(() => new PoseEngine());
    const { store, createObjectURL } = setup({ now, engine: createEngine });
    store.getState().startClip(mp4());
    await settle();

    const startOrder = now.mock.invocationCallOrder[0];
    expect(startOrder).toBeLessThan(createEngine.mock.invocationCallOrder[0]);
    expect(startOrder).toBeLessThan(createObjectURL.mock.invocationCallOrder[0]);
  });

  it("uses the monotonic performance clock by default", async () => {
    const readings = [100, 350];
    const spy = vi.spyOn(performance, "now").mockImplementation(() => readings.shift() ?? 350);
    try {
      const { store } = setup();
      store.getState().startClip(mp4());
      await settle();
      expect(store.getState().clips[0].processingMs).toBe(250);
    } finally {
      spy.mockRestore();
    }
  });

  it("admits and releases normally when the start reading throws", async () => {
    const { store, createObjectURL, revokeObjectURL } = setup({ now: clock(new Error("clock unavailable"), 5) });
    expect(store.getState().startClip(mp4())).toBeNull();
    await settle();

    expect(store.getState().clips[0]).toMatchObject({ status: "ready" });
    expect(store.getState().clips[0]).not.toHaveProperty("processingMs");
    store.getState().removeClip(store.getState().clips[0].id);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(store.getState().processingState).toBe("idle");
  });

  it("copies a set link onto the admitted clip and keeps standalone clips unlinked", async () => {
    const { store } = setup();
    const link = { workoutId: "w1", exerciseId: "e1", setId: "s1" };
    expect(store.getState().startClip(mp4(), link)).toBeNull();
    // The clip keeps its own copy; a caller changing its object cannot relink it.
    link.setId = "changed";
    expect(store.getState().clips[0].link).toEqual({ workoutId: "w1", exerciseId: "e1", setId: "s1" });
    await settle();
    expect(store.getState().clips[0]).toMatchObject({ status: "ready", link: { setId: "s1" } });

    store.getState().removeClip(store.getState().clips[0].id);
    await settle();
    expect(store.getState().startClip(mp4())).toBeNull();
    expect(store.getState().clips[0]).not.toHaveProperty("link");
  });

  it("keeps the open clip's link on a rejected admission and drops it on reset", async () => {
    const { store } = setup();
    store.getState().startClip(mp4(), { workoutId: "w1", exerciseId: "e1", setId: "s1" });
    expect(store.getState().startClip(mp4("other.mp4"), { workoutId: "w9", exerciseId: "e9", setId: "s9" }))
      .toMatchObject({ code: "busy" });
    expect(store.getState().clips.map(clip => clip.link?.setId)).toEqual(["s1"]);

    store.getState().reset();
    await settle();
    expect(store.getState().clips).toEqual([]);
    expect(store.getState().startClip(mp4())).toBeNull();
    expect(store.getState().clips[0]).not.toHaveProperty("link");
  });

  it("detaches a link without touching the clip and offers no way to add one", async () => {
    const { store } = setup();
    store.getState().startClip(mp4(), { workoutId: "w1", exerciseId: "e1", setId: "s1" });
    await settle();
    const before = store.getState().clips[0];

    store.getState().detachLink(before.id);
    expect(store.getState().clips[0]).not.toHaveProperty("link");
    expect(store.getState().clips[0]).toMatchObject({ id: before.id, status: "ready", url: before.url });
    store.getState().detachLink(before.id);
    store.getState().detachLink("missing");
    expect(store.getState().clips[0]).not.toHaveProperty("link");
  });
});
