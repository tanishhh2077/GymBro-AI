import type { WorkoutData } from '@/types/workout';

export class WorkoutError extends Error {
  constructor(readonly kind: 'validation' | 'storage' | 'conflict', message: string) {
    super(message); this.name = 'WorkoutError';
  }
}
export function emptyWorkoutData(): WorkoutData { return { version: 1, revision: 0, active: null, history: [] }; }

function requireValue(condition: unknown, message = 'Saved workout data is invalid or exceeds the supported limits.'): asserts condition {
  if (!condition) throw new WorkoutError('validation', message);
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value));
  const item = value as Record<string, unknown>;
  requireValue(Object.keys(item).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(item, key)));
  return item;
}
function name(value: unknown) {
  requireValue(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 80);
}
function identifier(value: unknown, seen: Set<string>) {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) && !seen.has(value));
  seen.add(value);
}
function timestamp(value: unknown) { requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15); }
export function validateSetValues(reps: number, weight: number): void {
  requireValue(Number.isInteger(reps) && reps >= 1 && reps <= 1000, 'Enter whole-number reps from 1 to 1000.');
  requireValue(Number.isFinite(weight) && weight >= 0 && weight <= 10000, 'Enter a weight from 0 to 10000. Use 0 for no added load.');
}
function workout(value: unknown, complete: boolean, ids: Set<string>) {
  const item = record(value, ['id', 'name', 'unit', 'startedAt', 'finishedAt', 'exercises']);
  identifier(item.id, ids); name(item.name); timestamp(item.startedAt);
  requireValue(item.unit === 'lb' || item.unit === 'kg');
  if (complete) {
    timestamp(item.finishedAt);
    requireValue((item.finishedAt as number) >= (item.startedAt as number));
  } else requireValue(item.finishedAt === null);
  requireValue(Array.isArray(item.exercises) && item.exercises.length <= 100 && (!complete || item.exercises.length > 0));
  const entries = new Set<string>();
  for (const value of item.exercises) {
    const exercise = record(value, ['id', 'name', 'sets']);
    identifier(exercise.id, entries); name(exercise.name);
    requireValue(Array.isArray(exercise.sets) && exercise.sets.length <= 100 && (!complete || exercise.sets.length > 0));
    for (const value of exercise.sets) {
      const set = record(value, ['id', 'reps', 'weight']); identifier(set.id, entries);
      requireValue(typeof set.reps === 'number' && typeof set.weight === 'number');
      validateSetValues(set.reps, set.weight);
    }
  }
}
/** Reject unknown fields as well as bad values; media/pose objects never cross this boundary. */
export function validateWorkoutData(value: unknown): WorkoutData {
  const item = record(value, ['version', 'revision', 'active', 'history']);
  requireValue(item.version === 1 && typeof item.revision === 'number' && Number.isSafeInteger(item.revision) && item.revision >= 0);
  requireValue(Array.isArray(item.history) && item.history.length <= 1000);
  const ids = new Set<string>();
  if (item.active !== null) workout(item.active, false, ids);
  for (const value of item.history) workout(value, true, ids);
  requireValue(JSON.stringify(value).length <= 1_000_000);
  return value as WorkoutData;
}
