import { createStore } from 'zustand/vanilla';
import { BODY_MEASUREMENT_NAMES, emptyWorkoutData, MAX_BODY_ENTRIES, MAX_EXERCISE_NOTES, validateBodyNote, validateExerciseNote, validateGroupId, validateRpe, validateSetKind, validateSetValues, validateWorkoutData, validateWorkoutNote, WorkoutError } from '@/core/workouts';
import type { RoutineExerciseInput, RoutineInput, SetKind, WeightUnit, Workout, WorkoutData, WorkoutExercise, WorkoutGoal, WorkoutGoalInput, WorkoutResult, WorkoutRoutine, WorkoutSet } from '@/types/workout';
import { createWorkoutRepository, type WorkoutRepository, type SyncedWorkoutRepository } from './workoutRepository';
import { mergeWorkoutBackup, type WorkoutBackup } from '@/core/workoutBackup';
import type { BodyEntry, BodyEntryInput } from '@/types/body';
import { hasSyncConflicts, mergeWorkoutSync, sameSyncData, syncSnapshot, validateSharedSnapshot, type SyncChoice, type SyncPreview, type WorkoutCloud } from '@/core/workoutSync';
interface WorkoutDeps { id: () => string; now: () => number }
export interface CompletedWorkoutCorrection {
  name: string;
  /** rpe: omitted keeps the saved rating, null clears it, a number replaces it. */
  exercises: readonly { id: string; sets: readonly { id: string; reps: number; weight: number; kind?: SetKind; rpe?: number | null }[] }[];
}
export interface WorkoutState {
  data: WorkoutData; loaded: boolean; busy: boolean; needsReload: boolean; error: string | null;
  load: () => Promise<WorkoutResult>;
  startWorkout: (name: string, unit: WeightUnit) => Promise<WorkoutResult>;
  addExercise: (name: string) => Promise<WorkoutResult>;
  removeExercise: (id: string) => Promise<WorkoutResult>;
  /** Moves a superset as one unit and steps over a neighbouring superset as one unit. */
  moveExercise: (exerciseId: string, direction: 'up' | 'down') => Promise<WorkoutResult>;
  /** Groups two or more neighbouring, ungrouped active exercises under a fresh superset ID. */
  groupSuperset: (exerciseIds: readonly string[]) => Promise<WorkoutResult>;
  ungroupSuperset: (groupId: string) => Promise<WorkoutResult>;
  /** Bodyweight sets store added load; negative weight is assistance. Switching off is refused while a set is negative. */
  setExerciseBodyweight: (exerciseId: string, on: boolean) => Promise<WorkoutResult>;
  /** rpe is optional; omitted means no rating. */
  addSet: (exerciseId: string, reps: number, weight: number, kind?: SetKind, rpe?: number) => Promise<WorkoutResult>;
  /** Omitted kind or rpe keeps the saved value; rpe null clears the rating. */
  updateSet: (exerciseId: string, setId: string, reps: number, weight: number, kind?: SetKind, rpe?: number | null) => Promise<WorkoutResult>;
  removeSet: (exerciseId: string, setId: string) => Promise<WorkoutResult>;
  finishWorkout: () => Promise<WorkoutResult>;
  discardWorkout: () => Promise<WorkoutResult>;
  deleteWorkout: (id: string) => Promise<WorkoutResult>;
  /** Sets the note on the active or a finished workout; blank text removes it. */
  /** Pass the revision the editor opened with so a newer note is never overwritten. */
  setWorkoutNote: (workoutId: string, note: string, expectedRevision?: number) => Promise<WorkoutResult>;
  /** Starts a fresh active workout with a finished workout's exercises and targets but no sets. */
  repeatWorkout: (workoutId: string) => Promise<WorkoutResult>;
  correctCompletedWorkout: (id: string, expectedRevision: number, input: CompletedWorkoutCorrection) => Promise<WorkoutResult>;
  createRoutine: (input: RoutineInput) => Promise<WorkoutResult>;
  duplicateRoutine: (id: string) => Promise<WorkoutResult>;
  updateRoutine: (id: string, expectedRevision: number, input: RoutineInput) => Promise<WorkoutResult>;
  deleteRoutine: (id: string) => Promise<WorkoutResult>;
  startRoutine: (id: string) => Promise<WorkoutResult>;
  createGoal: (input: WorkoutGoalInput) => Promise<WorkoutResult>;
  /** Pass the revision the goal editor opened with so a newer goal is never overwritten. */
  updateGoal: (id: string, expectedRevision: number, input: WorkoutGoalInput) => Promise<WorkoutResult>;
  deleteGoal: (id: string) => Promise<WorkoutResult>;
  /** Blank weight or measurements drop their unit selector; at most 1000 entries. */
  addBodyEntry: (input: BodyEntryInput) => Promise<WorkoutResult>;
  /** Replaces every field but the ID. Pass the revision the editor opened with. */
  updateBodyEntry: (id: string, expectedRevision: number, input: BodyEntryInput) => Promise<WorkoutResult>;
  deleteBodyEntry: (id: string) => Promise<WorkoutResult>;
  /** Note for one exact (trimmed) exercise name; blank removes it, same text is a no-op. */
  setExerciseNote: (name: string, note: string, expectedRevision?: number) => Promise<WorkoutResult>;
  restoreBackup: (backup: WorkoutBackup, expectedRevision: number) => Promise<WorkoutResult>;
  previewSync: (cloud: WorkoutCloud) => Promise<SyncPreview>;
  confirmSync: (preview: SyncPreview, choices: Readonly<Record<string, SyncChoice>>, cloud: WorkoutCloud) => Promise<WorkoutResult>;
}
const browserDeps: WorkoutDeps = {
  // getRandomValues also works on the trusted HTTP LAN used for phone testing.
  id: () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''),
  now: () => Date.now(),
};
function invalid(message: string): never { throw new WorkoutError('validation', message); }
function cleanName(value: string) {
  const name = value.trim();
  if (!name || name.length > 80) invalid('Enter a name with 1 to 80 characters.');
  return name;
}
function noteInput(note: unknown, label: string): string {
  if (typeof note !== 'string') invalid(`Enter the ${label} as text.`);
  return note.replace(/\r\n?/g, '\n').trim();
}
/** Store-side input cleanup; validateWorkoutData then checks the stored entry strictly. */
function preparedBodyEntry(id: string, input: BodyEntryInput): BodyEntry {
  if (!input || typeof input !== 'object') invalid('Enter a date and a body weight or measurement for this entry.');
  const measurements = input.measurements !== undefined && input.measurements !== null && typeof input.measurements === 'object'
    ? Object.fromEntries(Object.entries(input.measurements).filter(([, value]) => value !== undefined)) : input.measurements;
  const hasMeasurements = measurements !== undefined && !(typeof measurements === 'object' && measurements !== null && !Object.keys(measurements).length);
  if (hasMeasurements && typeof measurements === 'object' && measurements !== null) {
    for (const [name, value] of Object.entries(measurements)) {
      if (!(BODY_MEASUREMENT_NAMES as readonly string[]).includes(name)) invalid(`Unknown body measurement "${name.slice(0, 40)}". Use ${BODY_MEASUREMENT_NAMES.join(', ')}.`);
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 500) invalid('Enter each measurement greater than 0 and at most 500.');
    }
  }
  const note = input.note === undefined ? '' : noteInput(input.note, 'body log note');
  if (note) validateBodyNote(note);
  return { id, date: input.date,
    ...(input.weight !== undefined ? { weight: input.weight, ...(input.unit !== undefined ? { unit: input.unit } : {}) } : {}),
    ...(hasMeasurements ? { measurements: measurements as BodyEntry['measurements'], ...(input.lengthUnit !== undefined ? { lengthUnit: input.lengthUnit } : {}) } : {}),
    ...(note ? { note } : {}) };
}
function active(data: WorkoutData): Workout {
  if (!data.active) invalid('Start a workout first.');
  return data.active;
}
function without<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy = { ...value }; delete copy[key]; return copy;
}
function setRpe(set: WorkoutSet, rpe: number | null | undefined): WorkoutSet {
  if (rpe === undefined) return set;
  if (rpe === null) return without(set, 'rpe');
  validateRpe(rpe);
  return { ...set, rpe };
}
/** The index range of the superset containing `index`, or just that exercise when it is not grouped. */
function unit(exercises: readonly WorkoutExercise[], index: number): [number, number] {
  const group = exercises[index].superset;
  let start = index, end = index;
  if (group === undefined) return [start, end];
  while (start > 0 && exercises[start - 1].superset === group) start -= 1;
  while (end < exercises.length - 1 && exercises[end + 1].superset === group) end += 1;
  return [start, end];
}
function editExercise(data: WorkoutData, id: string, change: (value: WorkoutExercise) => WorkoutExercise): WorkoutData {
  const draft = active(data);
  if (!draft.exercises.some(e => e.id === id)) invalid('This exercise is no longer in the active workout.');
  return { ...data, active: { ...draft, exercises: draft.exercises.map(e => e.id === id ? change(e) : e) } };
}
export function createWorkoutStore(repository: WorkoutRepository, deps: WorkoutDeps = browserDeps) {
  /** Copies give every superset a fresh ID so later edits never touch the source's group. */
  function freshGroups() {
    const groups = new Map<string, string>();
    return <T extends { readonly superset?: string; readonly bodyweight?: boolean }>(value: T) => {
      const { superset, bodyweight, ...rest } = value;
      if (bodyweight !== undefined && typeof bodyweight !== 'boolean') invalid('Choose whether this exercise is bodyweight.');
      if (superset !== undefined) validateGroupId(superset);
      if (superset !== undefined && !groups.has(superset)) groups.set(superset, deps.id());
      return { ...rest, ...(superset !== undefined ? { superset: groups.get(superset)! } : {}), ...(bodyweight ? { bodyweight: true as const } : {}) };
    };
  }
  function preparedRoutine(id: string, input: RoutineInput): WorkoutRoutine {
    if (!Array.isArray(input.exercises) || !input.exercises.length || input.exercises.length > 100) invalid('Add 1 to 100 named exercises to each routine.');
    const copy = freshGroups();
    return { ...input, id, name: cleanName(input.name),
      exercises: input.exercises.map((e: RoutineExerciseInput) => ({ ...copy(e), id: deps.id(), name: cleanName(e.name) })) };
  }
  function preparedGoal(data: WorkoutData, id: string, createdAt: number, input: WorkoutGoalInput): WorkoutGoal {
    if (!input || typeof input !== 'object') invalid('Enter an exercise, unit, weight and reps for this goal.');
    const name = cleanName(typeof input.name === 'string' ? input.name : '');
    if (input.unit !== 'kg' && input.unit !== 'lb') invalid('Choose kg or lb for this goal.');
    if (input.bodyweight !== undefined && typeof input.bodyweight !== 'boolean') invalid('Choose whether this goal is for a bodyweight exercise.');
    const bodyweight = input.bodyweight === true;
    validateSetValues(input.reps, input.weight, bodyweight);
    if (data.goals?.some(g => g.id !== id && g.name === name && g.unit === input.unit && (g.bodyweight === true) === bodyweight)) {
      invalid(`You already have a goal for "${name}" in ${input.unit}${bodyweight ? ' (bodyweight)' : ''}. Edit that goal instead.`);
    }
    return { id, name, unit: input.unit, ...(bodyweight ? { bodyweight: true as const } : {}), weight: input.weight, reps: input.reps, createdAt };
  }
  function goal(data: WorkoutData, id: string): WorkoutGoal {
    const found = data.goals?.find(g => g.id === id);
    if (!found) invalid('This goal is no longer available. Reopen goals to continue.');
    return found;
  }
  function routine(data: WorkoutData, id: string): WorkoutRoutine {
    const found = data.routines?.find(r => r.id === id);
    if (!found) invalid('This routine is no longer available. Reopen routines to continue.');
    return found;
  }
  return createStore<WorkoutState>()((set, get) => {
    let loading: Promise<WorkoutResult> | null = null;
    const blocked = (message: string): WorkoutResult => ({ ok: false, message });
    async function commit(change: (data: WorkoutData) => WorkoutData,
      save = repository.save): Promise<WorkoutResult> {
      const current = get();
      if (current.busy) return blocked('Wait for the current save or load to finish.');
      if (!current.loaded || current.needsReload) return blocked('Reload saved workouts before editing.');
      set({ busy: true, error: null });
      let writing = false;
      try {
        const next = validateWorkoutData(change(current.data));
        if (next === current.data) { set({ busy: false }); return { ok: true }; }
        writing = true;
        const saved = await save(current.data.revision, next);
        set({ data: saved, busy: false, error: null, needsReload: false });
        return { ok: true };
      } catch (error) {
        const message = error instanceof WorkoutError ? error.message :
          writing ? 'The save could not be confirmed. Reload saved workouts before trying again.' : 'The workout could not be prepared. Try again.';
        set({ busy: false, error: message, needsReload: writing && !(error instanceof WorkoutError && error.kind === 'validation') });
        return blocked(message);
      }
    }
    function load(): Promise<WorkoutResult> {
      if (loading) return loading;
      if (get().busy) return Promise.resolve(blocked('Wait for the current save to finish.'));
      set({ busy: true, error: null });
      loading = (async (): Promise<WorkoutResult> => {
        try {
          const data = validateWorkoutData(await repository.load());
          set({ data, loaded: true, busy: false, needsReload: false, error: null });
          return { ok: true };
        } catch {
          const message = 'Saved workouts could not be opened. Existing data has not been replaced. Try reloading saved workouts.';
          set({ busy: false, needsReload: true, error: message });
          return blocked(message);
        }
      })();
      void loading.then(() => { loading = null; });
      return loading;
    }
    return {
      data: emptyWorkoutData(), loaded: false, busy: false, needsReload: false, error: null, load,
      previewSync: async cloud => {
        const current = get();
        if (current.busy || !current.loaded || current.needsReload) invalid('Wait for saved workouts to finish loading before previewing sync.');
        const syncRepository = repository as SyncedWorkoutRepository;
        if (!syncRepository.loadSync) invalid('Sync storage is unavailable.');
        const [shared, remote] = await Promise.all([syncRepository.loadSync(), cloud.read()]);
        const saved = await repository.load();
        if (saved.revision !== current.data.revision || get().data.revision !== saved.revision) invalid('Workouts changed. Reload saved workouts and preview sync again.');
        const preview = { localRevision: current.data.revision, local: syncSnapshot(current.data),
          base: syncSnapshot(shared.data), remote: validateSharedSnapshot(remote) };
        mergeWorkoutSync(preview.base, preview.local, preview.remote.data);
        return preview;
      },
      confirmSync: (preview, choices, cloud) => commit(data => {
        if (data.revision !== preview.localRevision) invalid('Workouts changed after the preview. Preview sync again.');
        const merged = mergeWorkoutSync(preview.base, data, preview.remote.data, choices);
        if (hasSyncConflicts(merged)) invalid('Choose a version for each conflict before confirming sync.');
        return merged.data;
      }, async (revision, next) => {
        const syncRepository = repository as SyncedWorkoutRepository;
        if (!syncRepository.saveSync) invalid('Sync storage is unavailable.');
        let shared;
        try {
          shared = validateSharedSnapshot(await cloud.write(preview.remote.revision, syncSnapshot(validateWorkoutData(next))));
          if (!sameSyncData(shared.data, validateWorkoutData(next))) invalid('The cloud confirmation did not match. Preview sync again.');
        } catch (error) {
          throw new WorkoutError('validation', error instanceof Error ? error.message : 'Sync could not be confirmed. Preview sync again.');
        }
        return syncRepository.saveSync(revision, next, shared);
      }),
      restoreBackup: (backup, expectedRevision) => commit(data => {
        if (data.revision !== expectedRevision) invalid('The library changed after the preview. Choose the backup file again.');
        return mergeWorkoutBackup(data, backup).data;
      }),
      startWorkout: (name, unit) => commit(data => {
        if (data.active) invalid('Finish or discard the active workout before starting another.');
        return { ...data, active: { id: deps.id(), name: cleanName(name), unit, startedAt: deps.now(), finishedAt: null, exercises: [] } };
      }),
      addExercise: name => commit(data => {
        const draft = active(data);
        if (draft.exercises.length >= 100) invalid('This workout already has 100 exercises. Remove one before adding another.');
        return { ...data, active: { ...draft, exercises: [...draft.exercises, { id: deps.id(), name: cleanName(name), sets: [] }] } };
      }),
      removeExercise: id => commit(data => {
        const draft = active(data), removed = draft.exercises.find(e => e.id === id);
        if (!removed) invalid('This exercise is no longer in the active workout.');
        let exercises = draft.exercises.filter(e => e.id !== id);
        // A superset needs two members, so the last remaining member returns to a plain exercise.
        if (removed.superset !== undefined && exercises.filter(e => e.superset === removed.superset).length === 1) {
          exercises = exercises.map(e => e.superset === removed.superset ? without(e, 'superset') : e);
        }
        return { ...data, active: { ...draft, exercises } };
      }),
      addSet: (exerciseId, reps, weight, kind = 'regular', rpe) => commit(data => editExercise(data, exerciseId, exercise => {
        validateSetValues(reps, weight, exercise.bodyweight === true); validateSetKind(kind);
        if (exercise.sets.length >= 100) invalid('This exercise already has 100 sets. Remove one before adding another.');
        return { ...exercise, sets: [...exercise.sets, setRpe({ id: deps.id(), reps, weight, ...(kind === 'warmup' ? { kind } : {}) }, rpe)] };
      })),
      updateSet: (exerciseId, setId, reps, weight, kind, rpe) => commit(data => editExercise(data, exerciseId, exercise => {
        validateSetValues(reps, weight, exercise.bodyweight === true);
        if (kind !== undefined) validateSetKind(kind);
        if (!exercise.sets.some(s => s.id === setId)) invalid('This set is no longer in the workout.');
        return { ...exercise, sets: exercise.sets.map(s => s.id === setId ? setRpe({ id: s.id, reps, weight,
          ...((kind ?? s.kind) === 'warmup' ? { kind: 'warmup' as const } : {}), ...(s.rpe !== undefined ? { rpe: s.rpe } : {}) }, rpe) : s) };
      })),
      moveExercise: (exerciseId, direction) => commit(data => {
        const draft = active(data), index = draft.exercises.findIndex(e => e.id === exerciseId);
        if (index < 0) invalid('This exercise is no longer in the active workout.');
        if (direction !== 'up' && direction !== 'down') invalid('Choose up or down to move this exercise.');
        const exercises = draft.exercises, [start, end] = unit(exercises, index);
        if (direction === 'up' && start === 0) invalid('This exercise is already first.');
        if (direction === 'down' && end === exercises.length - 1) invalid('This exercise is already last.');
        const [before, after] = direction === 'up' ? [unit(exercises, start - 1), [start, end]] : [[start, end], unit(exercises, end + 1)];
        return { ...data, active: { ...draft, exercises: [...exercises.slice(0, before[0]), ...exercises.slice(after[0], after[1] + 1),
          ...exercises.slice(before[0], before[1] + 1), ...exercises.slice(after[1] + 1)] } };
      }),
      groupSuperset: exerciseIds => commit(data => {
        const draft = active(data);
        if (!Array.isArray(exerciseIds) || new Set(exerciseIds).size < 2 || new Set(exerciseIds).size !== exerciseIds.length) {
          invalid('Choose at least two exercises to group as a superset.');
        }
        const indexes = exerciseIds.map(id => draft.exercises.findIndex(e => e.id === id)).sort((a, b) => a - b);
        if (indexes.some(index => index < 0)) invalid('This exercise is no longer in the active workout.');
        if (indexes.some(index => draft.exercises[index].superset !== undefined)) invalid('One of these exercises is already in a superset. Ungroup it first.');
        if (indexes.some((index, position) => index !== indexes[0] + position)) {
          invalid('Choose exercises that are next to each other. Move them together first, then group them.');
        }
        const group = deps.id(), members = new Set(exerciseIds);
        return { ...data, active: { ...draft, exercises: draft.exercises.map(e => members.has(e.id) ? { ...e, superset: group } : e) } };
      }),
      ungroupSuperset: groupId => commit(data => {
        const draft = active(data);
        if (!draft.exercises.some(e => e.superset === groupId)) invalid('This superset is no longer in the active workout.');
        return { ...data, active: { ...draft, exercises: draft.exercises.map(e => e.superset === groupId ? without(e, 'superset') : e) } };
      }),
      setExerciseBodyweight: (exerciseId, on) => commit(data => {
        if (typeof on !== 'boolean') invalid('Choose whether this exercise is bodyweight.');
        const found = active(data).exercises.find(e => e.id === exerciseId);
        if (found && (found.bodyweight === true) === on) return data;
        return editExercise(data, exerciseId, exercise => {
          if (on) return { ...exercise, bodyweight: true };
          if (exercise.sets.some(s => s.weight < 0)) {
            invalid('Change assisted (negative weight) sets to 0 or more before turning off bodyweight for this exercise.');
          }
          return without(exercise, 'bodyweight');
        });
      }),
      removeSet: (exerciseId, setId) => commit(data => editExercise(data, exerciseId, exercise => {
        if (!exercise.sets.some(s => s.id === setId)) invalid('This set is no longer in the workout.');
        return { ...exercise, sets: exercise.sets.filter(s => s.id !== setId) };
      })),
      finishWorkout: () => commit(data => {
        const draft = active(data), finishedAt = deps.now();
        if (!draft.exercises.length || draft.exercises.some(e => !e.sets.length)) invalid('Log a set for each exercise, or remove empty exercises before finishing.');
        if (!Number.isSafeInteger(finishedAt) || finishedAt < draft.startedAt) invalid('The device clock is earlier than the workout start. Check the clock and try again.');
        if (data.history.length >= 1000) invalid('History is full. Delete an old saved workout before finishing another.');
        return { ...data, active: null, history: [{ ...draft, finishedAt }, ...data.history] };
      }),
      discardWorkout: () => commit(data => { active(data); return { ...data, active: null }; }),
      deleteWorkout: id => commit(data => {
        if (!data.history.some(w => w.id === id)) invalid('This saved workout is no longer available.');
        return { ...data, history: data.history.filter(w => w.id !== id) };
      }),
      setWorkoutNote: (workoutId, note, expectedRevision) => commit(data => {
        if (expectedRevision !== undefined && data.revision !== expectedRevision) invalid('Saved workouts changed. Reopen the note before saving.');
        const source = data.active?.id === workoutId ? data.active : data.history.find(w => w.id === workoutId);
        if (!source) invalid('This workout is no longer available.');
        const text = typeof note === 'string' ? note.replace(/\r\n?/g, '\n').trim() : invalid('Enter the workout note as text.');
        if (text) validateWorkoutNote(text);
        if ((source.note ?? '') === text) return data;
        const updated: { -readonly [K in keyof Workout]: Workout[K] } = { ...source, note: text };
        // Blank removes the field so stored records never carry an empty note.
        if (!text) delete updated.note;
        return data.active === source ? { ...data, active: updated } : { ...data, history: data.history.map(w => w === source ? updated : w) };
      }),
      repeatWorkout: workoutId => commit(data => {
        if (data.active) invalid('Finish or discard the active workout before repeating another.');
        const source = data.history.find(w => w.id === workoutId);
        if (!source) invalid('This saved workout is no longer available.');
        const id = deps.id(), copy = freshGroups();
        // Copy only the plan: names, order, targets, supersets and bodyweight. Notes and actual sets stay with the source record.
        const exercises = source.exercises.map(({ name, targetSets, targetReps, targetWeight, superset, bodyweight }) => ({ id: deps.id(), name,
          ...(targetSets !== undefined ? { targetSets } : {}), ...(targetReps !== undefined ? { targetReps } : {}),
          ...(targetWeight !== undefined ? { targetWeight } : {}), sets: [], ...copy({ superset, bodyweight }) }));
        return { ...data, active: { id, name: source.name, unit: source.unit, startedAt: deps.now(), finishedAt: null, exercises } };
      }),
      correctCompletedWorkout: (id, expectedRevision, input) => commit(data => {
        if (data.revision !== expectedRevision) invalid('Saved workouts changed. Cancel and reopen this workout before saving your edits.');
        const source = data.history.find(w => w.id === id);
        if (!source) invalid('This completed workout is no longer available.');
        if (!Array.isArray(input.exercises) || input.exercises.length !== source.exercises.length) invalid('Keep the existing exercises when correcting a workout.');
        const updated = { ...source, name: cleanName(input.name), exercises: source.exercises.map((exercise, index) => {
          const row = input.exercises[index];
          if (row.id !== exercise.id || !Array.isArray(row.sets) || row.sets.length !== exercise.sets.length) invalid('Keep the existing exercises and sets when correcting a workout.');
          return { ...exercise, sets: exercise.sets.map((saved, setIndex) => {
            const set = row.sets[setIndex];
            if (set.id !== saved.id) invalid('Keep the existing set order when correcting a workout.');
            validateSetValues(set.reps, set.weight, exercise.bodyweight === true);
            const kind = set.kind === undefined ? 'regular' : set.kind; validateSetKind(kind);
            return setRpe({ id: saved.id, reps: set.reps, weight: set.weight, ...(kind === 'warmup' ? { kind } : {}),
              ...(saved.rpe !== undefined ? { rpe: saved.rpe } : {}) }, set.rpe);
          }) };
        }) };
        return { ...data, history: data.history.map(w => w.id === id ? updated : w) };
      }),
      createRoutine: input => commit(data => {
        if ((data.routines?.length ?? 0) >= 100) invalid('You already have 100 routines. Delete one before adding another.');
        return { ...data, routines: [...(data.routines ?? []), preparedRoutine(deps.id(), input)] };
      }),
      duplicateRoutine: id => commit(data => {
        const source = routine(data, id);
        if (data.routines!.length >= 100) invalid('You already have 100 routines. Delete one before adding another.');
        // Reserve seven characters for the suffix without splitting a UTF-16 pair.
        const name = source.name.slice(0, 73).replace(/[\uD800-\uDBFF]$/u, '') + ' (copy)';
        const copy = preparedRoutine(deps.id(), { ...source, name });
        return { ...data, routines: [...data.routines!, copy] };
      }),
      updateRoutine: (id, expectedRevision, input) => commit(data => {
        if (data.revision !== expectedRevision) invalid('Saved workouts or routines changed. Reopen this routine before saving your edits.');
        routine(data, id);
        const updated = preparedRoutine(id, input);
        return { ...data, routines: data.routines!.map(r => r.id === id ? updated : r) };
      }),
      deleteRoutine: id => commit(data => {
        routine(data, id);
        return { ...data, routines: data.routines!.filter(r => r.id !== id) };
      }),
      startRoutine: id => commit(data => {
        if (data.active) invalid('Finish or discard the active workout before starting another routine.');
        const source = routine(data, id), copy = freshGroups();
        return { ...data, active: { id: deps.id(), name: source.name, unit: source.unit, startedAt: deps.now(), finishedAt: null,
          exercises: source.exercises.map(e => ({ ...copy(e), id: deps.id(), sets: [] })) } };
      }),
      createGoal: input => commit(data => {
        if ((data.goals?.length ?? 0) >= 100) invalid('You already have 100 goals. Delete one before adding another.');
        return { ...data, goals: [...(data.goals ?? []), preparedGoal(data, deps.id(), deps.now(), input)] };
      }),
      updateGoal: (id, expectedRevision, input) => commit(data => {
        if (data.revision !== expectedRevision) invalid('Saved goals changed. Reopen this goal before saving your edits.');
        const source = goal(data, id), updated = preparedGoal(data, id, source.createdAt, input);
        if (JSON.stringify(updated) === JSON.stringify(source)) return data;
        return { ...data, goals: data.goals!.map(g => g.id === id ? updated : g) };
      }),
      addBodyEntry: input => commit(data => {
        if ((data.bodyLog?.length ?? 0) >= MAX_BODY_ENTRIES) {
          invalid(`Your body log already has ${MAX_BODY_ENTRIES} entries. Delete an old entry before adding another.`);
        }
        return { ...data, bodyLog: [...(data.bodyLog ?? []), preparedBodyEntry(deps.id(), input)] };
      }),
      updateBodyEntry: (id, expectedRevision, input) => commit(data => {
        if (data.revision !== expectedRevision) invalid('Body log changed. Reopen this entry before saving your edits.');
        const source = data.bodyLog?.find(e => e.id === id);
        if (!source) invalid('This body log entry is no longer available.');
        const updated = preparedBodyEntry(id, input);
        if (JSON.stringify(updated) === JSON.stringify(source)) return data;
        return { ...data, bodyLog: data.bodyLog!.map(e => e.id === id ? updated : e) };
      }),
      deleteBodyEntry: id => commit(data => {
        if (!data.bodyLog?.some(e => e.id === id)) invalid('This body log entry is no longer available.');
        return { ...data, bodyLog: data.bodyLog.filter(e => e.id !== id) };
      }),
      setExerciseNote: (name, note, expectedRevision) => commit(data => {
        if (expectedRevision !== undefined && data.revision !== expectedRevision) invalid('Exercise notes changed. Reopen the note before saving.');
        const exercise = cleanName(typeof name === 'string' ? name : '');
        const text = noteInput(note, 'exercise note');
        if (text) validateExerciseNote(text);
        const notes = data.exerciseNotes ?? {}, saved = Object.prototype.hasOwnProperty.call(notes, exercise) ? notes[exercise] : '';
        if (saved === text) return data;
        if (!saved && Object.keys(notes).length >= MAX_EXERCISE_NOTES) {
          invalid(`You already have notes for ${MAX_EXERCISE_NOTES} exercises. Remove one before adding another.`);
        }
        // fromEntries keeps every name, including "__proto__", as an ordinary own key.
        const rest = Object.entries(notes).filter(([key]) => key !== exercise);
        return { ...data, exerciseNotes: Object.fromEntries(text ? (saved ? Object.entries(notes).map(([key, value]) => [key, key === exercise ? text : value])
          : [...rest, [exercise, text]]) : rest) };
      }),
      deleteGoal: id => commit(data => {
        goal(data, id);
        return { ...data, goals: data.goals!.filter(g => g.id !== id) };
      }),
    };
  });
}
export const workoutStore = createWorkoutStore(createWorkoutRepository(globalThis.indexedDB));
export type WorkoutStore = ReturnType<typeof createWorkoutStore>;
