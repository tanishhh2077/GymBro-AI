import type { Workout, WorkoutData, WorkoutGoal, WorkoutRoutine } from '@/types/workout';
import { validateWorkoutData, WorkoutError } from './workouts';

export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;

export interface WorkoutBackup {
  readonly format: 'gymbro-ai-workout-backup';
  readonly version: 1;
  readonly exportedAt: number;
  readonly data: WorkoutData;
}
export interface BackupMerge {
  readonly data: WorkoutData;
  readonly addedWorkouts: number;
  readonly addedRoutines: number;
  readonly addedGoals: number;
  /** Incoming goals dropped because this library already has a goal for that exercise. */
  readonly skippedGoals: number;
  readonly addedActive: boolean;
  readonly duplicates: number;
}
function validateBackup(value: unknown): WorkoutBackup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkoutError('validation', 'Choose a GymBro AI workout backup JSON file.');
  }
  const item = value as Record<string, unknown>;
  const fields = ['format', 'version', 'exportedAt', 'data'];
  if (Object.keys(item).length !== fields.length || !fields.every(key => Object.prototype.hasOwnProperty.call(item, key)) ||
      item.format !== 'gymbro-ai-workout-backup' || item.version !== 1 ||
      typeof item.exportedAt !== 'number' || !Number.isSafeInteger(item.exportedAt) ||
      item.exportedAt < 0 || item.exportedAt > 8.64e15) {
    throw new WorkoutError('validation', 'This backup format or version is unsupported. Choose a valid GymBro AI backup.');
  }
  return { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: item.exportedAt,
    data: validateWorkoutData(item.data) };
}

export function createWorkoutBackup(data: WorkoutData, exportedAt: number): string {
  return JSON.stringify(validateBackup({ format: 'gymbro-ai-workout-backup', version: 1, exportedAt, data }));
}

export function parseWorkoutBackup(text: string): WorkoutBackup {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new WorkoutError('validation', 'Choose a backup file of at most 4 MiB.');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new WorkoutError('validation', 'The backup is not valid JSON. Choose another backup file.'); }
  return validateBackup(parsed);
}

// Known fields fix object-key order while retaining the meaningful order of arrays.
// Every stored record field must be listed, or a difference in it would be skipped as identical.
const recordFields = ['id', 'name', 'unit', 'startedAt', 'finishedAt', 'exercises',
  'sets', 'reps', 'weight', 'kind', 'targetSets', 'targetReps', 'targetWeight', 'note',
  'rpe', 'superset', 'bodyweight', 'createdAt'];

function mergeRecords<T extends Workout | WorkoutRoutine | WorkoutGoal>(current: readonly T[], incoming: readonly T[], label: string): T[] {
  const records = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) {
    const existing = records.get(item.id);
    if (existing && JSON.stringify(existing, recordFields) !== JSON.stringify(item, recordFields)) {
      throw new WorkoutError('validation', `Backup conflict for ${label} "${item.name}". Choose another backup. Saved records were kept.`);
    }
    if (!existing) records.set(item.id, item);
  }
  return [...records.values()];
}

export function mergeWorkoutBackup(current: WorkoutData, backup: WorkoutBackup): BackupMerge {
  const destination = validateWorkoutData(current);
  const incoming = validateBackup(backup).data;
  if (destination.active && incoming.active && destination.active.id !== incoming.active.id) {
    throw new WorkoutError('validation', 'The backup contains a different active workout. Finish or discard the current workout before restoring it.');
  }
  const workouts = mergeRecords(
    [...destination.history, ...(destination.active ? [destination.active] : [])],
    [...incoming.history, ...(incoming.active ? [incoming.active] : [])], 'workout');
  const routines = mergeRecords(destination.routines ?? [], incoming.routines ?? [], 'routine');
  // One goal per exercise: keep the destination's goal and report skipped incoming ones.
  const goalKey = (goal: WorkoutGoal) => JSON.stringify([goal.name, goal.unit, goal.bodyweight === true]);
  const ownKeys = new Map((destination.goals ?? []).map(goal => [goalKey(goal), goal.id]));
  const incomingGoals = (incoming.goals ?? []).filter(goal => (ownKeys.get(goalKey(goal)) ?? goal.id) === goal.id);
  const skippedGoals = (incoming.goals?.length ?? 0) - incomingGoals.length;
  const goals = mergeRecords(destination.goals ?? [], incomingGoals, 'goal');
  const active = workouts.find(item => item.finishedAt === null) ?? null;
  const history = workouts.filter(item => item.finishedAt !== null);
  const addedWorkouts = history.length - destination.history.length;
  const addedRoutines = routines.length - (destination.routines?.length ?? 0);
  const addedGoals = goals.length - (destination.goals?.length ?? 0);
  const addedActive = destination.active === null && active !== null;
  const duplicates = incoming.history.length + (incoming.routines?.length ?? 0) + incomingGoals.length +
    Number(incoming.active !== null) - addedWorkouts - addedRoutines - addedGoals - Number(addedActive);
  const data = addedWorkouts || addedRoutines || addedGoals || addedActive ? validateWorkoutData({
    ...destination, active, history, ...(routines.length ? { routines } : {}), ...(goals.length ? { goals } : {}),
  }) : destination;
  return { data, addedWorkouts, addedRoutines, addedGoals, skippedGoals, addedActive, duplicates };
}
