/**
 * Input bounds and asynchronous failure budgets for milestone 1 (see spec.md).
 * Budgets are upper limits that stop a stuck operation; they are not latency
 * benchmarks or claims about how fast processing runs.
 */
export interface ProcessingLimits {
  /** Largest accepted upload, in bytes. Clip admission (plan Task 2) checks it; the engine does not. */
  maxFileBytes: number;
  /** Longest accepted media duration, in seconds. */
  maxDurationSeconds: number;
  /** Largest decoded width or height, in pixels. */
  maxLongEdge: number;
  /** Largest decoded width x height, in pixels. */
  maxPixels: number;
  /** Requested observations per second of video; not the source frame rate. */
  targetFps: number;
  /** One deadline for the whole metadata stage. */
  metadataTimeoutMs: number;
  /** One deadline shared by runtime loading and GPU/CPU model creation. */
  initializationTimeoutMs: number;
  /** Deadline for each seek and frame-ready wait. */
  seekTimeoutMs: number;
  /** Deadline for one whole processing call, from start to result. */
  totalTimeoutMs: number;
}

export const M1_LIMITS: Readonly<ProcessingLimits> = Object.freeze({
  maxFileBytes: 104_857_600,
  maxDurationSeconds: 60,
  maxLongEdge: 1920,
  maxPixels: 2_073_600,
  targetFps: 30,
  metadataTimeoutMs: 10_000,
  initializationTimeoutMs: 60_000,
  seekTimeoutMs: 10_000,
  totalTimeoutMs: 300_000,
});
