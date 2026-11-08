import type { BodyMeasurementName } from '@/types/body';
import type { SetKind, WorkoutData } from '@/types/workout';

export const WORKOUT_SCHEMA_VERSION = 6;
export const MAX_BODY_ENTRIES = 1000;
export const MAX_EXERCISE_NOTES = 200;
/** The schema6 tape measurements, in display order. */
export const BODY_MEASUREMENT_NAMES: readonly BodyMeasurementName[] =
  ['neck', 'chest', 'waist', 'hips', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh'];

export class WorkoutError extends Error {
  constructor(readonly kind: 'validation' | 'storage' | 'conflict', message: string) {
    super(message); this.name = 'WorkoutError';
  }
}
export function emptyWorkoutData(): WorkoutData { return { version: 6, revision: 0, active: null, history: [] }; }

function requireValue(condition: unknown, message = 'Saved workout data is invalid or exceeds the supported limits.'): asserts condition {
  if (!condition) throw new WorkoutError('validation', message);
}
function record(value: unknown, keys: string[], optional: string[] = []): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value));
  const item = value as Record<string, unknown>;
  requireValue(Object.keys(item).every(key => keys.includes(key) || optional.includes(key)) &&
    keys.every(key => Object.prototype.hasOwnProperty.call(item, key)));
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
/** On a bodyweight exercise the weight is added load; a negative value records assistance. */
export function validateSetValues(reps: number, weight: number, bodyweight = false): void {
  requireValue(Number.isInteger(reps) && reps >= 1 && reps <= 1000, 'Enter whole-number reps from 1 to 1000.');
  if (bodyweight) {
    requireValue(Number.isFinite(weight) && weight >= -1000 && weight <= 10000,
      'Enter added weight from -1000 to 10000. Use 0 for bodyweight only and a negative number for assistance.');
  } else requireValue(Number.isFinite(weight) && weight >= 0 && weight <= 10000, 'Enter a weight from 0 to 10000. Use 0 for no added load.');
}
export function validateRpe(rpe: unknown): asserts rpe is number {
  requireValue(typeof rpe === 'number' && Number.isInteger(rpe * 2) && rpe >= 1 && rpe <= 10,
    'Enter an RPE from 1 to 10 in steps of 0.5, or leave it blank.');
}
export function validateGroupId(value: unknown): asserts value is string {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value), 'This superset label is invalid. Ungroup and group the exercises again.');
}
const supersetMessage = 'Keep each superset to two or more neighbouring exercises.';
/** A group ID must be shared by two or more exercises that sit next to each other. */
function supersets(exercises: readonly Record<string, unknown>[]) {
  const closed = new Set<string>();
  let current: string | null = null, size = 0;
  for (const exercise of [...exercises, {} as Record<string, unknown>]) {
    const group = Object.prototype.hasOwnProperty.call(exercise, 'superset') ? exercise.superset as string : null;
    if (group !== null && group === current) { size += 1; continue; }
    if (current !== null) { requireValue(size >= 2, supersetMessage); closed.add(current); }
    requireValue(group === null || !closed.has(group), supersetMessage);
    current = group; size = 1;
  }
}
function exerciseDetail(exercise: Record<string, unknown>) {
  if (Object.prototype.hasOwnProperty.call(exercise, 'superset')) validateGroupId(exercise.superset);
  if (Object.prototype.hasOwnProperty.call(exercise, 'bodyweight')) requireValue(exercise.bodyweight === true);
}
export function validateSetKind(kind: unknown): asserts kind is SetKind {
  requireValue(kind === 'regular' || kind === 'warmup', 'Choose Regular or Warm-up for this set.');
}
// Newline and tab are the only control characters a multi-line note needs.
const noteControl = /(?![\n\t])\p{Cc}/u;
function noteText(value: unknown, label: string, max: number): asserts value is string {
  requireValue(typeof value === 'string' && value.length > 0 && value.trim() === value);
  requireValue(value.length <= max, `Keep the ${label} to ${max} characters or fewer.`);
  requireValue(!noteControl.test(value), `Remove control characters from the ${label}. Line breaks and tabs are allowed.`);
  // An unpaired surrogate is valid in a JS string but rejected by the sync database.
  requireValue(!/\p{Cs}/u.test(value), `Remove unsupported characters from the ${label}.`);
}
export function validateWorkoutNote(value: unknown): asserts value is string { noteText(value, 'workout note', 1000); }
export function validateExerciseNote(value: unknown): asserts value is string { noteText(value, 'exercise note', 500); }
export function validateBodyNote(value: unknown): asserts value is string { noteText(value, 'body log note', 500); }
const own = (item: object, key: string) => Object.prototype.hasOwnProperty.call(item, key);
const bodyFields = ['weight', 'unit', 'measurements', 'lengthUnit', 'note'];
/** A unit appears exactly when its values do, so a stored unit never describes a missing value. */
function bodyValues(item: Record<string, unknown>) {
  requireValue(typeof item.date === 'number' && Number.isSafeInteger(item.date) && item.date >= 0 && item.date <= 8.64e15,
    'Choose a valid date for this body log entry.');
  requireValue(own(item, 'weight') || own(item, 'measurements'), 'Enter a body weight or at least one measurement for this entry.');
  if (own(item, 'weight')) {
    requireValue(typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight > 0 && item.weight <= 1000,
      'Enter a body weight greater than 0 and at most 1000.');
    requireValue(item.unit === 'kg' || item.unit === 'lb', 'Choose kg or lb for the body weight.');
  } else requireValue(!own(item, 'unit'), 'Choose kg or lb only with a body weight.');
  if (own(item, 'measurements')) {
    const values = item.measurements;
    requireValue(values !== null && typeof values === 'object' && !Array.isArray(values), 'Enter the measurements as named values.');
    const names = Object.keys(values);
    requireValue(names.length > 0, 'Enter at least one measurement, or leave measurements out.');
    for (const name of names) {
      requireValue((BODY_MEASUREMENT_NAMES as readonly string[]).includes(name),
        `Unknown body measurement "${name.slice(0, 40)}". Use ${BODY_MEASUREMENT_NAMES.join(', ')}.`);
      const value = (values as Record<string, unknown>)[name];
      requireValue(typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 500,
        'Enter each measurement greater than 0 and at most 500.');
    }
    requireValue(item.lengthUnit === 'cm' || item.lengthUnit === 'in', 'Choose cm or in for the measurements.');
  } else requireValue(!own(item, 'lengthUnit'), 'Choose cm or in only with measurements.');
  if (own(item, 'note')) validateBodyNote(item.note);
}
function bodyLog(value: unknown) {
  requireValue(Array.isArray(value) && value.length <= MAX_BODY_ENTRIES, `Save up to ${MAX_BODY_ENTRIES} body log entries on this device.`);
  const ids = new Set<string>();
  for (const entry of value) {
    const item = record(entry, ['id', 'date'], bodyFields);
    identifier(item.id, ids); bodyValues(item);
  }
}
/** Keys are exact exercise names, so a note follows only that spelling, like Progress groups. */
function exerciseNotes(value: unknown) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'Save exercise notes as exercise names with notes.');
  const entries = Object.entries(value);
  requireValue(entries.length <= MAX_EXERCISE_NOTES, `Save notes for up to ${MAX_EXERCISE_NOTES} exercises on this device.`);
  for (const [key, note] of entries) {
    requireValue(key.length > 0 && key.length <= 80 && key.trim() === key, 'Each exercise note needs an exercise name with 1 to 80 characters.');
    requireValue(!/\p{Cs}/u.test(key), 'Remove unsupported characters from the exercise name.');
    validateExerciseNote(note);
  }
}
function targets(item: Record<string, unknown>) {
  // A bodyweight target is added load, so a negative value plans assistance.
  if (Object.prototype.hasOwnProperty.call(item, 'targetWeight')) requireValue(typeof item.targetWeight === 'number' &&
    Number.isFinite(item.targetWeight) && item.targetWeight >= (item.bodyweight === true ? -1000 : 0) && item.targetWeight <= 10000,
  item.bodyweight === true ? 'Enter a target added weight from -1000 to 10000, or leave it blank.'
    : 'Enter a target weight from 0 to 10000, or leave it blank.');
  for (const [key, max] of [['targetSets', 100], ['targetReps', 1000]] as const) {
    if (Object.prototype.hasOwnProperty.call(item, key)) requireValue(typeof item[key] === 'number' &&
      Number.isInteger(item[key]) && item[key] >= 1 && item[key] <= max,
    `Enter a whole-number ${key === 'targetSets' ? 'set' : 'rep'} target from 1 to ${max}, or leave it blank.`);
  }
}
function targetFields(version: number) {
  return [...(version >= 4 ? ['targetSets', 'targetReps', 'targetWeight'] : version >= 2 ? ['targetSets', 'targetReps'] : []),
    ...(version >= 5 ? ['superset', 'bodyweight'] : [])];
}
function goals(value: unknown) {
  requireValue(Array.isArray(value) && value.length <= 100, 'Save up to 100 goals on this device.');
  const ids = new Set<string>(), keys = new Set<string>();
  for (const entry of value) {
    const goal = record(entry, ['id', 'name', 'unit', 'weight', 'reps', 'createdAt'], ['bodyweight']);
    identifier(goal.id, ids); name(goal.name); timestamp(goal.createdAt);
    requireValue(goal.unit === 'lb' || goal.unit === 'kg');
    if (Object.prototype.hasOwnProperty.call(goal, 'bodyweight')) requireValue(goal.bodyweight === true);
    requireValue(typeof goal.reps === 'number' && typeof goal.weight === 'number');
    validateSetValues(goal.reps, goal.weight, goal.bodyweight === true);
    const key = JSON.stringify([goal.name, goal.unit, goal.bodyweight === true]);
    requireValue(!keys.has(key), `There are two goals for "${goal.name as string}" (${goal.unit}${goal.bodyweight ? ', bodyweight' : ''}). ` +
      'Keep one goal for each exercise, unit and bodyweight setting.');
    keys.add(key);
  }
}
function workout(value: unknown, complete: boolean, ids: Set<string>, version: number) {
  const item = record(value, ['id', 'name', 'unit', 'startedAt', 'finishedAt', 'exercises'], version >= 4 ? ['note'] : []);
  identifier(item.id, ids); name(item.name); timestamp(item.startedAt);
  if (Object.prototype.hasOwnProperty.call(item, 'note')) validateWorkoutNote(item.note);
  requireValue(item.unit === 'lb' || item.unit === 'kg');
  if (complete) {
    timestamp(item.finishedAt);
    requireValue((item.finishedAt as number) >= (item.startedAt as number));
  } else requireValue(item.finishedAt === null);
  requireValue(Array.isArray(item.exercises) && item.exercises.length <= 100 && (!complete || item.exercises.length > 0));
  const entries = new Set<string>();
  for (const value of item.exercises) {
    const exercise = record(value, ['id', 'name', 'sets'], targetFields(version));
    identifier(exercise.id, entries); name(exercise.name);
    targets(exercise); exerciseDetail(exercise);
    requireValue(Array.isArray(exercise.sets) && exercise.sets.length <= 100 && (!complete || exercise.sets.length > 0));
    for (const value of exercise.sets) {
      const set = record(value, ['id', 'reps', 'weight'], [...(version >= 3 ? ['kind'] : []), ...(version >= 5 ? ['rpe'] : [])]);
      identifier(set.id, entries);
      requireValue(typeof set.reps === 'number' && typeof set.weight === 'number');
      validateSetValues(set.reps, set.weight, exercise.bodyweight === true);
      if (Object.prototype.hasOwnProperty.call(set, 'kind')) validateSetKind(set.kind);
      if (Object.prototype.hasOwnProperty.call(set, 'rpe')) validateRpe(set.rpe);
    }
  }
  supersets(item.exercises as Record<string, unknown>[]);
}
/** Reject unknown fields as well as bad values; media/pose objects never cross this boundary. */
export function validateWorkoutData(value: unknown): WorkoutData {
  const version = value !== null && typeof value === 'object' ? (value as Record<string, unknown>).version : undefined;
  const known = version === 1 || version === 2 || version === 3 || version === 4 || version === 5 || version === 6;
  const item = record(value, ['version', 'revision', 'active', 'history'],
    version === 6 ? ['routines', 'goals', 'bodyLog', 'exerciseNotes'] : version === 5 ? ['routines', 'goals']
      : known && version !== 1 ? ['routines'] : []);
  requireValue(known && typeof item.revision === 'number' && Number.isSafeInteger(item.revision) && item.revision >= 0);
  requireValue(Array.isArray(item.history) && item.history.length <= 1000);
  const ids = new Set<string>();
  if (item.active !== null) workout(item.active, false, ids, version);
  for (const value of item.history) workout(value, true, ids, version);
  if (Object.prototype.hasOwnProperty.call(item, 'routines')) {
    requireValue(Array.isArray(item.routines) && item.routines.length <= 100, 'Save up to 100 routines on this device.');
    const routineIds = new Set<string>();
    for (const value of item.routines) {
      const routine = record(value, ['id', 'name', 'unit', 'exercises']);
      identifier(routine.id, routineIds); name(routine.name);
      requireValue(routine.unit === 'lb' || routine.unit === 'kg');
      requireValue(Array.isArray(routine.exercises) && routine.exercises.length >= 1 && routine.exercises.length <= 100,
        'Add 1 to 100 named exercises to each routine.');
      const exerciseIds = new Set<string>();
      for (const value of routine.exercises) {
        const exercise = record(value, ['id', 'name'], targetFields(version));
        identifier(exercise.id, exerciseIds); name(exercise.name); targets(exercise); exerciseDetail(exercise);
      }
      supersets(routine.exercises as Record<string, unknown>[]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(item, 'goals')) goals(item.goals);
  if (own(item, 'bodyLog')) bodyLog(item.bodyLog);
  if (own(item, 'exerciseNotes')) exerciseNotes(item.exerciseNotes);
  requireValue(JSON.stringify(value).length <= 1_000_000);
  // No defaults or writes: a valid legacy record at the size cap stays readable.
  return (version === WORKOUT_SCHEMA_VERSION ? value : { ...item, version: WORKOUT_SCHEMA_VERSION }) as WorkoutData;
}
