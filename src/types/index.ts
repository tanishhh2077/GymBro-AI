/**
 * Core domain types for GymBro AI.
 *
 * These are intentionally framework-agnostic so the analysis layer
 * (PoseEngine, analyzers, fusion) can be tested and reasoned about
 * independently of React.
 */

/** The three lifts we analyze. */
export type Exercise = "squat" | "deadlift" | "bench";

/** Camera angle the clip was filmed from. */
export type CameraAngle = "front" | "side" | "45";

/** How a clip was added to a session. */
export type ClipSource = "upload" | "record";

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
 * A single 3D landmark in real-world metric space (meters), with the origin
 * at the subject's hip center. Used for robust, view-invariant angle math.
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

/** Phase of a rep at a given moment. */
export type RepPhase = "eccentric" | "concentric";

/**
 * A measured angle/metric sample over time, used for charts.
 */
export interface MetricSample {
  time: number;
  value: number;
}

/** Severity for a detected form issue. */
export type FlagSeverity = "info" | "minor" | "major";

/**
 * A single form observation, written in plain language, attributed to the
 * camera angle that detected it, with a one-line fix.
 */
export interface FormFlag {
  id: string;
  label: string;
  detail: string;
  fix: string;
  severity: FlagSeverity;
  /** Camera angle whose footage produced this flag. */
  detectedFrom: CameraAngle;
  /** Which metric/joint produced it (for transparency). */
  metric: string;
}

/** A single detected repetition with its metrics. */
export interface Rep {
  index: number;
  /** Seconds. */
  startTime: number;
  bottomTime: number;
  endTime: number;
  eccentricDuration: number;
  concentricDuration: number;
  /** Primary range-of-motion metric in degrees (exercise dependent). */
  romDegrees: number;
  /** Map of named metrics to their value for this rep. */
  metrics: Record<string, number>;
  flags: FormFlag[];
  /** Per-rep angle traces for charts, keyed by series name. */
  series: Record<string, MetricSample[]>;
}

/** Output of a single analyzer on a single clip. */
export interface ClipAnalysis {
  clipId: string;
  exercise: Exercise;
  angle: CameraAngle;
  reps: Rep[];
  flags: FormFlag[];
  /** 0..100 form score for this clip alone. */
  score: number;
  /** Continuous primary-angle trace for the whole clip (for timeline). */
  primarySeries: MetricSample[];
  primarySeriesLabel: string;
  /** Cues this angle can/cannot provide, for UI transparency. */
  capabilities: AngleCapabilities;
  notes: string[];
}

/** What a given camera angle can and cannot tell us for an exercise. */
export interface AngleCapabilities {
  can: string[];
  cannot: string[];
}

/** When multiple angles disagree on a metric, we surface it explicitly. */
export interface MetricDisagreement {
  metric: string;
  label: string;
  values: { angle: CameraAngle; value: number; unit: string }[];
  spread: number;
  note: string;
}

/** The unified, multi-angle session report. */
export interface SessionReport {
  exercise: Exercise;
  overallScore: number;
  repCount: number;
  /** The merged, de-duplicated, prioritized flags. */
  flags: FormFlag[];
  /** Per-clip analyses that fed the report. */
  perClip: ClipAnalysis[];
  /** Representative reps merged across angles. */
  reps: Rep[];
  disagreements: MetricDisagreement[];
  /** Plain-language summary lines. */
  summary: string[];
}

/**
 * The interface every per-exercise analyzer implements. Keeping a single
 * shape lets MultiAngleFusion treat squat/deadlift/bench uniformly.
 */
export interface ExerciseAnalyzer {
  exercise: Exercise;
  analyze(input: AnalyzerInput): ClipAnalysis;
  /** Static description of per-angle capabilities. */
  capabilitiesFor(angle: CameraAngle): AngleCapabilities;
}

export interface AnalyzerInput {
  clipId: string;
  angle: CameraAngle;
  pose: PoseResult;
}
