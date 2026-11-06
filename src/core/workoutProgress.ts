import type { WeightUnit, Workout } from '@/types/workout';
import type { ExerciseProgress, RecordedSet } from '@/types/progress';

interface ProgressAccumulator {
  key: string;
  name: string;
  unit: WeightUnit;
  bodyweight: boolean;
  loggedSetCount: number;
  heaviestSet: RecordedSet;
  mostRepsSet: RecordedSet;
  workouts: Map<string, RecordedSet>;
  repRecords: Map<number, RecordedSet>;
}

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareOccurrence(left: RecordedSet, right: RecordedSet): number {
  const timeOrder = left.finishedAt - right.finishedAt;
  if (timeOrder !== 0) return timeOrder;
  const leftSource = `${left.workoutId}/${left.exerciseId}/${left.setId}`;
  const rightSource = `${right.workoutId}/${right.exerciseId}/${right.setId}`;
  return compareText(leftSource, rightSource);
}

function compareHeaviestFirst(left: RecordedSet, right: RecordedSet): number {
  return right.weight - left.weight ||
    right.reps - left.reps ||
    compareOccurrence(left, right);
}

function compareMostRepsFirst(left: RecordedSet, right: RecordedSet): number {
  return right.reps - left.reps ||
    right.weight - left.weight ||
    compareOccurrence(left, right);
}

/** Consume validated history and retain the source of every derived record. */
export function buildWorkoutProgress(history: readonly Workout[]): readonly ExerciseProgress[] {
  const groups = new Map<string, ProgressAccumulator>();
  for (const sourceWorkout of history) {
    if (sourceWorkout.finishedAt === null) continue;
    for (const sourceExercise of sourceWorkout.exercises) {
      const bodyweight = sourceExercise.bodyweight === true;
      // Added bodyweight load is not comparable with an external load, so bodyweight entries form their own group.
      const key = JSON.stringify(bodyweight ? [sourceExercise.name, sourceWorkout.unit, 'bodyweight'] : [sourceExercise.name, sourceWorkout.unit]);
      for (const sourceSet of sourceExercise.sets) {
        if (sourceSet.kind === 'warmup') continue;
        const record: RecordedSet = {
          workoutId: sourceWorkout.id,
          workoutName: sourceWorkout.name,
          finishedAt: sourceWorkout.finishedAt,
          exerciseId: sourceExercise.id,
          setId: sourceSet.id,
          reps: sourceSet.reps,
          weight: sourceSet.weight,
        };
        let group = groups.get(key);
        if (!group) {
          group = {
            key,
            name: sourceExercise.name,
            unit: sourceWorkout.unit,
            bodyweight,
            loggedSetCount: 0,
            heaviestSet: record,
            mostRepsSet: record,
            workouts: new Map(),
            repRecords: new Map(),
          };
          groups.set(key, group);
        }
        group.loggedSetCount += 1;
        if (compareHeaviestFirst(record, group.heaviestSet) < 0) group.heaviestSet = record;
        if (compareMostRepsFirst(record, group.mostRepsSet) < 0) group.mostRepsSet = record;

        const workoutRecord = group.workouts.get(record.workoutId);
        if (!workoutRecord || compareHeaviestFirst(record, workoutRecord) < 0) {
          group.workouts.set(record.workoutId, record);
        }
        const weightRecord = group.repRecords.get(record.weight);
        if (!weightRecord || compareMostRepsFirst(record, weightRecord) < 0) {
          group.repRecords.set(record.weight, record);
        }
      }
    }
  }

  return Array.from(groups.values(), group => ({
    key: group.key,
    name: group.name,
    unit: group.unit,
    ...(group.bodyweight ? { bodyweight: true as const } : {}),
    loggedSetCount: group.loggedSetCount,
    heaviestSet: group.heaviestSet,
    mostRepsSet: group.mostRepsSet,
    workouts: Array.from(group.workouts.values()).sort(compareOccurrence),
    repRecords: Array.from(group.repRecords.values()).sort((left, right) => right.weight - left.weight),
  })).sort((left, right) => compareText(left.name, right.name) || compareText(left.unit, right.unit) ||
    Number(left.bodyweight === true) - Number(right.bodyweight === true));
}
