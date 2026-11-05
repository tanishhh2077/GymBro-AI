import type { CameraAngle, Exercise } from "@/types";

/** Display metadata for the supported lift; it makes no measurement claim. */
export interface ExerciseMeta {
  id: Exercise;
  name: string;
  accent: string;
}

export const EXERCISES: Record<Exercise, ExerciseMeta> = {
  bench: { id: "bench", name: "Bench Press", accent: "#f472b6" },
};

/** Display metadata for the supported camera view. */
export interface AngleMeta {
  id: CameraAngle;
  name: string;
}

export const ANGLES: Record<CameraAngle, AngleMeta> = {
  side: { id: "side", name: "Side" },
};
