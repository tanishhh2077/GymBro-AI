import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginListenerHandle } from "@capacitor/core";
import type { PoseResult } from "@/types";
import { createSessionStore, type SessionEngine } from "@/store/useSessionStore";
import { connectNativeLifecycle } from "./nativeLifecycle";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const emptyResult: PoseResult = {
  frames: [], fps: 30, duration: 1, width: 640, height: 360, delegate: "CPU",
  coverage: { totalFrames: 0, framesWithPose: 0, detectionRate: 0, meanVisibility: 0 },
};

function setup(native = true) {
  const result = deferred<PoseResult>();
  let signal: AbortSignal | undefined;
  const close = vi.fn();
  const engine: SessionEngine = {
    processVideo: (_video, options) => {
      signal = options?.signal;
      signal?.addEventListener("abort", () => result.reject(new DOMException("Cancelled", "AbortError")), { once: true });
      return result.promise;
    },
    close,
  };
  const revoke = vi.fn();
  const session = createSessionStore({
    createEngine: () => engine,
    createVideo: () => document.createElement("video"),
    createObjectURL: () => "blob:native-test",
    revokeObjectURL: revoke,
  });
  const registration = deferred<PluginListenerHandle>();
  const remove = vi.fn(async () => {});
  let listener: ((state: { isActive: boolean }) => void) | undefined;
  const app = {
    addListener: vi.fn((_event: "appStateChange", callback: (state: { isActive: boolean }) => void) => {
      listener = callback;
      return registration.promise;
    }),
  };
  const onError = vi.fn();
  const connect = () => connectNativeLifecycle({ isNative: native, app, session, document, onError });
  const start = () => session.getState().startClip(new File(["synthetic"], "bench.mp4", { type: "video/mp4" }));
  return { app, session, result, registration, remove, revoke, close, onError, connect, start,
    signal: () => signal,
    emit: (isActive: boolean) => {
      expect(listener, "native app-state callback must be registered").toBeDefined();
      listener?.({ isActive });
    },
  };
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    this.dataset.paused = "yes";
  });
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("native lifecycle ownership", () => {
  it("leaves browser sessions and playback untouched", () => {
    const f = setup(false);
    const video = document.createElement("video"); document.body.append(video);
    const dispose = f.connect(); dispose();
    expect(f.app.addListener).not.toHaveBeenCalled();
    expect(video.dataset.paused).toBeUndefined();
  });

  it("pauses videos and cancels an unfinished real store job through lease cleanup", async () => {
    const f = setup();
    const videos = [document.createElement("video"), document.createElement("video")];
    document.body.append(...videos);
    expect(f.start()).toBeNull();
    const releasePlayer = f.session.getState().retainClipMedia(f.session.getState().clips[0].id);
    const dispose = f.connect();
    f.emit(false);
    expect(videos.map(v => v.dataset.paused)).toEqual(["yes", "yes"]);
    expect(f.signal()?.aborted).toBe(true);
    expect(f.session.getState().clips).toEqual([]);
    expect(f.session.getState().processingState).toBe("cancelling");
    await settle();
    expect(f.close).toHaveBeenCalledOnce();
    expect(f.revoke).not.toHaveBeenCalled();
    releasePlayer();
    expect(f.revoke).toHaveBeenCalledExactlyOnceWith("blob:native-test");
    expect(f.session.getState().processingState).toBe("idle");
    f.registration.resolve({ remove: f.remove }); await settle(); dispose();
  });

  it("keeps completed clips and their measurements in memory", async () => {
    const f = setup(); f.start(); f.result.resolve(emptyResult); await settle();
    const clips = f.session.getState().clips;
    expect(clips[0].pose).toBe(emptyResult);
    const dispose = f.connect(); f.emit(false);
    expect(f.session.getState().clips).toBe(clips);
    expect(f.revoke).not.toHaveBeenCalled();
    f.registration.resolve({ remove: f.remove }); await settle(); dispose(); f.session.getState().reset();
  });

  it("does not cancel processing or resume playback on foreground events", async () => {
    const f = setup(); f.start();
    const video = document.createElement("video"); document.body.append(video);
    const dispose = f.connect(); f.emit(true);
    expect(f.signal()?.aborted).toBe(false);
    expect(f.session.getState().processingState).toBe("processing");
    expect(video.dataset.paused).toBeUndefined();
    f.registration.resolve({ remove: f.remove }); await settle(); dispose(); f.session.getState().reset(); await settle();
  });

  it("removes only its own listener once and ignores already queued events after disposal", async () => {
    const f = setup(); const dispose = f.connect();
    f.registration.resolve({ remove: f.remove }); await settle(); dispose(); dispose();
    const video = document.createElement("video"); document.body.append(video);
    f.emit(false);
    expect(f.remove).toHaveBeenCalledOnce();
    expect(video.dataset.paused).toBeUndefined();
  });

  it("releases a listener handle that arrives after disposal", async () => {
    const f = setup(); const dispose = f.connect(); dispose();
    f.registration.resolve({ remove: f.remove }); await settle(); dispose();
    expect(f.remove).toHaveBeenCalledOnce();
  });

  it("reports rejected registrations without an unhandled rejection", async () => {
    const f = setup(); const dispose = f.connect();
    f.registration.reject(new Error("bridge unavailable")); await settle();
    expect(f.onError).toHaveBeenCalledOnce(); dispose();
  });

  it("ignores registration rejection after its owner has gone", async () => {
    const f = setup(); const dispose = f.connect(); dispose();
    f.registration.reject(new Error("bridge unavailable")); await settle();
    expect(f.onError).not.toHaveBeenCalled();
  });

  it("handles listener-removal rejection without an unhandled rejection", async () => {
    const f = setup(); const dispose = f.connect();
    f.remove.mockRejectedValueOnce(new Error("remove failed"));
    f.registration.resolve({ remove: f.remove }); await settle(); dispose(); await settle();
    expect(f.onError).toHaveBeenCalledOnce();
  });

  it("handles a synchronous native registration failure", () => {
    const f = setup(); f.app.addListener.mockImplementationOnce(() => { throw new Error("bridge failed"); });
    const dispose = f.connect(); expect(f.onError).toHaveBeenCalledOnce(); dispose();
  });

  it("reports failure when listener handle released after disposal fails to remove", async () => {
    const f = setup();
    const dispose = f.connect();
    dispose();
    f.remove.mockRejectedValueOnce(new Error("delayed remove failed"));
    f.registration.resolve({ remove: f.remove });
    await settle();
    expect(f.remove).toHaveBeenCalledOnce();
    expect(f.onError).toHaveBeenCalledWith("Could not release the native app-state listener.");
  });

  it("falls back to console.warn when onError is omitted across registration and removal exit paths", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Registration rejection exit path
    const f1 = setup();
    const dispose1 = connectNativeLifecycle({ isNative: true, app: f1.app, session: f1.session, document });
    f1.registration.reject(new Error("no bridge"));
    await settle();
    expect(warnSpy).toHaveBeenCalledWith("Native background handling could not be connected.");
    dispose1();

    // Synchronous registration failure exit path
    const f2 = setup();
    f2.app.addListener.mockImplementationOnce(() => { throw new Error("sync failure"); });
    const dispose2 = connectNativeLifecycle({ isNative: true, app: f2.app, session: f2.session, document });
    expect(warnSpy).toHaveBeenCalledWith("Native background handling could not be connected.");
    dispose2();

    // Listener removal rejection exit path
    const f3 = setup();
    f3.remove.mockRejectedValueOnce(new Error("remove rejected"));
    const dispose3 = connectNativeLifecycle({ isNative: true, app: f3.app, session: f3.session, document });
    f3.registration.resolve({ remove: f3.remove });
    await settle();
    dispose3();
    await settle();
    expect(warnSpy).toHaveBeenCalledWith("Could not release the native app-state listener.");
  });

  it("is idempotent on multiple dispose calls without repeating handle removal", async () => {
    const f = setup();
    const dispose = f.connect();
    f.registration.resolve({ remove: f.remove });
    await settle();
    dispose();
    dispose();
    dispose();
    expect(f.remove).toHaveBeenCalledOnce();
  });

  it("pauses playing and paused videos on background transition while idle without resetting session", async () => {
    const f = setup();
    const video1 = document.createElement("video");
    const video2 = document.createElement("video");
    video2.dataset.paused = "yes";
    document.body.append(video1, video2);
    const dispose = f.connect();

    expect(f.session.getState().processingState).toBe("idle");
    f.emit(false);

    expect(video1.dataset.paused).toBe("yes");
    expect(video2.dataset.paused).toBe("yes");
    expect(f.close).not.toHaveBeenCalled();
    expect(f.session.getState().processingState).toBe("idle");

    // Returning to foreground does not auto-resume videos
    f.emit(true);
    expect(video1.dataset.paused).toBe("yes");
    expect(f.session.getState().processingState).toBe("idle");

    f.registration.resolve({ remove: f.remove });
    await settle();
    dispose();
  });

  it("handles background transitions during processing and repeated background notifications cleanly", async () => {
    const f = setup();
    const video = document.createElement("video");
    document.body.append(video);
    expect(f.start()).toBeNull();
    const dispose = f.connect();

    expect(f.session.getState().processingState).toBe("processing");

    // Background transition cancels the processing session
    f.emit(false);
    expect(video.dataset.paused).toBe("yes");
    expect(f.session.getState().processingState).toBe("cancelling");

    // Second background event while cancelling does not throw or corrupt state
    expect(() => f.emit(false)).not.toThrow();
    expect(f.session.getState().processingState).toBe("cancelling");

    await settle();
    expect(f.session.getState().processingState).toBe("idle");

    f.registration.resolve({ remove: f.remove });
    await settle();
    dispose();
  });

  it("handles background transition gracefully when document has no videos", async () => {
    const f = setup();
    expect(document.querySelectorAll("video").length).toBe(0);
    expect(f.start()).toBeNull();
    const dispose = f.connect();

    expect(f.session.getState().processingState).toBe("processing");
    f.emit(false);
    expect(f.signal()?.aborted).toBe(true);
    expect(f.session.getState().processingState).toBe("cancelling");

    await settle();
    expect(f.session.getState().processingState).toBe("idle");

    f.registration.resolve({ remove: f.remove });
    await settle();
    dispose();
  });

  it("pauses videos located in nested DOM containers on background transition", async () => {
    const f = setup();
    const container = document.createElement("div");
    const section = document.createElement("section");
    const nestedVideo1 = document.createElement("video");
    const nestedVideo2 = document.createElement("video");
    section.append(nestedVideo1);
    container.append(section, nestedVideo2);
    document.body.append(container);

    const dispose = f.connect();
    f.emit(false);

    expect(nestedVideo1.dataset.paused).toBe("yes");
    expect(nestedVideo2.dataset.paused).toBe("yes");

    f.registration.resolve({ remove: f.remove });
    await settle();
    dispose();
  });
});
