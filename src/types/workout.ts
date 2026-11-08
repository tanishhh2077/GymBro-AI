import type { BodyEntry } from './body';

export type WeightUnit = 'lb' | 'kg';
export type SetKind = 'regular' | 'warmup';
/** Schema5 rpe is the lifter's 1-10 effort rating in 0.5 steps; it never changes records, progress or volume. */
export interface WorkoutSet { readonly id: string; readonly reps: number; readonly weight: number; readonly kind?: SetKind; readonly rpe?: number }
/** Planned values only; targetWeight is in the routine's/workout's unit and is never an actual logged set. */
export interface RoutineTargets { readonly targetSets?: number; readonly targetReps?: number; readonly targetWeight?: number }
/**
 * Schema5 plan details shared by routine and workout exercises. `superset` is a group ID used by two or
 * more neighbouring exercises. On a `bodyweight` exercise a set's weight is added load, negative for assistance.
 */
export interface ExerciseDetail { readonly superset?: string; readonly bodyweight?: true }
export interface RoutineExerciseInput extends RoutineTargets, ExerciseDetail { readonly name: string }
export interface RoutineExercise extends RoutineExerciseInput { readonly id: string }
export interface RoutineInput { readonly name: string; readonly unit: WeightUnit; readonly exercises: readonly RoutineExerciseInput[] }
export interface WorkoutRoutine extends RoutineInput { readonly id: string; readonly exercises: readonly RoutineExercise[] }
export interface WorkoutExercise extends RoutineTargets, ExerciseDetail { readonly id: string; readonly name: string; readonly sets: readonly WorkoutSet[] }
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
/** A planned target (reps at weight) for one exact exercise name, unit and bodyweight setting; never a logged set. */
export interface WorkoutGoalInput {
  readonly name: string;
  readonly unit: WeightUnit;
  readonly bodyweight?: boolean;
  readonly weight: number;
  readonly reps: number;
}
export interface WorkoutGoal extends Omit<WorkoutGoalInput, 'bodyweight'> {
  readonly id: string;
  readonly bodyweight?: true;
  /** Epoch milliseconds when the goal was created. */
  readonly createdAt: number;
}
export interface WorkoutData {
  readonly version: 2 | 3 | 4 | 5 | 6;
  readonly revision: number;
  readonly active: Workout | null;
  readonly history: readonly Workout[];
  /** Omitted when upgrading legacy data so exact-cap records do not grow on read. */
  readonly routines?: readonly WorkoutRoutine[];
  /** Schema5 goals; omitted until the first goal is created. */
  readonly goals?: readonly WorkoutGoal[];
  /** Schema6 body weight and measurements; omitted until the first entry. Never feeds workout metrics. */
  readonly bodyLog?: readonly BodyEntry[];
  /** Schema6 standing notes keyed by exact exercise name (no fuzzy matching); omitted until the first note. */
  readonly exerciseNotes?: Readonly<Record<string, string>>;
}
export type WorkoutResult = { ok: true } | { ok: false; message: string };
