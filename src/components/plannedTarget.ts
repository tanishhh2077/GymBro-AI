import type { RoutineTargets, WeightUnit } from '@/types/workout';
/** Planned values only; formatted apart from the logged-set table. */
export function plannedTarget(targets: RoutineTargets, unit: WeightUnit) {
  return [targets.targetSets !== undefined ? `${targets.targetSets} sets` : '',
    targets.targetReps !== undefined ? `${targets.targetReps} reps per set` : '',
    targets.targetWeight !== undefined ? `${targets.targetWeight} ${unit}` : ''].filter(Boolean).join(' · ');
}
