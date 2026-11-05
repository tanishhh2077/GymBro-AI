export type WeightUnit = 'lb' | 'kg';
export interface WorkoutSet { readonly id: string; readonly reps: number; readonly weight: number }
export interface WorkoutExercise { readonly id: string; readonly name: string; readonly sets: readonly WorkoutSet[] }
export interface Workout {
  readonly id: string;
  readonly name: string;
  readonly unit: WeightUnit;
  /** Epoch milliseconds; entered loads remain in this workout's explicit unit. */
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly exercises: readonly WorkoutExercise[];
}
export interface WorkoutData {
  readonly version: 1;
  readonly revision: number;
  readonly active: Workout | null;
  readonly history: readonly Workout[];
}
export type WorkoutResult = { ok: true } | { ok: false; message: string };
