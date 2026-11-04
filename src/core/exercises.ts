import type { CameraAngle, Exercise } from "@/types";

export interface ExerciseMeta {
  id: Exercise;
  name: string;
  tagline: string;
  /** Joints/cues this lift focuses on. */
  focus: string[];
  accent: string;
}

export const EXERCISES: Record<Exercise, ExerciseMeta> = {
  squat: {
    id: "squat",
    name: "Back Squat",
    tagline: "Depth, knee tracking, and symmetric drive.",
    focus: ["Knee angle", "Hip depth", "Tempo", "Valgus (front)"],
    accent: "#4ade80",
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    tagline: "Hip hinge, torso angle, and clean lockout.",
    focus: ["Hip angle", "Torso lean", "Lockout", "Tempo"],
    accent: "#38bdf8",
  },
  bench: {
    id: "bench",
    name: "Bench Press",
    tagline: "Elbow path, bar trajectory, and bottom depth.",
    focus: ["Elbow angle", "Bar path", "Bottom depth", "Tempo"],
    accent: "#f472b6",
  },
};

export interface AngleMeta {
  id: CameraAngle;
  name: string;
  description: string;
}

export const ANGLES: Record<CameraAngle, AngleMeta> = {
  side: {
    id: "side",
    name: "Side",
    description: "Best for depth, hip/knee angles, and tempo.",
  },
  front: {
    id: "front",
    name: "Front",
    description: "Best for left/right symmetry and knee cave.",
  },
  "45": {
    id: "45",
    name: "45°",
    description: "A balanced view of depth and tracking.",
  },
};
