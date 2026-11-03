import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readVideoMetadata, seekToFrame } from "./video";

// Observe either result immediately so an early failure cannot become an
// unhandled rejection while a test advances its clock or checks pending state.
function observe<T>(promise: Promise<T>) {
  let settled = false;
  const outcome = promise.then(
    (value) => { settled = true; return { status: "fulfilled" as const, value }; },
    (reason: unknown) => { settled = true; return { status: "rejected" as const, reason }; },
  );
  return { outcome, get settled() { return settled; } };
}

function loadedVideo(duration = 8, width = 640, height = 360) {
  const video = document.createElement("video");
  const state = { duration, width, height };
  Object.defineProperties(video, {
    readyState: { value: 1 },
    duration: { get: () => state.duration },
    videoWidth: { get: () => state.width },
    videoHeight: { get: () => state.height },
  });
  return { video, state };
}

function trackListenerCleanup(target: EventTarget) {
  const added = vi.spyOn(target, "addEventListener");
  const removed = vi.spyOn(target, "removeEventListener");
  return () => {
    expect(added.mock.calls.length).toBeGreaterThan(0);
    for (const [type, listener] of added.mock.calls) {
      expect(removed).toHaveBeenCalledWith(type, listener);
    }
  };
}

function seekableVideo() {
  const video = document.createElement("video");
  const state = {
    time: 0, duration: 8, readyState: 2, seeking: false,
    width: 640, height: 360, throwOnSeek: false,
  };
  const requested: number[] = [];
  Object.defineProperties(video, {
    currentTime: {
      get: () => state.time,
      set: (time: number) => {
        requested.push(time);
        if (state.throwOnSeek) throw new Error("Seek assignment failed");
        state.time = time;
        state.seeking = true;
      },
    },
    duration: { get: () => state.duration },
    readyState: { get: () => state.readyState },
    seeking: { get: () => state.seeking },
    videoWidth: { get: () => state.width },
    videoHeight: { get: () => state.height },
  });
  return { video, state, requested };
}

function durationProbeVideo() {
  const video = document.createElement("video");
  const state = {
    time: 1.25, duration: Infinity, readyState: 1, seeking: false,
    failProbe: false, failRestore: false, synchronousDuration: false,
  };
  const requested: number[] = [];
  Object.defineProperties(video, {
    currentTime: {
      get: () => state.time,
      set: (time: number) => {
        requested.push(time);
        if (state.failProbe && requested.length === 1) throw new Error("Probe failed");
        if (state.failRestore && requested.length > 1) throw new Error("Restore failed");
        state.time = time;
        state.seeking = true;
        if (state.synchronousDuration && requested.length === 1) {
          state.duration = 8;
          video.dispatchEvent(new Event("durationchange"));
        }
      },
    },
    duration: { get: () => state.duration },
    readyState: { get: () => state.readyState },
    seeking: { get: () => state.seeking },
    videoWidth: { value: 640 },
    videoHeight: { value: 360 },
  });
  return { video, state, requested };
}

describe("readVideoMetadata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns already-available metadata without waiting for another event", async () => {
    const video = document.createElement("video");
    Object.defineProperties(video, {
      readyState: { value: 1 },
      duration: { value: 12.5 },
      videoWidth: { value: 1280 },
      videoHeight: { value: 720 },
    });

    await expect(readVideoMetadata(video, { timeoutMs: 10_000 })).resolves.toEqual({
      duration: 12.5,
      width: 1280,
      height: 720,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns metadata when loading finishes and removes its video listeners", async () => {
    const video = document.createElement("video");
    const state = { readyState: 0, duration: NaN, width: 0, height: 0 };
    Object.defineProperties(video, {
      readyState: { get: () => state.readyState },
      duration: { get: () => state.duration },
      videoWidth: { get: () => state.width },
      videoHeight: { get: () => state.height },
    });
    // These spies delegate to the real EventTarget; events still run normally.
    const added = vi.spyOn(video, "addEventListener");
    const removed = vi.spyOn(video, "removeEventListener");
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(250);
    Object.assign(state, { readyState: 1, duration: 8, width: 640, height: 360 });
    video.dispatchEvent(new Event("loadedmetadata"));

    expect(await observed.outcome).toEqual({
      status: "fulfilled",
      value: { duration: 8, width: 640, height: 360 },
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(added.mock.calls.length).toBeGreaterThan(0);
    for (const [type, listener] of added.mock.calls) {
      expect(removed).toHaveBeenCalledWith(type, listener);
    }
  });

  it("rejects at the deadline when metadata never arrives", async () => {
    const video = document.createElement("video");
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(9_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind: "timeout", stage: "metadata" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops waiting when cancelled and clears its timeout", async () => {
    const video = document.createElement("video");
    const controller = new AbortController();
    const observed = observe(readVideoMetadata(video, {
      timeoutMs: 10_000,
      signal: controller.signal,
    }));

    await vi.advanceTimersByTimeAsync(100);
    expect(observed.settled).toBe(false);

    controller.abort();

    // Do not advance the clock: cancellation must not wait for the deadline.
    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind: "aborted", stage: "metadata" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("honors cancellation that happened before the wait started", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(readVideoMetadata(document.createElement("video"), {
      timeoutMs: 10_000,
      signal: controller.signal,
    })).rejects.toMatchObject({ kind: "aborted", stage: "metadata" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a media loading error without waiting for the timeout", async () => {
    const video = document.createElement("video");
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    video.dispatchEvent(new Event("error"));

    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind: "video-load", stage: "metadata" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([NaN, Infinity])("waits for unknown duration %s to become finite", async (duration) => {
    const { video, state } = loadedVideo(duration);
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(4_000);
    expect(observed.settled).toBe(false);
    state.duration = 12.75;
    video.dispatchEvent(new Event("durationchange"));

    expect(await observed.outcome).toEqual({
      status: "fulfilled",
      value: { duration: 12.75, width: 640, height: 360 },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { width: 0, height: 360 },
    { width: 640, height: 0 },
    { width: -1, height: 360 },
    { width: 640, height: NaN },
    { width: Infinity, height: 360 },
  ])("rejects invalid loaded dimensions $width x $height immediately", async ({ width, height }) => {
    const { video } = loadedVideo(8, width, height);
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind: "validation", stage: "metadata" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, -Infinity])("rejects invalid loaded duration %s immediately", async (duration) => {
    const { video } = loadedVideo(duration);
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind: "no-duration", stage: "metadata" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps one deadline despite repeated incomplete metadata events", async () => {
    const { video } = loadedVideo(Infinity);
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(4_000);
    video.dispatchEvent(new Event("loadedmetadata"));
    await vi.advanceTimersByTimeAsync(4_000);
    video.dispatchEvent(new Event("durationchange"));
    await vi.advanceTimersByTimeAsync(1_999);
    expect(observed.settled).toBe(false);
    video.dispatchEvent(new Event("durationchange"));
    await vi.advanceTimersByTimeAsync(1);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind: "timeout", stage: "metadata" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects an existing browser error even when metadata looks valid", async () => {
    const { video } = loadedVideo();
    Object.defineProperty(video, "error", {
      value: { code: 3, message: "Decoding failed" },
    });

    await expect(readVideoMetadata(video, { timeoutMs: 10_000 })).rejects.toMatchObject({
      kind: "video-load", stage: "metadata",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { cause: "abort", kind: "aborted" },
    { cause: "error", kind: "video-load" },
    { cause: "timeout", kind: "timeout" },
    { cause: "dimensions", kind: "validation" },
    { cause: "duration", kind: "no-duration" },
  ])("releases video and signal listeners after $cause failure", async ({ cause, kind }) => {
    const video = document.createElement("video");
    const controller = new AbortController();
    const assertVideoReleased = trackListenerCleanup(video);
    const assertSignalReleased = trackListenerCleanup(controller.signal);
    const observed = observe(readVideoMetadata(video, {
      timeoutMs: 10_000, signal: controller.signal,
    }));

    if (cause === "abort") controller.abort();
    else if (cause === "error") video.dispatchEvent(new Event("error"));
    else if (cause === "timeout") await vi.advanceTimersByTimeAsync(10_000);
    else {
      Object.defineProperties(video, {
        readyState: { value: 1 },
        duration: { value: cause === "duration" ? 0 : 8 },
        videoWidth: { value: cause === "dimensions" ? 0 : 640 },
        videoHeight: { value: 360 },
      });
      video.dispatchEvent(new Event("loadedmetadata"));
    }

    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected",
      reason: { kind, stage: "metadata" },
    });
    assertVideoReleased();
    assertSignalReleased();
    expect(vi.getTimerCount()).toBe(0);

    // Late notifications cannot start another wait after terminal cleanup.
    video.dispatchEvent(new Event("loadedmetadata"));
    video.dispatchEvent(new Event("durationchange"));
    controller.abort();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, NaN, Infinity, 2_147_483_648])("rejects an unusable timeout %s without allocating resources", async (timeoutMs) => {
    const video = document.createElement("video");
    const added = vi.spyOn(video, "addEventListener");

    await expect(readVideoMetadata(video, { timeoutMs })).rejects.toMatchObject({
      kind: "validation", stage: "metadata",
    });
    expect(added).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("seekToFrame", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns for an already-current drawable frame without assigning time", async () => {
    const { video, requested } = seekableVideo();

    await expect(seekToFrame(video, 0, { timeoutMs: 10_000 })).resolves.toBeUndefined();

    expect(requested).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for data at the current position without requiring another seek event", async () => {
    const { video, state, requested } = seekableVideo();
    state.readyState = 1;
    const observed = observe(seekToFrame(video, 0, { timeoutMs: 10_000 }));
    await vi.advanceTimersByTimeAsync(25);
    expect(observed.settled).toBe(false);

    state.readyState = 2;
    video.dispatchEvent(new Event("loadeddata"));

    expect(await observed.outcome).toEqual({ status: "fulfilled", value: undefined });
    expect(requested).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("requests a new position and waits for seek completion and a drawable frame", async () => {
    const { video, state, requested } = seekableVideo();
    const observed = observe(seekToFrame(video, 2, { timeoutMs: 10_000 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(requested).toEqual([2]);
    expect(observed.settled).toBe(false);

    state.seeking = false;
    state.readyState = 1;
    video.dispatchEvent(new Event("seeked"));
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(false);

    state.readyState = 2;
    video.dispatchEvent(new Event("loadeddata"));
    expect(await observed.outcome).toEqual({ status: "fulfilled", value: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not use an old ready frame before the new seek completes", async () => {
    const { video, state } = seekableVideo();
    const observed = observe(seekToFrame(video, 2, { timeoutMs: 10_000 }));
    video.dispatchEvent(new Event("loadeddata"));
    await vi.advanceTimersByTimeAsync(50);
    expect(observed.settled).toBe(false);

    state.seeking = false;
    // Browser-reported time may differ from the request; do not invent it.
    state.time = 1.999;
    video.dispatchEvent(new Event("seeked"));
    expect(await observed.outcome).toEqual({ status: "fulfilled", value: undefined });
    expect(video.currentTime).toBe(1.999);
  });

  it("waits for a seek already in progress at the requested position", async () => {
    const { video, state, requested } = seekableVideo();
    state.seeking = true;
    const observed = observe(seekToFrame(video, 0, { timeoutMs: 10_000 }));
    video.dispatchEvent(new Event("canplay"));
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(false);

    state.seeking = false;
    video.dispatchEvent(new Event("seeked"));
    expect(await observed.outcome).toEqual({ status: "fulfilled", value: undefined });
    expect(requested).toEqual([]);
  });

  it("times out rather than accepting zero-dimension frame data", async () => {
    const { video, state } = seekableVideo();
    state.width = 0;
    const observed = observe(seekToFrame(video, 0, { timeoutMs: 10_000 }));
    video.dispatchEvent(new Event("loadeddata"));
    await vi.advanceTimersByTimeAsync(9_999);
    expect(observed.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "seek" },
    });
  });

  it("honors cancellation before requesting any seek", async () => {
    const { video, requested } = seekableVideo();
    const controller = new AbortController();
    controller.abort();

    await expect(seekToFrame(video, 2, {
      timeoutMs: 10_000, signal: controller.signal,
    })).rejects.toMatchObject({ kind: "aborted", stage: "seek" });
    expect(requested).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { cause: "abort", kind: "aborted" },
    { cause: "error", kind: "video-load" },
    { cause: "timeout", kind: "timeout" },
    { cause: "setter", kind: "video-load" },
  ])("cleans up a new seek after $cause failure, ignoring late events", async ({ cause, kind }) => {
    const { video, state } = seekableVideo();
    const controller = new AbortController();
    const assertVideoReleased = trackListenerCleanup(video);
    const assertSignalReleased = trackListenerCleanup(controller.signal);
    state.throwOnSeek = cause === "setter";
    const observed = observe(seekToFrame(video, 2, {
      timeoutMs: 10_000, signal: controller.signal,
    }));

    if (cause === "abort") controller.abort();
    else if (cause === "error") video.dispatchEvent(new Event("error"));
    else if (cause === "timeout") {
      await vi.advanceTimersByTimeAsync(9_999);
      video.dispatchEvent(new Event("loadeddata"));
      expect(observed.settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind, stage: "seek" },
    });
    assertVideoReleased();
    assertSignalReleased();
    expect(vi.getTimerCount()).toBe(0);

    state.seeking = false;
    video.dispatchEvent(new Event("seeked"));
    video.dispatchEvent(new Event("loadeddata"));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases video and signal listeners after successful seeking", async () => {
    const { video, state } = seekableVideo();
    const controller = new AbortController();
    const assertVideoReleased = trackListenerCleanup(video);
    const assertSignalReleased = trackListenerCleanup(controller.signal);
    const observed = observe(seekToFrame(video, 2, {
      timeoutMs: 10_000, signal: controller.signal,
    }));

    state.seeking = false;
    video.dispatchEvent(new Event("seeked"));
    expect(await observed.outcome).toEqual({ status: "fulfilled", value: undefined });
    assertVideoReleased();
    assertSignalReleased();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects an existing media error without seeking", async () => {
    const { video, requested } = seekableVideo();
    Object.defineProperty(video, "error", { value: { code: 3, message: "Decode failure" } });

    await expect(seekToFrame(video, 2, { timeoutMs: 10_000 })).rejects.toMatchObject({
      kind: "video-load", stage: "seek",
    });
    expect(requested).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([-1, NaN, Infinity, 9])("rejects an invalid requested time %s without seeking", async (time) => {
    const { video, requested } = seekableVideo();

    await expect(seekToFrame(video, time, { timeoutMs: 10_000 })).rejects.toMatchObject({
      kind: "validation", stage: "seek",
    });
    expect(requested).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, Infinity, 2_147_483_648])("rejects an invalid seek timeout %s", async (timeoutMs) => {
    const { video, requested } = seekableVideo();

    await expect(seekToFrame(video, 2, { timeoutMs })).rejects.toMatchObject({
      kind: "validation", stage: "seek",
    });
    expect(requested).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("unknown-duration probing", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not move a video whose duration is already known", async () => {
    const { video, requested } = seekableVideo();
    await expect(readVideoMetadata(video, { timeoutMs: 10_000 })).resolves.toEqual({
      duration: 8, width: 640, height: 360,
    });
    expect(requested).toEqual([]);
  });

  it("probes unknown duration once and waits for original-position restoration", async () => {
    const { video, state, requested } = durationProbeVideo();
    const controller = new AbortController();
    const assertVideoReleased = trackListenerCleanup(video);
    const assertSignalReleased = trackListenerCleanup(controller.signal);
    const observed = observe(readVideoMetadata(video, {
      timeoutMs: 10_000, signal: controller.signal,
    }));

    expect(requested).toHaveLength(1);
    expect(requested[0]).toBeGreaterThan(8);
    video.dispatchEvent(new Event("durationchange"));
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(requested).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(2_000);
    state.duration = 8;
    state.time = 8;
    state.seeking = false;
    video.dispatchEvent(new Event("durationchange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(requested).toHaveLength(2);
    expect(requested[1]).toBe(1.25);
    expect(observed.settled).toBe(false);

    state.seeking = false;
    video.dispatchEvent(new Event("seeked"));
    expect(await observed.outcome).toEqual({
      status: "fulfilled", value: { duration: 8, width: 640, height: 360 },
    });
    expect(video.currentTime).toBe(1.25);
    expect(video.readyState).toBe(1); // Metadata recovery does not require frame data.
    expect(vi.getTimerCount()).toBe(0);
    assertVideoReleased();
    assertSignalReleased();
  });

  it.each(["probe", "restore"] as const)("keeps the original deadline while stalled during %s", async (phase) => {
    const { video, state, requested } = durationProbeVideo();
    state.readyState = 0;
    const assertReleased = trackListenerCleanup(video);
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));
    expect(requested).toEqual([]);

    await vi.advanceTimersByTimeAsync(9_000);
    state.readyState = 1;
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(requested).toHaveLength(1);
    if (phase === "restore") {
      state.duration = 8;
      state.time = 8;
      state.seeking = false;
      video.dispatchEvent(new Event("durationchange"));
      expect(requested[1]).toBe(1.25);
    }
    await vi.advanceTimersByTimeAsync(999);
    expect(observed.settled).toBe(false);
    video.dispatchEvent(new Event("durationchange"));
    await vi.advanceTimersByTimeAsync(1);

    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "timeout", stage: "metadata" },
    });
    expect(requested).toHaveLength(2);
    expect(requested[1]).toBe(1.25);
    assertReleased();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["probe", "restore"] as const)("cancels during %s without another cleanup wait", async (phase) => {
    const { video, state, requested } = durationProbeVideo();
    const controller = new AbortController();
    const assertVideoReleased = trackListenerCleanup(video);
    const assertSignalReleased = trackListenerCleanup(controller.signal);
    const observed = observe(readVideoMetadata(video, {
      timeoutMs: 10_000, signal: controller.signal,
    }));
    expect(requested).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(200);
    if (phase === "restore") {
      state.duration = 8;
      state.time = 8;
      state.seeking = false;
      video.dispatchEvent(new Event("durationchange"));
    }

    controller.abort();
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "aborted", stage: "metadata" },
    });
    expect(requested).toHaveLength(2);
    expect(requested[1]).toBe(1.25);
    assertVideoReleased();
    assertSignalReleased();
    expect(vi.getTimerCount()).toBe(0);

    state.duration = 8;
    state.seeking = false;
    video.dispatchEvent(new Event("durationchange"));
    video.dispatchEvent(new Event("seeked"));
    expect(requested).toHaveLength(2);
  });

  it.each(["error", "probe-setter", "restore-setter"] as const)("fails cleanly after %s", async (cause) => {
    const { video, state, requested } = durationProbeVideo();
    state.failProbe = cause === "probe-setter";
    state.failRestore = cause === "restore-setter";
    const assertReleased = trackListenerCleanup(video);
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));
    expect(requested).toHaveLength(cause === "probe-setter" ? 2 : 1);

    if (cause === "error") video.dispatchEvent(new Event("error"));
    else if (cause === "restore-setter") {
      state.duration = 8;
      state.time = 8;
      state.seeking = false;
      video.dispatchEvent(new Event("durationchange"));
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(true);
    expect(await observed.outcome).toMatchObject({
      status: "rejected", reason: { kind: "video-load", stage: "metadata" },
    });
    expect(requested[1]).toBe(1.25);
    assertReleased();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles duration notifications emitted synchronously by a seek request", async () => {
    const { video, state, requested } = durationProbeVideo();
    state.synchronousDuration = true;
    const observed = observe(readVideoMetadata(video, { timeoutMs: 10_000 }));
    expect(requested).toHaveLength(2);
    expect(requested[1]).toBe(1.25);
    await vi.advanceTimersByTimeAsync(0);
    expect(observed.settled).toBe(false);

    state.seeking = false;
    video.dispatchEvent(new Event("seeked"));
    expect(await observed.outcome).toEqual({
      status: "fulfilled", value: { duration: 8, width: 640, height: 360 },
    });
  });
});
