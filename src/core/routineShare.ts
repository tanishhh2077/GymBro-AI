import type { RoutineExerciseInput, RoutineInput, WeightUnit, WorkoutRoutine } from '@/types/workout';
import { WorkoutError } from './workouts';

export const ROUTINE_SHARE_FORMAT = 'gymbro-ai-routine' as const;
export const ROUTINE_SHARE_VERSION = 2 as const;
export const MAX_ROUTINE_SHARE_BYTES = 64 * 1024; // 64 KiB

export interface RoutineShareExercise {
  readonly name: string;
  readonly targetSets?: number;
  readonly targetReps?: number;
  readonly targetWeight?: number;
  readonly superset?: boolean | number;
  readonly bodyweight?: boolean;
}

export interface RoutineShareData {
  readonly name: string;
  readonly unit: WeightUnit;
  readonly exercises: readonly RoutineShareExercise[];
}

export interface RoutineShareFile {
  readonly format: typeof ROUTINE_SHARE_FORMAT;
  readonly version: typeof ROUTINE_SHARE_VERSION;
  readonly routine: RoutineShareData;
}

export function routineShareFilename(routineName: string): string {
  const slug = routineName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'routine';
  return `gymbro-routine-${slug}.json`;
}

function requireValidation(condition: unknown, message: string): asserts condition {
  if (!condition) throw new WorkoutError('validation', message);
}

function validateName(value: unknown, label: string): asserts value is string {
  requireValidation(
    typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 80,
    `${label} must be 1 to 80 characters with no leading or trailing whitespace.`,
  );
  requireValidation(!/\p{Cs}/u.test(value), `Remove unsupported characters from the ${label.toLowerCase()}.`);
}

function validateTargets(item: Record<string, unknown>, isBodyweight: boolean) {
  if (Object.prototype.hasOwnProperty.call(item, 'targetSets')) {
    requireValidation(
      typeof item.targetSets === 'number' && Number.isInteger(item.targetSets) && item.targetSets >= 1 && item.targetSets <= 100,
      'Enter a whole-number set target from 1 to 100, or leave it blank.',
    );
  }
  if (Object.prototype.hasOwnProperty.call(item, 'targetReps')) {
    requireValidation(
      typeof item.targetReps === 'number' && Number.isInteger(item.targetReps) && item.targetReps >= 1 && item.targetReps <= 1000,
      'Enter a whole-number rep target from 1 to 1000, or leave it blank.',
    );
  }
  if (Object.prototype.hasOwnProperty.call(item, 'targetWeight')) {
    requireValidation(
      typeof item.targetWeight === 'number' &&
        Number.isFinite(item.targetWeight) &&
        item.targetWeight >= (isBodyweight ? -1000 : 0) &&
        item.targetWeight <= 10000,
      isBodyweight
        ? 'Enter a target added weight from -1000 to 10000, or leave it blank.'
        : 'Enter a target weight from 0 to 10000, or leave it blank.',
    );
  }
}

export function createRoutineShare(routine: WorkoutRoutine): string {
  requireValidation(routine && typeof routine === 'object', 'Routine must be an object.');
  validateName(routine.name, 'Routine name');
  requireValidation(routine.unit === 'lb' || routine.unit === 'kg', 'Routine unit must be "lb" or "kg".');
  requireValidation(
    Array.isArray(routine.exercises) && routine.exercises.length >= 1 && routine.exercises.length <= 100,
    'Add 1 to 100 named exercises to each routine.',
  );

  const groups = new Map<string, number>();
  const exercises: RoutineShareExercise[] = routine.exercises.map(exercise => {
    validateName(exercise.name, 'Exercise name');
    const isBodyweight = exercise.bodyweight === true;
    validateTargets(exercise as Record<string, unknown>, isBodyweight);

    if (exercise.superset && !groups.has(exercise.superset)) groups.set(exercise.superset, groups.size + 1);
    const shareEx: RoutineShareExercise = {
      name: exercise.name,
      ...(exercise.targetSets !== undefined ? { targetSets: exercise.targetSets } : {}),
      ...(exercise.targetReps !== undefined ? { targetReps: exercise.targetReps } : {}),
      ...(exercise.targetWeight !== undefined ? { targetWeight: exercise.targetWeight } : {}),
      ...(exercise.superset !== undefined && exercise.superset !== '' ? { superset: groups.get(exercise.superset) } : {}),
      ...(exercise.bodyweight ? { bodyweight: true } : {}),
    };
    return shareEx;
  });

  const payload: RoutineShareFile = {
    format: ROUTINE_SHARE_FORMAT,
    version: ROUTINE_SHARE_VERSION,
    routine: {
      name: routine.name,
      unit: routine.unit,
      exercises,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export function parseRoutineShare(text: string): RoutineInput {
  requireValidation(typeof text === 'string', 'Routine share content must be a string.');
  requireValidation(
    text.length <= MAX_ROUTINE_SHARE_BYTES && new TextEncoder().encode(text).byteLength <= MAX_ROUTINE_SHARE_BYTES,
    'Choose a routine file of at most 64 KiB.',
  );
  requireValidation(text.trim().length > 0, 'The routine file is empty. Choose a valid routine file.');
  requireValidation(!/\p{Cs}/u.test(text), 'The routine file contains invalid UTF-8 characters. Choose another file.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WorkoutError('validation', 'The routine file is not valid JSON. Choose another file.');
  }

  requireValidation(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed), 'The routine file must be a JSON object.');
  const envelope = parsed as Record<string, unknown>;

  const envelopeKeys = Object.keys(envelope);
  const expectedEnvelopeKeys = ['format', 'version', 'routine'];
  requireValidation(
    envelopeKeys.length === expectedEnvelopeKeys.length &&
      expectedEnvelopeKeys.every(k => Object.prototype.hasOwnProperty.call(envelope, k)),
    'The routine file envelope contains unknown or missing fields.',
  );

  requireValidation(
    envelope.format === ROUTINE_SHARE_FORMAT && (envelope.version === 1 || envelope.version === ROUTINE_SHARE_VERSION),
    'This routine format or version is unsupported. Choose a valid GymBro AI routine file.',
  );

  requireValidation(
    envelope.routine !== null && typeof envelope.routine === 'object' && !Array.isArray(envelope.routine),
    'The routine property must be a JSON object.',
  );
  const routineObj = envelope.routine as Record<string, unknown>;

  const routineKeys = Object.keys(routineObj);
  const expectedRoutineKeys = ['name', 'unit', 'exercises'];
  requireValidation(
    routineKeys.length === expectedRoutineKeys.length &&
      expectedRoutineKeys.every(k => Object.prototype.hasOwnProperty.call(routineObj, k)),
    'The routine object contains unknown or missing fields.',
  );

  validateName(routineObj.name, 'Routine name');
  requireValidation(routineObj.unit === 'lb' || routineObj.unit === 'kg', 'Routine unit must be "lb" or "kg".');
  requireValidation(
    Array.isArray(routineObj.exercises) && routineObj.exercises.length >= 1 && routineObj.exercises.length <= 100,
    'Add 1 to 100 named exercises to each routine.',
  );

  const allowedExerciseKeys = new Set(['name', 'targetSets', 'targetReps', 'targetWeight', 'superset', 'bodyweight']);
  const rawExercises = routineObj.exercises as unknown[];

  for (let i = 0; i < rawExercises.length; i++) {
    const raw = rawExercises[i];
    requireValidation(raw !== null && typeof raw === 'object' && !Array.isArray(raw), `Exercise ${i + 1} must be an object.`);
    const ex = raw as Record<string, unknown>;
    const keys = Object.keys(ex);
    for (const k of keys) {
      requireValidation(allowedExerciseKeys.has(k), `Exercise ${i + 1} contains unknown field "${k}".`);
    }

    requireValidation(Object.prototype.hasOwnProperty.call(ex, 'name'), `Exercise ${i + 1} is missing a name.`);
    validateName(ex.name, `Exercise ${i + 1} name`);

    if (Object.prototype.hasOwnProperty.call(ex, 'bodyweight')) {
      requireValidation(typeof ex.bodyweight === 'boolean', `Exercise ${i + 1} bodyweight setting must be a boolean.`);
    }
    const isBodyweight = ex.bodyweight === true;

    validateTargets(ex, isBodyweight);

    if (Object.prototype.hasOwnProperty.call(ex, 'superset')) {
      requireValidation(envelope.version === 1 ? typeof ex.superset === 'boolean' : Number.isSafeInteger(ex.superset) && (ex.superset as number) >= 1 && (ex.superset as number) <= 50,
        `Exercise ${i + 1} superset setting must be ${envelope.version === 1 ? 'a boolean' : 'a group number from 1 to 50'}.`);
    }
  }

  // v1 boolean runs remain readable. v2 group numbers preserve adjacent pairs.
  const groupIds: (string | undefined)[] = new Array(rawExercises.length).fill(undefined);
  const seenGroups = new Set<number | boolean>();
  let groupNumber = 0;
  for (let start = 0; start < rawExercises.length;) {
    const token = (rawExercises[start] as RoutineShareExercise).superset;
    if (!token) { start++; continue; }
    let end = start + 1;
    while (end < rawExercises.length && (rawExercises[end] as RoutineShareExercise).superset === token) end++;
    requireValidation(end - start >= 2, 'Keep each superset to two or more neighbouring exercises.');
    requireValidation(envelope.version === 1 || !seenGroups.has(token), 'Keep each superset group together in neighbouring exercises.');
    seenGroups.add(token);
    const group = `share-group-${++groupNumber}`;
    for (let index = start; index < end; index++) groupIds[index] = group;
    start = end;
  }

  const exercises: RoutineExerciseInput[] = rawExercises.map((raw, idx) => {
    const ex = raw as Record<string, unknown>;
    const item: RoutineExerciseInput = {
      name: ex.name as string,
      ...(ex.targetSets !== undefined ? { targetSets: ex.targetSets as number } : {}),
      ...(ex.targetReps !== undefined ? { targetReps: ex.targetReps as number } : {}),
      ...(ex.targetWeight !== undefined ? { targetWeight: ex.targetWeight as number } : {}),
      ...(groupIds[idx] ? { superset: groupIds[idx] } : {}),
      ...(ex.bodyweight === true ? { bodyweight: true as const } : {}),
    };
    return item;
  });

  return {
    name: routineObj.name as string,
    unit: routineObj.unit as WeightUnit,
    exercises,
  };
}

export async function readRoutineShareFile(file: File, signal?: AbortSignal): Promise<RoutineInput> {
  if (signal?.aborted) throw new DOMException('Routine selection cancelled', 'AbortError');
  if (!/\.json$/i.test(file.name) || file.size === 0 || file.size > MAX_ROUTINE_SHARE_BYTES) {
    throw new WorkoutError('validation', 'Choose a nonempty .json routine file of at most 64 KiB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;

    function finish(error?: unknown, result?: RoutineInput) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
      if (result) resolve(result);
      else reject(error);
    }

    function cancel() {
      finish(new DOMException('Routine selection cancelled', 'AbortError'));
    }

    const timer = setTimeout(
      () => finish(new WorkoutError('validation', 'Reading the routine file timed out. Choose the file again.')),
      10_000,
    );

    signal?.addEventListener('abort', cancel, { once: true });
    reader.onerror = () => finish(new WorkoutError('validation', 'The routine file could not be read. Choose it again.'));
    reader.onabort = cancel;
    reader.onload = () => {
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(reader.result as ArrayBuffer);
      } catch {
        finish(new WorkoutError('validation', 'The routine file is not valid UTF-8 text. Choose another file.'));
        return;
      }
      try {
        finish(undefined, parseRoutineShare(text));
      } catch (error) {
        finish(error);
      }
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch {
      finish(new WorkoutError('validation', 'The routine file could not be opened. Choose it again.'));
    }
  });
}
