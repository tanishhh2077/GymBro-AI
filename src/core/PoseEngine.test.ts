import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PoseLandmarkerOptions, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { PoseEngine, PoseEngineError } from "./PoseEngine";
import { M1_LIMITS } from "./processingLimits";

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

// Synthetic SDK responses check coordination only, never anatomical accuracy.
function poseResult(): PoseLandmarkerResult {
  return {
    landmarks: [Array.from({ length: 33 }, () => ({ x: .2, y: .4, z: -.1, visibility: .9 }))],
    worldLandmarks: [Array.from({ length: 33 }, () => ({ x: 1, y: 2, z: 3, visibility: .9 }))],
    segmentationMasks: undefined,
    close: () => {},
  };
}

function makeDetector() {
  return {
    detectForVideo: vi.fn<Detector["detectForVideo"]>(() => poseResult()),
    close: vi.fn<Detector["close"]>(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function observe<T>(promise: Promise<T>) {
  let settled = false;
  const outcome = promise.then(
    value => { settled = true; return { status: "fulfilled" as const, value }; },
    (reason: unknown) => { settled = true; return { status: "rejected" as const, reason }; },
  );
  return { outcome, get settled() { return settled; } };
}

async function expectProcessingFailure(
  promise: Promise<unknown>, expected: { kind: string; stage?: string },
) {
  const outcome = await observe(promise).outcome;
  // Check status first, avoiding a dump of every synthetic pose on failure.
  expect(outcome.status).toBe("rejected");
  if (outcome.status === "rejected") expect(outcome.reason).toMatchObject(expected);
}

const engines: PoseEngine[] = [];
const mediaCleanups: Array<() => void> = [];
function engine() {
  const instance = new PoseEngine();
  engines.push(instance);
  return instance;
}

function videoFixture(options: {
  duration?: number; width?: number; height?: number;
  actualTimes?: number[]; seekDelayMs?: number; stallSeeks?: boolean;
  emitSamePosition?: boolean;
} = {}) {
  const video = document.createElement("video");
  const state = { time: 0, seeking: false, paused: false };
  const actualTimes = [...(options.actualTimes ?? [])];
  const requested: number[] = [];
  const pendingEvents = new Set<ReturnType<typeof setTimeout>>();
  let alive = true;
  Object.defineProperties(video, {
    duration: { value: options.duration ?? .2 },
    videoWidth: { value: options.width ?? 640 },
    videoHeight: { value: options.height ?? 360 },
    readyState: { value: 2 },
    seeking: { get: () => state.seeking },
    pause: { value: () => { state.paused = true; } },
    currentTime: {
      get: () => state.time,
      set: (time: number) => {
        requested.push(time);
        if (time === state.time && options.emitSamePosition === false) return;
        state.seeking = true;
        if (options.stallSeeks) return;
        const complete = () => {
          if (!alive) return;
          state.time = time === 0 ? 0 : (actualTimes.shift() ?? time);
          state.seeking = false;
          video.dispatchEvent(new Event("seeked"));
          video.dispatchEvent(new Event("loadeddata"));
        };
        if (options.seekDelayMs) {
          const timer = setTimeout(() => { pendingEvents.delete(timer); complete(); }, options.seekDelayMs);
          pendingEvents.add(timer);
        } else queueMicrotask(complete);
      },
    },
  });
  // Decoder-event timers belong to this controlled media fixture, not the engine.
  const releaseDecoderEvents = () => {
    alive = false;
    for (const timer of pendingEvents) clearTimeout(timer);
    pendingEvents.clear();
  };
  mediaCleanups.push(releaseDecoderEvents);
  return { video, state, requested, releaseDecoderEvents };
}

describe("PoseEngine coordination contract", () => {
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
    for (const instance of engines.splice(0)) instance.close();
    for (const cleanup of mediaCleanups.splice(0)) cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    { duration: 60.001, width: 640, height: 360 },
    { duration: .2, width: 1921, height: 720 },
    { duration: .2, width: 1920, height: 1081 },
    { duration: .2, width: 0, height: 360 },
    { duration: .2, width: 640, height: 0 },
  ])("rejects metadata bounds before model work: $duration s, $width x $height", async (metadata) => {
    const { video } = videoFixture(metadata);

    await expectProcessingFailure(engine().processVideo(video, { targetFps: 1 }), {
      kind: "validation", stage: "metadata",
    });
    expect(sdk.fileset).not.toHaveBeenCalled();
    expect(sdk.create).not.toHaveBeenCalled();
  });

  it.each([
    { duration: 60, width: 1920, height: 1080 },
    { duration: .2, width: 1080, height: 1920 },
  ])("accepts boundary metadata $duration s, $width x $height", async (metadata) => {
    const { video } = videoFixture(metadata);
    const result = await engine().processVideo(video, { targetFps: 1 });

    expect(result).toMatchObject(metadata);
    expect(result.frames.length).toBeGreaterThan(0);
  });

  it("does not wait for a nonexistent same-position zero seek event", async () => {
    const { video } = videoFixture({ emitSamePosition: false });
    const observed = observe(engine().processVideo(video, { targetFps: 10 }));

    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({ status: "fulfilled" });
  });

  it("shares one 60000ms budget across GPU and CPU initialization", async () => {
    const gpu = deferred<Detector>();
    const cpu = deferred<Detector>();
    sdk.create.mockImplementation((_fileset, options) =>
      options.baseOptions?.delegate === "GPU" ? gpu.promise : cpu.promise);
    const observed = observe(engine().processVideo(videoFixture().video));

    await vi.advanceTimersByTimeAsync(45_000);
    gpu.reject(new Error("GPU unavailable"));
    await vi.advanceTimersByTimeAsync(0);
    expect(sdk.create.mock.calls.map(([, options]) => options.baseOptions?.delegate)).toEqual(["GPU", "CPU"]);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "initialization" },
    });
    cpu.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("includes runtime loading in the same 60000ms initialization budget", async () => {
    const fileset = deferred<object>();
    const model = deferred<Detector>();
    sdk.fileset.mockReturnValue(fileset.promise);
    sdk.create.mockReturnValue(model.promise);
    const observed = observe(engine().processVideo(videoFixture().video));

    await vi.advanceTimersByTimeAsync(45_000);
    fileset.resolve({ wasmLoaderPath: "/wasm/loader.js", wasmBinaryPath: "/wasm/runtime.wasm" });
    await vi.advanceTimersByTimeAsync(0);
    expect(sdk.create).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "initialization" },
    });
    expect(sdk.create).toHaveBeenCalledTimes(1);
    model.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a WASM initialization wait that never finishes", async () => {
    sdk.fileset.mockReturnValue(new Promise(() => {}));
    const observed = observe(engine().processVideo(videoFixture().video));

    await vi.advanceTimersByTimeAsync(60_000);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "initialization" },
    });
    expect(sdk.create).not.toHaveBeenCalled();
  });

  it("reports CPU fallback in the successful result", async () => {
    sdk.create.mockImplementation((_fileset, options) => options.baseOptions?.delegate === "GPU"
      ? Promise.reject(new Error("No GPU")) : Promise.resolve(detector));
    const result = await engine().processVideo(videoFixture().video, { targetFps: 10 });

    expect(result.delegate).toBe("CPU");
  });

  it("reports an initialization failure when neither delegate can start", async () => {
    sdk.create.mockRejectedValue(new Error("Model cannot initialize"));

    await expect(engine().processVideo(videoFixture().video)).rejects.toMatchObject({
      kind: "init", stage: "initialization",
    });
    expect(detector.detectForVideo).not.toHaveBeenCalled();
  });

  it("aborts initialization promptly and closes a detector that arrives late", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const controller = new AbortController();
    const instance = engine();
    const observed = observe(instance.processVideo(videoFixture().video, { signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({ status: "rejected", reason: { kind: "aborted" } });
    expect(vi.getTimerCount()).toBe(0);
    gate.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(detector.detectForVideo).not.toHaveBeenCalled();
    instance.close();
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("closing during initialization cancels the job and disposes a late detector once", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const instance = engine();
    const observed = observe(instance.processVideo(videoFixture().video));
    await vi.advanceTimersByTimeAsync(0);

    instance.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({ status: "rejected", reason: { kind: "aborted" } });
    expect(vi.getTimerCount()).toBe(0);
    gate.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(detector.detectForVideo).not.toHaveBeenCalled();
    instance.close();
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("consumes a late initialization rejection without starting a fallback", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const controller = new AbortController();
    const observed = observe(engine().processVideo(videoFixture().video, { signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);

    gate.reject(new Error("Late SDK failure"));
    await vi.advanceTimersByTimeAsync(0);
    expect(await observed.outcome).toMatchObject({ status: "rejected", reason: { kind: "aborted" } });
    expect(sdk.create).toHaveBeenCalledTimes(1);
  });

  it("rejects concurrent processing on the same engine", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const instance = engine();
    const first = observe(instance.processVideo(videoFixture().video));
    const second = observe(instance.processVideo(videoFixture().video));
    await vi.advanceTimersByTimeAsync(0);

    expect(second.settled).toBe(true);
    expect(await second.outcome).toMatchObject({ status: "rejected", reason: { kind: "busy" } });
    gate.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    expect(await first.outcome).toMatchObject({ status: "fulfilled" });
  });

  it("times out a stalled seek and releases its detector", async () => {
    const observed = observe(engine().processVideo(videoFixture({ stallSeeks: true }).video));
    await vi.advanceTimersByTimeAsync(9_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "seek" },
    });
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending seek instead of waiting for its timeout", async () => {
    const controller = new AbortController();
    const observed = observe(engine().processVideo(videoFixture({ stallSeeks: true }).video, {
      signal: controller.signal,
    }));
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({ status: "rejected", reason: { kind: "aborted" } });
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds total processing even when individual seeks remain within budget", async () => {
    const fixture = videoFixture({ duration: 1.2, seekDelayMs: 9_000 });
    const observed = observe(engine().processVideo(fixture.video));
    await vi.advanceTimersByTimeAsync(299_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "processing" },
    });
    expect(detector.close).toHaveBeenCalledTimes(1);
    fixture.releaseDecoderEvents();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains only actual ordered unique sample times", async () => {
    const { video } = videoFixture({ duration: .5, actualTimes: [.12, .12, .08, .42] });
    const result = await engine().processVideo(video, { targetFps: 10 });

    expect(result.frames.map(frame => frame.time)).toEqual([0, .12, .42]);
    expect(result.frames.map(frame => frame.index)).toEqual([0, 1, 2]);
    expect(detector.detectForVideo).toHaveBeenCalledTimes(3);
  });

  it("keeps detector sequencing separate from rounded media time", async () => {
    const { video } = videoFixture({ duration: .3, actualTimes: [.0004, .00045] });
    const result = await engine().processVideo(video, { targetFps: 10 });
    const detectorTimes = detector.detectForVideo.mock.calls.map(([, time]) => time);

    expect(result.frames.map(frame => frame.time)).toEqual([0, .0004, .00045]);
    expect(detectorTimes).toHaveLength(3);
    expect(detectorTimes[1]).toBeGreaterThan(detectorTimes[0]);
    expect(detectorTimes[2]).toBeGreaterThan(detectorTimes[1]);
  });

  it.each([NaN, Infinity, -.01, .3])("rejects invalid actual media time %s before inference", async (time) => {
    const { video } = videoFixture({ actualTimes: [time] });
    const observed = observe(engine().processVideo(video, { targetFps: 10 }));
    await vi.advanceTimersByTimeAsync(0);

    expect(observed.settled).toBe(true);
    const outcome = await observed.outcome;
    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") expect(outcome.reason).toBeInstanceOf(PoseEngineError);
    expect(detector.detectForVideo).toHaveBeenCalledTimes(1);
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("snapshots coordinate objects instead of retaining mutable SDK arrays", async () => {
    const reused = poseResult();
    let calls = 0;
    detector.detectForVideo.mockImplementation(() => {
      calls++;
      reused.landmarks[0][0].x = calls === 1 ? .2 : .8;
      reused.worldLandmarks[0][0].x = calls === 1 ? 1 : 2;
      return reused;
    });
    const result = await engine().processVideo(videoFixture().video, { targetFps: 10 });

    expect(result.frames[0].landmarks?.[0].x).toBe(.2);
    expect(result.frames[1].landmarks?.[0].x).toBe(.8);
    expect(result.frames[0].worldLandmarks?.[0].x).toBe(1);
    reused.landmarks[0][0].x = .99;
    expect(result.frames[1].landmarks?.[0].x).toBe(.8);
  });

  it("keeps genuine no-pose samples null and reports descriptive coverage", async () => {
    detector.detectForVideo.mockReturnValueOnce(poseResult()).mockReturnValue({
      landmarks: [], worldLandmarks: [], segmentationMasks: undefined, close: () => {},
    });
    const result = await engine().processVideo(videoFixture().video, { targetFps: 10 });

    expect(result.frames[1].landmarks).toBeNull();
    expect(result.frames[1].worldLandmarks).toBeNull();
    expect(result.coverage).toMatchObject({ totalFrames: 2, framesWithPose: 1, detectionRate: .5 });
  });

  it("preserves unknown visibility instead of fabricating confidence", async () => {
    const response = poseResult();
    // Fault-tolerance case: runtime output can omit a field required by SDK types.
    Reflect.deleteProperty(response.landmarks[0][0], "visibility");
    Reflect.deleteProperty(response.worldLandmarks[0][0], "visibility");
    detector.detectForVideo.mockReturnValue(response);
    const result = await engine().processVideo(videoFixture().video, { targetFps: 10 });

    expect(result.frames[0].landmarks?.[0].visibility).toBeUndefined();
    expect(result.frames[0].worldLandmarks?.[0].visibility).toBeUndefined();
  });

  it("preserves finite off-image coordinates as raw observations", async () => {
    const response = poseResult();
    response.landmarks[0][0].x = -.15;
    response.landmarks[0][0].y = 1.2;
    detector.detectForVideo.mockReturnValue(response);
    const result = await engine().processVideo(videoFixture().video, { targetFps: 10 });

    expect(result.frames[0].landmarks?.[0]).toMatchObject({ x: -.15, y: 1.2 });
  });

  it.each(["normalized", "world", "missing"] as const)("rejects malformed %s coordinates explicitly", async (kind) => {
    const response = poseResult();
    if (kind === "normalized") response.landmarks[0][0].x = NaN;
    else if (kind === "world") response.worldLandmarks[0][0].z = Infinity;
    else Reflect.deleteProperty(response.landmarks[0][0], "y");
    detector.detectForVideo.mockReturnValue(response);

    await expectProcessingFailure(engine().processVideo(videoFixture().video, { targetFps: 10 }), {
      kind: "detect",
    });
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("releases the detector after a detection failure", async () => {
    detector.detectForVideo.mockImplementation(() => { throw new Error("Inference failed"); });
    const instance = engine();

    await expect(instance.processVideo(videoFixture().video)).rejects.toMatchObject({ kind: "detect" });
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    instance.close();
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("releases the detector after success and makes close idempotent", async () => {
    const instance = engine();
    await instance.processVideo(videoFixture().video, { targetFps: 10 });

    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    instance.close();
    instance.close();
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("observes cancellation after the current synchronous detection call returns", async () => {
    const controller = new AbortController();
    detector.detectForVideo.mockImplementation(() => { controller.abort(); return poseResult(); });

    await expect(engine().processVideo(videoFixture().video, {
      targetFps: 10, signal: controller.signal,
    })).rejects.toMatchObject({ kind: "aborted" });
    expect(detector.detectForVideo).toHaveBeenCalledTimes(1);
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  // Cases below were added after the Step 8 review. The behavior already
  // existed, so they guard against regressions rather than drive new code.

  it.each([
    { maxDurationSeconds: NaN },
    { maxPixels: -1 },
    { targetFps: 0 },
    { totalTimeoutMs: NaN },
    { seekTimeoutMs: 0 },
    { initializationTimeoutMs: Infinity },
    { metadataTimeoutMs: 2_147_483_648 },
  ])("rejects invalid processing limits before any work: %o", async (override) => {
    const limits = { ...M1_LIMITS, ...override };

    await expectProcessingFailure(engine().processVideo(videoFixture().video, { limits }), {
      kind: "validation",
    });
    expect(sdk.fileset).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs back-to-back jobs with a fresh detector and restarted clock", async () => {
    const events: string[] = [];
    const first = makeDetector();
    const second = makeDetector();
    first.close.mockImplementation(() => { events.push("close 1"); });
    second.close.mockImplementation(() => { events.push("close 2"); });
    const queue = [first, second];
    let created = 0;
    sdk.create.mockImplementation(async () => {
      events.push(`create ${++created}`);
      const next = queue.shift();
      if (!next) throw new Error("Unexpected detector request");
      return next;
    });
    const instance = engine();

    await instance.processVideo(videoFixture().video, { targetFps: 10 });
    await instance.processVideo(videoFixture().video, { targetFps: 10 });

    expect(events).toEqual(["create 1", "close 1", "create 2", "close 2"]);
    expect(second.detectForVideo.mock.calls.map(([, time]) => time)).toEqual([0, 100]);
  });

  it("init prepares one detector that the next job adopts and closes once", async () => {
    const instance = engine();
    await instance.init();
    await instance.init();
    expect(sdk.create).toHaveBeenCalledTimes(1);

    const result = await instance.processVideo(videoFixture().video, { targetFps: 10 });
    expect(result.frames).toHaveLength(2);
    expect(sdk.create).toHaveBeenCalledTimes(1);
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("init rejects an invalid timeout before loading anything", async () => {
    await expect(engine().init({ timeoutMs: NaN })).rejects.toMatchObject({
      kind: "validation", stage: "initialization",
    });
    expect(sdk.fileset).not.toHaveBeenCalled();
  });

  it("init is bounded by its own timeout", async () => {
    sdk.fileset.mockReturnValue(new Promise(() => {}));
    const observed = observe(engine().init({ timeoutMs: 1_000 }));
    await vi.advanceTimersByTimeAsync(999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "initialization" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a job requested while init is running", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const instance = engine();
    const warming = observe(instance.init());
    await vi.advanceTimersByTimeAsync(0);

    await expectProcessingFailure(instance.processVideo(videoFixture().video), { kind: "busy" });
    gate.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    expect(await warming.outcome).toMatchObject({ status: "fulfilled" });
  });

  it("closing during init disposes the late detector once", async () => {
    const gate = deferred<Detector>();
    sdk.create.mockReturnValue(gate.promise);
    const instance = engine();
    const warming = observe(instance.init());
    await vi.advanceTimersByTimeAsync(0);

    instance.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(await warming.outcome).toMatchObject({ status: "rejected", reason: { kind: "aborted" } });
    gate.resolve(detector);
    await vi.advanceTimersByTimeAsync(0);
    instance.close();
    expect(detector.close).toHaveBeenCalledTimes(1);
  });

  it("times out metadata that never loads without model work", async () => {
    const observed = observe(engine().processVideo(document.createElement("video")));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "metadata" },
    });
    expect(sdk.fileset).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a media error during metadata without model work", async () => {
    const video = document.createElement("video");
    const observed = observe(engine().processVideo(video));
    await vi.advanceTimersByTimeAsync(0);
    video.dispatchEvent(new Event("error"));

    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "video-load", stage: "metadata" },
    });
    expect(sdk.fileset).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports an invalid duration without model work", async () => {
    await expectProcessingFailure(engine().processVideo(videoFixture({ duration: 0 }).video), {
      kind: "no-duration", stage: "metadata",
    });
    expect(sdk.fileset).not.toHaveBeenCalled();
  });

  it("reports a runtime load that fails as an initialization failure", async () => {
    sdk.fileset.mockRejectedValue(new Error("Runtime unavailable"));

    await expectProcessingFailure(engine().processVideo(videoFixture().video), {
      kind: "init", stage: "initialization",
    });
    expect(sdk.create).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("closing during a seek cancels the job and releases its detector", async () => {
    const instance = engine();
    const observed = observe(instance.processVideo(videoFixture({ stallSeeks: true }).video));
    await vi.advanceTimersByTimeAsync(0);

    instance.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(await observed.outcome).toMatchObject({ status: "rejected", reason: { kind: "aborted" } });
    expect(detector.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("the total deadline also bounds a model start that outlasts it", async () => {
    sdk.fileset.mockReturnValue(new Promise(() => {}));
    const limits = { ...M1_LIMITS, initializationTimeoutMs: 400_000 };
    const observed = observe(engine().processVideo(videoFixture().video, { limits }));
    await vi.advanceTimersByTimeAsync(299_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "processing" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
