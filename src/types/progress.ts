import type { WeightUnit } from './workout';

export interface RecordedSet {
  readonly workoutId: string;
  readonly workoutName: string;
  readonly finishedAt: number;
  readonly exerciseId: string;
  readonly setId: string;
  readonly reps: number;
  readonly weight: number;
}

export interface ExerciseProgress {
  readonly key: string;
  readonly name: string;
  readonly unit: WeightUnit;
  readonly loggedSetCount: number;
  readonly heaviestSet: RecordedSet;
  readonly mostRepsSet: RecordedSet;
  /** One heaviest actual set per completed workout, ordered by finish time. */
  readonly workouts: readonly RecordedSet[];
  /** Best reps at each exact logged load, ordered heaviest first. */
  readonly repRecords: readonly RecordedSet[];
}
