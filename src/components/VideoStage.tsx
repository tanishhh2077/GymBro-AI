import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Clip, ProcessingFailureKind } from "@/types";
import { EXERCISES } from "@/core/exercises";
import { SkeletonOverlay } from "./SkeletonOverlay";
import { ElbowTimeline } from "./ElbowTimeline";
import {
  AlertIcon,
  CpuIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
} from "./icons";

interface VideoStageProps {
  clip: Clip;
  accent?: string;
  /** Lease the clip's URL while this player shows it; returns the release. */
  retainMedia: (id: string) => () => void;
}

const SPEEDS = [0.25, 0.5, 1] as const;

export function VideoStage(props: VideoStageProps) {
  return <VideoStagePlayer key={`${props.clip.id}:${props.clip.url}`} {...props} />;
}

function VideoStagePlayer({
  clip,
  accent = EXERCISES.bench.accent,
  retainMedia,
}: VideoStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const attached = useRef(false);
  const playAttempt = useRef(0);
  const fallbackDuration = finiteDuration(clip.pose?.duration ?? 0);
  const displayDuration = duration || fallbackDuration;

  // The overlay needs detected poses; playback only needs a completed clip, so a
  // no-pose clip can still be replayed without implying anything about its quality.
  const ready = clip.status === "ready" && !!clip.pose;
  const playable = ready || clip.status === "no-pose";
  const frames = clip.pose?.frames ?? [];

  // The source is set here rather than as a JSX prop so a StrictMode remount
  // re-attaches it after cleanup detached it.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const release = retainMedia(clip.id);
    attached.current = true;
    playAttempt.current++;
    v.src = clip.url;
    return () => {
      attached.current = false;
      v.pause();
      v.removeAttribute("src");
      v.load();
      release();
    };
  }, [clip.id, clip.url, retainMedia]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDuration(finiteDuration(v.duration));
    const onPlay = () => { setPlaying(true); setPlaybackError(null); };
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  const startPlayback = async (fromStart = false) => {
    const v = videoRef.current;
    if (!v) return;
    const attempt = ++playAttempt.current;
    setPlaybackError(null);
    try {
      if (fromStart) {
        v.currentTime = 0;
        setTime(v.currentTime);
      }
      await v.play();
    } catch {
      if (attached.current && attempt === playAttempt.current) {
        setPlaying(!v.paused && !v.ended);
        setPlaybackError("Playback could not start. Try Play again, or remove this clip and choose another.");
      }
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void startPlayback();
    else {
      playAttempt.current++;
      v.pause();
    }
  };

  const scrub = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = value;
    setTime(value);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-black">
      <div className="flex w-full justify-center bg-black">
        <div className="relative min-h-[220px]">
          <video
            ref={videoRef}
            playsInline
            muted
            preload="auto"
            style={{ objectFit: "contain" }}
            className="block max-h-[70vh] max-w-full"
          />
          {ready && (
            <SkeletonOverlay
              videoRef={videoRef}
              frames={frames}
              targetFps={clip.pose!.fps}
              color={accent}
            />
          )}

          <ProcessingLayer clip={clip} accent={accent} />
          <ErrorLayer clip={clip} />
        </div>
      </div>

      <NoPoseNotice visible={clip.status === "no-pose"} />
      {playbackError && <div role="alert" className="px-4 pt-3 text-sm text-warn">{playbackError}</div>}

      {/* Controls */}
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!playable}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink-950 shadow-glow transition-transform hover:scale-105 disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon width={20} /> : <PlayIcon width={20} />}
          </button>
          <button
            type="button"
            onClick={() => void startPlayback(true)}
            disabled={!playable}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
            aria-label="Restart"
          >
            <RestartIcon width={18} />
          </button>

          <input
            type="range"
            aria-label="Video position"
            className="scrubber min-w-0 flex-1"
            min={0}
            max={displayDuration}
            step={0.01}
            value={time}
            disabled={!playable}
            onChange={(e) => scrub(parseFloat(e.target.value))}
          />

          <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
            {fmt(time)} / {fmt(displayDuration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Speed
            </span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                disabled={!playable}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                  speed === s
                    ? "bg-accent/20 text-accent-100"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {clip.pose && <CoverageBadges clip={clip} />}
        </div>
      </div>
      {playable && clip.pose && <ElbowTimeline pose={clip.pose} time={time} onSeek={scrub} />}
    </div>
  );
}

function ProcessingLayer({ clip, accent }: { clip: Clip; accent: string }) {
  const pct = clip.progress ? Math.round(clip.progress.fraction * 100) : 0;
  return (
    <AnimatePresence>
      {clip.status === "processing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950/80 backdrop-blur-sm"
        >
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke={accent}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 0.2s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold text-white">
              {pct}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">
              Estimating pose…
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {clip.progress
                ? `${clip.progress.processedFrames} frames · ${clip.progress.currentTime.toFixed(1)}s`
                : "Preparing…"}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const FAILURE_TITLES: Partial<Record<ProcessingFailureKind, string>> = {
  validation: "This video is outside the supported limits",
  "video-load": "The video could not be read",
  "no-duration": "The video's length could not be read",
  init: "The pose model could not start",
  timeout: "Processing took too long",
  detect: "Pose estimation failed",
  busy: "The pose engine was busy",
};

/** A processing failure: the job did not complete, so nothing can be replayed. */
function ErrorLayer({ clip }: { clip: Clip }) {
  if (clip.status !== "error") return null;
  const title = (clip.errorKind && FAILURE_TITLES[clip.errorKind]) ?? "Processing failed";
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/85 px-6 text-center backdrop-blur-sm"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertIcon width={24} aria-hidden="true" />
      </span>
      <div className="max-w-sm text-sm">
        <div className="font-semibold text-white">{title}</div>
        <div className="mt-1 text-slate-300">{clip.error}</div>
        <div className="mt-2 text-xs text-slate-500">Remove the clip to try another.</div>
      </div>
    </div>
  );
}

/**
 * A completed result with no detected pose. It does not cover the video, which
 * can still be replayed, and it says nothing about the lifter's technique.
 */
function NoPoseNotice({ visible }: { visible: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={visible ? "flex items-start gap-2 border-t border-warn/20 bg-warn/10 px-4 py-3 text-sm" : undefined}
    >
      {visible && <>
      <AlertIcon width={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
      <div>
        <div className="font-semibold text-white">No pose detected in the sampled frames</div>
        <div className="mt-0.5 text-slate-300">
          This is not a judgment of your form. Check that one lifter&apos;s shoulders,
          elbows, and wrists are visible from the side in good light, then try another
          clip. You can still replay this video.
        </div>
      </div>
      </>}
    </div>
  );
}

function CoverageBadges({ clip }: { clip: Clip }) {
  const pose = clip.pose!;
  const rate = Math.round(pose.coverage.detectionRate * 100);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="chip bg-white/5 text-slate-300">
        <CpuIcon width={13} /> {pose.delegate}
      </span>
      <span className="chip bg-white/5 text-slate-300">
        Sampling target: {pose.fps} samples/s
      </span>
      <span className="chip bg-white/5 text-slate-300">
        {rate}% of sampled positions with a pose
      </span>
    </div>
  );
}

function finiteDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
