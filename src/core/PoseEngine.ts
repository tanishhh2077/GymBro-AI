import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type {
  PoseCoverage,
  PoseDelegate,
  PoseFrame,
  PoseProgress,
  PoseResult,
} from "@/types";

const WASM_PATH = "/wasm";
const MODEL_PATH = "/models/pose_landmarker_full.task";

/** Target sampling rate when stepping through an uploaded clip. */
const DEFAULT_TARGET_FPS = 30;

export interface ProcessOptions {
  targetFps?: number;
  onProgress?: (p: PoseProgress) => void;
  signal?: AbortSignal;
}

export class PoseEngineError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "init"
      | "video-load"
      | "no-duration"
      | "aborted"
      | "detect" = "detect",
  ) {
    super(message);
    this.name = "PoseEngineError";
  }
}

/**
 * Runs MediaPipe PoseLandmarker over a video and yields per-frame landmark
 * sets. A single engine instance is reused across clips (model load is the
 * expensive part). GPU delegate is attempted first, with a transparent CPU
 * fallback so the app still works on machines without WebGL2.
 */
export class PoseEngine {
  private landmarker: PoseLandmarker | null = null;
  private delegate: PoseDelegate = "GPU";
  private initPromise: Promise<void> | null = null;

  /** Lazily initialize (and cache) the underlying PoseLandmarker. */
  async init(): Promise<void> {
    if (this.landmarker) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  get currentDelegate(): PoseDelegate {
    return this.delegate;
  }

  private async doInit(): Promise<void> {
    let fileset;
    try {
      fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    } catch (err) {
      throw new PoseEngineError(
        `Failed to load vision WASM runtime: ${String(err)}`,
        "init",
      );
    }

    const build = (delegate: PoseDelegate) =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });

    try {
      this.landmarker = await build("GPU");
      this.delegate = "GPU";
    } catch {
      // GPU unavailable (no WebGL2, headless, etc.) — fall back to CPU.
      try {
        this.landmarker = await build("CPU");
        this.delegate = "CPU";
      } catch (err) {
        throw new PoseEngineError(
          `Failed to create PoseLandmarker: ${String(err)}`,
          "init",
        );
      }
    }
  }

  /**
   * Process an entire video element, stepping through it by seeking so that
   * sampling is deterministic and independent of real-time playback speed.
   */
  async processVideo(
    video: HTMLVideoElement,
    options: ProcessOptions = {},
  ): Promise<PoseResult> {
    await this.init();
    if (!this.landmarker) {
      throw new PoseEngineError("PoseLandmarker not initialized", "init");
    }

    const { onProgress, signal } = options;
    const targetFps = options.targetFps ?? DEFAULT_TARGET_FPS;

    const duration = await resolveDuration(video);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new PoseEngineError(
        "Could not determine video duration (file may be corrupt).",
        "no-duration",
      );
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      throw new PoseEngineError(
        "Video has no decodable image data.",
        "video-load",
      );
    }

    const dt = 1 / targetFps;
    const estimatedTotalFrames = Math.max(1, Math.floor(duration / dt));
    const frames: PoseFrame[] = [];

    let lastTimestampMs = -1;
    let frameIndex = 0;

    video.pause();

    for (let t = 0; t < duration; t += dt) {
      if (signal?.aborted) {
        throw new PoseEngineError("Processing aborted.", "aborted");
      }

      await seekTo(video, Math.min(t, duration - 1e-3));

      // Timestamps passed to detectForVideo must be strictly increasing.
      let timestampMs = Math.round(video.currentTime * 1000);
      if (timestampMs <= lastTimestampMs) timestampMs = lastTimestampMs + 1;
      lastTimestampMs = timestampMs;

      let result: PoseLandmarkerResult | null;
      try {
        result = this.landmarker.detectForVideo(video, timestampMs);
      } catch (err) {
        throw new PoseEngineError(
          `Pose detection failed at ${video.currentTime.toFixed(2)}s: ${String(err)}`,
          "detect",
        );
      }

      const hasPose =
        result &&
        result.landmarks &&
        result.landmarks.length > 0 &&
        result.landmarks[0].length > 0;

      frames.push({
        index: frameIndex,
        time: video.currentTime,
        landmarks: hasPose ? result!.landmarks[0] : null,
        worldLandmarks:
          hasPose && result!.worldLandmarks && result!.worldLandmarks.length > 0
            ? result!.worldLandmarks[0]
            : null,
      });

      frameIndex++;
      onProgress?.({
        processedFrames: frameIndex,
        estimatedTotalFrames,
        fraction: Math.min(1, video.currentTime / duration),
        currentTime: video.currentTime,
        duration,
      });
    }

    const coverage = computeCoverage(frames);

    return {
      frames,
      fps: targetFps,
      duration,
      width,
      height,
      delegate: this.delegate,
      coverage,
    };
  }

  /** Release GPU/CPU resources. */
  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

/** Seek the video to time `t` (seconds) and resolve once the frame is ready. */
function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new PoseEngineError("Video errored while seeking.", "video-load"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = t;
    } catch (err) {
      cleanup();
      reject(new PoseEngineError(`Seek failed: ${String(err)}`, "video-load"));
    }
  });
}

/**
 * Some containers (notably MediaRecorder webm) report Infinity for duration
 * until the playhead is moved to the end. This forces metadata to settle.
 */
function resolveDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      resolve(video.duration);
      return;
    }

    let settled = false;
    const finish = (d: number) => {
      if (settled) return;
      settled = true;
      video.removeEventListener("durationchange", onChange);
      // Reset playhead for subsequent processing.
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      resolve(d);
    };

    const onChange = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish(video.duration);
      }
    };

    video.addEventListener("durationchange", onChange);
    // Nudge the playhead far ahead to force duration resolution.
    try {
      video.currentTime = 1e9;
    } catch {
      /* ignore */
    }
    // Safety timeout so we never hang forever.
    window.setTimeout(() => finish(video.duration), 3000);
  });
}

function computeCoverage(frames: PoseFrame[]): PoseCoverage {
  const total = frames.length;
  let withPose = 0;
  let visSum = 0;
  let visCount = 0;
  for (const f of frames) {
    if (f.landmarks) {
      withPose++;
      for (const lm of f.landmarks) {
        if (typeof lm.visibility === "number") {
          visSum += lm.visibility;
          visCount++;
        }
      }
    }
  }
  return {
    totalFrames: total,
    framesWithPose: withPose,
    detectionRate: total > 0 ? withPose / total : 0,
    meanVisibility: visCount > 0 ? visSum / visCount : 0,
  };
}

/** Shared singleton so the heavy model is only loaded once per page. */
let singleton: PoseEngine | null = null;
export function getPoseEngine(): PoseEngine {
  if (!singleton) singleton = new PoseEngine();
  return singleton;
}
