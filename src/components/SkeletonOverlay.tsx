import { useEffect, useRef } from "react";
import type { NormalizedLandmark, PoseFrame } from "@/types";
import { KEY_JOINTS, POSE_CONNECTIONS } from "@/core/landmarks";
import { isDrawableLandmark, samplePose, videoContentRect, type Rect } from "./poseDisplay";

interface SkeletonOverlayProps {
  /** The video this overlay tracks. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Per-frame landmarks (normalized) to draw. */
  frames: PoseFrame[];
  targetFps: number;
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
  targetFps,
  minVisibility = VISIBILITY_FLOOR,
  color = "#4ade80",
  className,
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !video || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const box = video.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      canvas.style.left = `${box.left - parentBox.left - parent.clientLeft + parent.scrollLeft}px`;
      canvas.style.top = `${box.top - parentBox.top - parent.clientTop + parent.scrollTop}px`;
      canvas.style.width = `${box.width}px`;
      canvas.style.height = `${box.height}px`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pxW = Math.round(box.width * dpr);
      const pxH = Math.round(box.height * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      if (video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      const content = videoContentRect(video.videoWidth, video.videoHeight, box.width, box.height);
      const pose = samplePose(frames, video.currentTime, targetFps);
      if (!content || !pose) return;
      drawSkeleton(ctx, pose.landmarks, content, color, minVisibility);
    };

    let raf: number | undefined;
    const playing = () => !video.paused && !video.ended;
    const tick = () => {
      raf = undefined;
      draw();
      if (playing()) raf = requestAnimationFrame(tick);
    };
    const refresh = () => {
      draw();
      if (playing() && raf === undefined) raf = requestAnimationFrame(tick);
      else if (!playing() && raf !== undefined) {
        cancelAnimationFrame(raf);
        raf = undefined;
      }
    };
    const events = ["loadedmetadata", "loadeddata", "timeupdate", "seeking", "seeked", "play", "pause", "ended", "ratechange", "emptied"];
    for (const event of events) video.addEventListener(event, refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("orientationchange", refresh);
    const observer = new ResizeObserver(refresh);
    observer.observe(video);
    refresh();
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
      observer.disconnect();
      for (const event of events) video.removeEventListener(event, refresh);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
    };
  }, [frames, targetFps, videoRef, color, minVisibility]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ position: "absolute", pointerEvents: "none" }}
    />
  );
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  content: Rect,
  color: string,
  minVisibility: number,
): void {
  const visible = (i: number) => isDrawableLandmark(landmarks[i], minVisibility);

  // Bones
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!landmarks[a] || !landmarks[b]) continue;
    if (!visible(a) || !visible(b)) continue;
    const ax = content.x + landmarks[a].x * content.width;
    const ay = content.y + landmarks[a].y * content.height;
    const bx = content.x + landmarks[b].x * content.width;
    const by = content.y + landmarks[b].y * content.height;

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
    const x = content.x + landmarks[i].x * content.width;
    const y = content.y + landmarks[i].y * content.height;

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
