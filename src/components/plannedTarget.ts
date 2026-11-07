import type { ExerciseDetail, RoutineTargets, WeightUnit } from '@/types/workout';
import { formatWeight } from '@/core/weightDisplay';
/** Planned values only; formatted apart from the logged-set table. A bodyweight target is added load, negative for assistance. */
export function plannedTarget(targets: RoutineTargets & ExerciseDetail, unit: WeightUnit) {
  return [targets.targetSets !== undefined ? `${targets.targetSets} sets` : '',
    targets.targetReps !== undefined ? `${targets.targetReps} reps per set` : '',
    targets.targetWeight !== undefined ? formatWeight(targets.targetWeight, unit, { bodyweight: targets.bodyweight === true }) : ''].filter(Boolean).join(' · ');
}
