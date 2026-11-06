export type WeightUnit = 'lb' | 'kg';
export type SetKind = 'regular' | 'warmup';
export interface WorkoutSet { readonly id: string; readonly reps: number; readonly weight: number; readonly kind?: SetKind }
/** Planned values only; targetWeight is in the routine's/workout's unit and is never an actual logged set. */
export interface RoutineTargets { readonly targetSets?: number; readonly targetReps?: number; readonly targetWeight?: number }
export interface RoutineExerciseInput extends RoutineTargets { readonly name: string }
export interface RoutineExercise extends RoutineExerciseInput { readonly id: string }
export interface RoutineInput { readonly name: string; readonly unit: WeightUnit; readonly exercises: readonly RoutineExerciseInput[] }
export interface WorkoutRoutine extends RoutineInput { readonly id: string; readonly exercises: readonly RoutineExercise[] }
export interface WorkoutExercise extends RoutineTargets { readonly id: string; readonly name: string; readonly sets: readonly WorkoutSet[] }
export interface Workout {
  readonly id: string;
  readonly name: string;
  readonly unit: WeightUnit;
  /** Epoch milliseconds; entered loads remain in this workout's explicit unit. */
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly exercises: readonly WorkoutExercise[];
  /** Schema4 free-text note; omitted when empty. */
  readonly note?: string;
}
export interface WorkoutData {
  readonly version: 2 | 3 | 4;
  readonly revision: number;
  readonly active: Workout | null;
  readonly history: readonly Workout[];
  /** Omitted when upgrading legacy data so exact-cap records do not grow on read. */
  readonly routines?: readonly WorkoutRoutine[];
}
export type WorkoutResult = { ok: true } | { ok: false; message: string };
