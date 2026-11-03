import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { TOTAL_LANDMARKS } from "./landmarks";
import { PoseEngineError } from "./processingErrors";
import { M1_LIMITS, type ProcessingLimits } from "./processingLimits";
import { readVideoMetadata, seekToFrame, type MediaWaitOptions, type VideoMetadata } from "./video";
export { PoseEngineError } from "./processingErrors";
import type {
  NormalizedLandmark,
  PoseCoverage,
  PoseDelegate,
  PoseFrame,
  PoseProgress,
  PoseResult,
} from "@/types";

const WASM_PATH = "/wasm";
const MODEL_PATH = "/models/pose_landmarker_full.task";

/** Browser timers cannot represent delays beyond a signed 32-bit integer. */
const MAX_TIMER_MS = 2_147_483_647;

export interface ProcessOptions {
  /** Requested observations per second; defaults to `limits.targetFps`. */
  targetFps?: number;
  onProgress?: (p: PoseProgress) => void;
  signal?: AbortSignal;
  limits?: Readonly<ProcessingLimits>;
}

interface PreparedDetector {
  detector: PoseLandmarker;
  delegate: PoseDelegate;
}

/** One init or processing call. Its controller stops every wait it owns. */
interface Job {
  controller: AbortController;
  /** Why the job was stopped from outside (cancel, close, total timeout). */
  failure?: PoseEngineError;
  detach: () => void;
}

/**
 * Runs MediaPipe PoseLandmarker over one video at a time and returns
 * timestamped landmark estimates.
 *
 * Each processing job owns a fresh detector and closes it on every terminal
 * path. VIDEO mode keeps tracking state and needs strictly increasing
 * timestamps, so a detector is never shared between clips; its timestamp
 * clock starts again with each job and is discarded with a cancelled job.
 * A detector prepared by `init()` is handed to the next job, unused.
 *
 * Only one job runs at a time; an overlapping call is rejected as `busy`.
 * `detectForVideo` is synchronous and cannot be interrupted, so cancellation
 * and the total deadline take effect once the current detection returns.
 */
export class PoseEngine {
  private job: Job | null = null;
  private prepared: PreparedDetector | null = null;
  private delegate: PoseDelegate = "GPU";

  /** Prepare a detector for the next job within one bounded wait. */
  async init(options?: MediaWaitOptions): Promise<void> {
    if (this.prepared) return;
    if (this.job) throw busyError();
    const timeoutMs = options?.timeoutMs ?? M1_LIMITS.initializationTimeoutMs;
    if (!isValidTimeout(timeoutMs)) {
      throw new PoseEngineError("Invalid initialization timeout.", "validation", "initialization");
    }
    const job = this.startJob(options?.signal);
    try {
      const prepared = await this.initialize(job, timeoutMs);
      // close() may have run after initialization settled but before this line.
      if (job.controller.signal.aborted) {
        closeQuietly(prepared.detector);
        throw cancelledError();
      }
      this.prepared = prepared;
    } catch (err) {
      throw job.failure ?? err;
    } finally {
      this.finishJob(job);
    }
  }

  get currentDelegate(): PoseDelegate {
    return this.delegate;
  }

  /**
   * Process an entire video element, stepping through it by seeking so that
   * sampling is deterministic and independent of real-time playback speed.
   * Metadata is validated before any model work starts.
   */
  async processVideo(
    video: HTMLVideoElement,
    options: ProcessOptions = {},
  ): Promise<PoseResult> {
    if (this.job) throw busyError();
    const limits = options.limits ?? M1_LIMITS;
    // Invalid values would silently disable a bound (`x > NaN` is always false)
    // or fire a timer at once, so reject them before any work or timer starts.
    validateLimits(limits);
    const targetFps = options.targetFps ?? limits.targetFps;
    if (!Number.isFinite(targetFps) || targetFps <= 0) {
      throw new PoseEngineError("The sampling rate must be a positive number.", "validation");
    }
    const { onProgress } = options;
    const job = this.startJob(options.signal);
    const { signal } = job.controller;
    const totalTimer = setTimeout(() => stopJob(job, new PoseEngineError(
      "Processing did not finish within the time limit.", "timeout", "processing",
    )), limits.totalTimeoutMs);
    let detector: PoseLandmarker | null = null;

    try {
      const metadata = await readVideoMetadata(video, {
        signal, timeoutMs: limits.metadataTimeoutMs,
      });
      validateMetadata(metadata, limits);
      const { duration, width, height } = metadata;

      const prepared = this.prepared ??
        await this.initialize(job, limits.initializationTimeoutMs);
      this.prepared = null;
      detector = prepared.detector;

      const estimatedTotalFrames = Math.max(1, Math.ceil(duration * targetFps));
      const frames: PoseFrame[] = [];
      let lastTime = -Infinity;
      let lastTimestampMs = -1;

      video.pause();

      // Dividing per step avoids accumulating floating-point error in time.
      for (let step = 0; step / targetFps < duration; step++) {
        throwIfStopped(job);
        await seekToFrame(video, step / targetFps, {
          signal, timeoutMs: limits.seekTimeoutMs,
        });

        // Read the position back rather than computing it. It is usually the seek
        // target; it is not a decoded frame's presentation timestamp.
        const time = video.currentTime;
        if (!Number.isFinite(time) || time < 0 || time > duration) {
          throw new PoseEngineError(
            `The browser reported an invalid video position (${time} s).`, "video-load", "seek",
          );
        }

        // A repeated or backward position adds no new observation.
        if (time > lastTime) {
          lastTime = time;
          // The detector clock must strictly increase even when distinct media
          // times round to the same millisecond; stored time stays unchanged.
          const timestampMs = Math.max(Math.round(time * 1000), lastTimestampMs + 1);
          lastTimestampMs = timestampMs;

          let result: PoseLandmarkerResult;
          try {
            result = detector.detectForVideo(video, timestampMs);
          } catch (err) {
            throw new PoseEngineError(
              `Pose detection failed at ${time.toFixed(2)}s: ${String(err)}`, "detect", "processing",
            );
          }
          throwIfStopped(job);
          frames.push(toPoseFrame(frames.length, time, result));
        }

        onProgress?.({
          processedFrames: step + 1,
          estimatedTotalFrames,
          fraction: Math.min(1, time / duration),
          currentTime: time,
          duration,
        });
      }
      throwIfStopped(job);

      return {
        frames,
        fps: targetFps,
        duration,
        width,
        height,
        delegate: prepared.delegate,
        coverage: computeCoverage(frames),
      };
    } catch (err) {
      throw job.failure ?? err;
    } finally {
      clearTimeout(totalTimer);
      if (detector) closeQuietly(detector);
      this.finishJob(job);
    }
  }

  /**
   * Release resources. Cancels a running job, whose own cleanup then closes
   * its detector; a detector that finishes loading later is disposed too.
   * Safe to call repeatedly.
   */
  close(): void {
    if (this.job) stopJob(this.job, cancelledError());
    if (this.prepared) closeQuietly(this.prepared.detector);
    this.prepared = null;
  }

  private startJob(external?: AbortSignal): Job {
    const job: Job = { controller: new AbortController(), detach: () => {} };
    this.job = job;
    if (external) {
      const onAbort = () => stopJob(job, cancelledError());
      if (external.aborted) onAbort();
      else {
        external.addEventListener("abort", onAbort);
        job.detach = () => external.removeEventListener("abort", onAbort);
      }
    }
    return job;
  }

  private finishJob(job: Job): void {
    job.detach();
    if (this.job === job) this.job = null;
  }

  /**
   * Load the runtime and create a detector, trying GPU then CPU, within one
   * shared deadline. The SDK calls cannot be cancelled, so a detector that
   * arrives after the wait has ended is closed, and a late rejection is
   * consumed without starting the CPU fallback.
   */
  private initialize(job: Job, timeoutMs: number): Promise<PreparedDetector> {
    const { signal } = job.controller;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (settle: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        settle();
      };
      const onAbort = () => finish(() => reject(new PoseEngineError(
        "Model initialization was cancelled.", "aborted", "initialization",
      )));
      const timer = setTimeout(() => finish(() => reject(new PoseEngineError(
        "The pose model did not start within the time limit.", "timeout", "initialization",
      ))), timeoutMs);
      signal.addEventListener("abort", onAbort);
      if (signal.aborted) { onAbort(); return; }

      createDetector(() => settled).then(
        prepared => {
          if (!prepared) return;
          if (settled) { closeQuietly(prepared.detector); return; }
          this.delegate = prepared.delegate;
          finish(() => resolve(prepared));
        },
        (err: unknown) => finish(() => reject(err)),
      );
    });
  }
}

/** Returns null when the owning wait ended before a fallback would start. */
async function createDetector(abandoned: () => boolean): Promise<PreparedDetector | null> {
  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  } catch (err) {
    throw new PoseEngineError(
      `Failed to load vision WASM runtime: ${String(err)}`, "init", "initialization",
    );
  }
  if (abandoned()) return null;

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
    return { detector: await build("GPU"), delegate: "GPU" };
  } catch {
    // GPU unavailable (no WebGL2, headless, etc.) — fall back to CPU.
    if (abandoned()) return null;
    try {
      return { detector: await build("CPU"), delegate: "CPU" };
    } catch (err) {
      throw new PoseEngineError(
        `Failed to create PoseLandmarker: ${String(err)}`, "init", "initialization",
      );
    }
  }
}

function isValidTimeout(ms: number): boolean {
  return Number.isFinite(ms) && ms > 0 && ms <= MAX_TIMER_MS;
}

function validateLimits(limits: Readonly<ProcessingLimits>): void {
  const bounds = [
    limits.maxFileBytes, limits.maxDurationSeconds, limits.maxLongEdge,
    limits.maxPixels, limits.targetFps,
  ];
  const timeouts = [
    limits.metadataTimeoutMs, limits.initializationTimeoutMs,
    limits.seekTimeoutMs, limits.totalTimeoutMs,
  ];
  if (!bounds.every(value => Number.isFinite(value) && value > 0) ||
      !timeouts.every(isValidTimeout)) {
    throw new PoseEngineError(
      "Processing limits must be positive finite numbers within timer range.", "validation",
    );
  }
}

function validateMetadata(
  { duration, width, height }: VideoMetadata,
  limits: Readonly<ProcessingLimits>,
): void {
  let problem: string | null = null;
  if (duration > limits.maxDurationSeconds) {
    problem = `The video is longer than ${limits.maxDurationSeconds} seconds.`;
  } else if (Math.max(width, height) > limits.maxLongEdge) {
    problem = `The video's longest side exceeds ${limits.maxLongEdge} pixels.`;
  } else if (width * height > limits.maxPixels) {
    problem = `The video has more than ${limits.maxPixels} pixels per frame.`;
  }
  if (problem) throw new PoseEngineError(problem, "validation", "metadata");
}

/**
 * Copy one detection into an owned frame. No detection stays null; malformed
 * or non-finite coordinates are an error rather than being replaced. Finite
 * off-image estimates are kept as raw observations, and missing visibility
 * stays missing.
 */
function toPoseFrame(index: number, time: number, result: PoseLandmarkerResult): PoseFrame {
  if (!result || !Array.isArray(result.landmarks)) throw malformedError("normalized");
  const pose: unknown = result.landmarks[0];
  if (pose === undefined || (Array.isArray(pose) && pose.length === 0)) {
    return { index, time, landmarks: null, worldLandmarks: null };
  }
  const world: unknown = Array.isArray(result.worldLandmarks)
    ? result.worldLandmarks[0] : undefined;
  return {
    index,
    time,
    landmarks: copyLandmarks(pose, "normalized"),
    worldLandmarks: world === undefined || (Array.isArray(world) && world.length === 0)
      ? null : copyLandmarks(world, "world"),
  };
}

function copyLandmarks(points: unknown, label: string): NormalizedLandmark[] {
  if (!Array.isArray(points) || points.length !== TOTAL_LANDMARKS) {
    throw malformedError(label);
  }
  return points.map((point: unknown) => {
    if (typeof point !== "object" || point === null) throw malformedError(label);
    const { x, y, z, visibility } = point as Record<string, unknown>;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z) ||
        (visibility !== undefined && !isFiniteNumber(visibility))) {
      throw malformedError(label);
    }
    return visibility === undefined ? { x, y, z } : { x, y, z, visibility };
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function malformedError(label: string): PoseEngineError {
  return new PoseEngineError(
    `The pose model returned malformed ${label} landmarks.`, "detect", "processing",
  );
}

function busyError(): PoseEngineError {
  return new PoseEngineError(
    "The pose engine is busy with another operation; wait for it to finish.", "busy",
  );
}

function cancelledError(): PoseEngineError {
  return new PoseEngineError("Processing was cancelled.", "aborted");
}

/** Record the first outside reason, then stop every wait the job owns. */
function stopJob(job: Job, failure: PoseEngineError): void {
  if (!job.failure) job.failure = failure;
  job.controller.abort();
}

function throwIfStopped(job: Job): void {
  if (job.controller.signal.aborted) throw job.failure ?? cancelledError();
}

/** A failing close must not replace the job's result or primary error. */
function closeQuietly(detector: PoseLandmarker): void {
  try {
    detector.close();
  } catch {
    /* Resource release is best-effort once the job has ended. */
  }
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
