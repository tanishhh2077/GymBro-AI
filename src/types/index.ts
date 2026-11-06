/**
 * Core domain types for GymBro AI.
 *
 * These are framework-agnostic so the pose pipeline and measurements can be
 * tested without React.
 */

/** The one supported lift (D-014). Another lift needs its own decision. */
export type Exercise = "bench";

/** The one supported camera view: a standardized side view. */
export type CameraAngle = "side";

/** How a clip was added: a local file upload; there is no in-app recording. */
export type ClipSource = "upload";

/** Processing stage attached to a recoverable pipeline failure. */
export type ProcessingStage = "metadata" | "initialization" | "seek" | "processing";

export type ProcessingFailureKind =
  | "init"
  | "video-load"
  | "no-duration"
  | "aborted"
  | "detect"
  | "timeout"
  | "busy"
  | "validation";

/**
 * A single 2D landmark in normalized image space (0..1 across width/height).
 * Used for drawing the overlay onto the video.
 */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  /** Visibility / presence confidence in [0,1]; may be undefined. */
  visibility?: number;
}

/**
 * The model's inferred 3D landmark estimate in meters, centred between the hips.
 * It is a model output, not measured ground-truth biomechanics, and current
 * measurements do not use it.
 */
export interface WorldLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** One processed video frame's worth of pose data. */
export interface PoseFrame {
  /** Frame index in capture order, starting at 0. */
  index: number;
  /** Timestamp within the video, in seconds. */
  time: number;
  /** 33 normalized landmarks, or null if no pose was detected this frame. */
  landmarks: NormalizedLandmark[] | null;
  /** 33 world landmarks, or null if no pose was detected this frame. */
  worldLandmarks: WorldLandmark[] | null;
}

/** Progress callback payload while a clip is being processed. */
export interface PoseProgress {
  processedFrames: number;
  /** Best-effort estimate of total frames; may be refined as we go. */
  estimatedTotalFrames: number;
  /** 0..1 fraction of the video duration processed. */
  fraction: number;
  currentTime: number;
  duration: number;
}

/** Which backend the PoseLandmarker ended up running on. */
export type PoseDelegate = "GPU" | "CPU";

/** Summary statistics about pose coverage across a processed clip. */
export interface PoseCoverage {
  totalFrames: number;
  framesWithPose: number;
  /** 0..1 fraction of frames where a pose was detected. */
  detectionRate: number;
  /** Mean visibility across detected landmarks, 0..1. */
  meanVisibility: number;
}

/** The full result of running the PoseEngine over one clip. */
export interface PoseResult {
  frames: PoseFrame[];
  fps: number;
  duration: number;
  width: number;
  height: number;
  delegate: PoseDelegate;
  coverage: PoseCoverage;
}

/** A clip belonging to a session, with its source media and pose results. */
export interface Clip {
  id: string;
  name: string;
  source: ClipSource;
  angle: CameraAngle;
  /** Object URL for the underlying video element. */
  url: string;
  status: ClipStatus;
  /** Populated once processing completes, including when no pose was detected. */
  pose?: PoseResult;
  error?: string;
  /** Typed failure category when `status` is "error" and the cause is known. */
  errorKind?: ProcessingFailureKind;
  /** Live progress while processing. */
  progress?: PoseProgress;
  /**
   * Observed milliseconds from admission to the completed result on this device,
   * including model start-up. One run's observation, not a benchmark; absent when
   * the job did not complete or the clock reading was invalid.
   */
  processingMs?: number;
  /** The logged set this session-only analysis belongs to; never saved. */
  link?: SetLink;
}

/**
 * One logged set. Exercise and set IDs are unique only inside one workout, so the
 * three IDs identify a set only together.
 */
export interface SetLink {
  readonly workoutId: string;
  readonly exerciseId: string;
  readonly setId: string;
}

/**
 * "no-pose" is a completed observation result in which no sampled frame had a
 * detected pose; it is not a processing failure or a judgment of lifting form.
 */
export type ClipStatus =
  | "pending"
  | "processing"
  | "ready"
  | "no-pose"
  | "error";
