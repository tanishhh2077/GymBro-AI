import { PoseEngineError } from "./processingErrors";

export interface VideoMetadata {
  /** Media duration in seconds. */
  duration: number;
  /** Decoded dimensions in pixels. */
  width: number;
  height: number;
}

export interface MediaWaitOptions {
  signal?: AbortSignal;
  timeoutMs: number;
}

/**
 * Seek an owned video to media time in seconds and wait for drawable data.
 * The browser's resulting currentTime remains authoritative, including rounding.
 */
export function seekToFrame(
  video: HTMLVideoElement,
  time: number,
  { signal, timeoutMs }: MediaWaitOptions,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PoseEngineError("Video seeking was cancelled.", "aborted", "seek"));
      return;
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
      reject(new PoseEngineError("Invalid seek timeout.", "validation", "seek"));
      return;
    }
    if (!Number.isFinite(time) || time < 0 ||
        (Number.isFinite(video.duration) && time > video.duration)) {
      reject(new PoseEngineError("Requested video time is outside its duration.", "validation", "seek"));
      return;
    }

    const samePosition = video.currentTime === time;
    let seekCompleted = samePosition && !video.seeking;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("canplay", check);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const fail = (error: PoseEngineError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => fail(new PoseEngineError(
      "Video seeking was cancelled.", "aborted", "seek",
    ));
    const onError = () => fail(new PoseEngineError(
      "The browser could not load the requested video frame.", "video-load", "seek",
    ));
    const check = () => {
      if (settled) return;
      if (signal?.aborted) { onAbort(); return; }
      if (video.error) { onError(); return; }
      if (!seekCompleted || video.seeking || video.readyState < 2 ||
          !Number.isFinite(video.videoWidth) || video.videoWidth <= 0 ||
          !Number.isFinite(video.videoHeight) || video.videoHeight <= 0) return;

      settled = true;
      cleanup();
      resolve();
    };
    const onSeeked = () => {
      seekCompleted = true;
      check();
    };

    const timer = setTimeout(() => fail(new PoseEngineError(
      "The requested video frame did not become ready within the time limit.", "timeout", "seek",
    )), timeoutMs);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", check);
    video.addEventListener("canplay", check);
    video.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);

    check();
    if (settled || samePosition) return;
    try {
      video.currentTime = time;
    } catch {
      fail(new PoseEngineError("The browser could not seek this video.", "video-load", "seek"));
      return;
    }
    check();
  });
}

/**
 * Read an owned video's metadata within one deadline, temporarily seeking if
 * duration is unknown. Success waits for restoration to finish, not frame data.
 * Failure requests restoration best-effort without delaying abort or timeout;
 * the caller remains responsible for releasing the underlying video.
 */
export function readVideoMetadata(
  video: HTMLVideoElement,
  { signal, timeoutMs }: MediaWaitOptions,
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PoseEngineError("Video metadata loading was cancelled.", "aborted", "metadata"));
      return;
    }
    // Browser timers cannot represent delays beyond a signed 32-bit integer.
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
      reject(new PoseEngineError("Invalid metadata timeout.", "validation", "metadata"));
      return;
    }

    let settled = false;
    let probeStarted = false;
    let restorationRequested = false;
    let originalTime: number | undefined;

    const requestRestoration = () => {
      if (!probeStarted || restorationRequested || originalTime === undefined) return;
      restorationRequested = true;
      video.currentTime = originalTime;
    };

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("durationchange", check);
      video.removeEventListener("seeked", check);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    const fail = (error: PoseEngineError) => {
      if (settled) return;
      settled = true;
      cleanup();
      try { requestRestoration(); } catch { /* Preserve the primary failure. */ }
      reject(error);
    };

    const onAbort = () => fail(new PoseEngineError(
      "Video metadata loading was cancelled.", "aborted", "metadata",
    ));
    const onError = () => fail(new PoseEngineError(
      "The browser could not load this video.", "video-load", "metadata",
    ));

    const check = () => {
      if (settled) return;
      if (signal?.aborted) { onAbort(); return; }
      if (video.error) { onError(); return; }
      if (video.readyState < 1) return;

      const { duration, videoWidth: width, videoHeight: height } = video;
      if (!Number.isFinite(width) || width <= 0 ||
          !Number.isFinite(height) || height <= 0) {
        fail(new PoseEngineError(
          "The video has invalid decoded dimensions.", "validation", "metadata",
        ));
        return;
      }
      // A single far-end request can make the browser discover finite duration.
      // The requested position is never used as duration or an observation.
      if (Number.isNaN(duration) || duration === Infinity) {
        if (!probeStarted) {
          originalTime = video.currentTime;
          probeStarted = true;
          try {
            video.currentTime = 1e9;
          } catch {
            fail(new PoseEngineError("Could not probe video duration.", "video-load", "metadata"));
            return;
          }
          // Also handle setters that update metadata or dispatch synchronously.
          check();
        }
        return;
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        fail(new PoseEngineError(
          "The video has no valid positive duration.", "no-duration", "metadata",
        ));
        return;
      }

      try {
        requestRestoration();
      } catch {
        fail(new PoseEngineError("Could not restore the video position.", "video-load", "metadata"));
        return;
      }
      if (settled || (probeStarted && video.seeking)) return;

      settled = true;
      cleanup();
      resolve({ duration, width, height });
    };

    const timer = setTimeout(() => fail(new PoseEngineError(
      "Video metadata did not load within the time limit.", "timeout", "metadata",
    )), timeoutMs);
    video.addEventListener("loadedmetadata", check);
    video.addEventListener("durationchange", check);
    video.addEventListener("seeked", check);
    video.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);
    // Check after subscribing so already-available metadata needs no new event.
    check();
  });
}
