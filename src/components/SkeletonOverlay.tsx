import { useEffect, useRef } from "react";
import type { NormalizedLandmark, PoseFrame } from "@/types";
import { KEY_JOINTS, POSE_CONNECTIONS } from "@/core/landmarks";

interface SkeletonOverlayProps {
  /** The video this overlay tracks. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Per-frame landmarks (normalized) to draw. */
  frames: PoseFrame[];
  /** Minimum landmark visibility to draw a point/edge. */
  minVisibility?: number;
  /** Accent color for the skeleton (CSS color). */
  color?: string;
  className?: string;
}

const VISIBILITY_FLOOR = 0.3;

/**
 * Draws a smooth pose skeleton on top of a video, synced to playback.
 *
 * It is intentionally decoupled from any exercise logic: give it a video and
 * a stream of normalized frames and it renders. Interpolation between adjacent
 * frames keeps motion fluid even when sampled below the display refresh rate.
 */
export function SkeletonOverlay({
  videoRef,
  frames,
  minVisibility = VISIBILITY_FLOOR,
  color = "#4ade80",
  className,
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const times = frames.map((f) => f.time);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const v = videoRef.current;
      if (!v) return;

      // Keep the canvas backing store matched to its display size * dpr.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) return;
      const pxW = Math.round(cw * dpr);
      const pxH = Math.round(ch * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      if (frames.length === 0) return;

      const t = v.currentTime;
      const interp = sampleAt(frames, times, t);
      if (!interp) return;

      drawSkeleton(ctx, interp, cw, ch, color, minVisibility);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, videoRef, color, minVisibility]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

/** Binary-search the nearest two frames and linearly interpolate landmarks. */
function sampleAt(
  frames: PoseFrame[],
  times: number[],
  t: number,
): NormalizedLandmark[] | null {
  if (frames.length === 0) return null;
  if (t <= times[0]) return frames[0].landmarks;
  if (t >= times[times.length - 1]) return frames[frames.length - 1].landmarks;

  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }

  const a = frames[lo].landmarks;
  const b = frames[hi].landmarks;
  // If either neighbor is missing a pose, prefer the present one (no ghosting).
  if (!a || !b) return a ?? b;

  const span = times[hi] - times[lo];
  const f = span > 1e-6 ? (t - times[lo]) / span : 0;

  const out: NormalizedLandmark[] = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const la = a[i];
    const lb = b[i];
    out[i] = {
      x: la.x + (lb.x - la.x) * f,
      y: la.y + (lb.y - la.y) * f,
      z: la.z + (lb.z - la.z) * f,
      visibility: Math.min(la.visibility ?? 1, lb.visibility ?? 1),
    };
  }
  return out;
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number,
  color: string,
  minVisibility: number,
): void {
  const visible = (i: number) =>
    (landmarks[i]?.visibility ?? 1) >= minVisibility;

  // Bones
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!landmarks[a] || !landmarks[b]) continue;
    if (!visible(a) || !visible(b)) continue;
    const ax = landmarks[a].x * w;
    const ay = landmarks[a].y * h;
    const bx = landmarks[b].x * w;
    const by = landmarks[b].y * h;

    // Soft outer glow for that athletic-tech look.
    ctx.strokeStyle = hexWithAlpha(color, 0.18);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // Joints
  for (const i of KEY_JOINTS) {
    if (!landmarks[i] || !visible(i)) continue;
    const x = landmarks[i].x * w;
    const y = landmarks[i].y * h;

    ctx.fillStyle = hexWithAlpha("#ffffff", 0.9);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Accepts #rrggbb and returns rgba() with the given alpha. */
function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
