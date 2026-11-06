import { createStore } from 'zustand/vanilla';
import { emptyWorkoutData, validateSetKind, validateSetValues, validateWorkoutData, WorkoutError } from '@/core/workouts';
import type { RoutineInput, SetKind, WeightUnit, Workout, WorkoutData, WorkoutExercise, WorkoutResult, WorkoutRoutine } from '@/types/workout';
import { createWorkoutRepository, type WorkoutRepository, type SyncedWorkoutRepository } from './workoutRepository';
import { mergeWorkoutBackup, type WorkoutBackup } from '@/core/workoutBackup';
import { mergeWorkoutSync, sameSyncData, syncSnapshot, validateSharedSnapshot, type SyncChoice, type SyncPreview, type WorkoutCloud } from '@/core/workoutSync';
interface WorkoutDeps { id: () => string; now: () => number }
export interface CompletedWorkoutCorrection {
  name: string;
  exercises: readonly { id: string; sets: readonly { id: string; reps: number; weight: number; kind?: SetKind }[] }[];
}
export interface WorkoutState {
  data: WorkoutData; loaded: boolean; busy: boolean; needsReload: boolean; error: string | null;
  load: () => Promise<WorkoutResult>;
  startWorkout: (name: string, unit: WeightUnit) => Promise<WorkoutResult>;
  addExercise: (name: string) => Promise<WorkoutResult>;
  removeExercise: (id: string) => Promise<WorkoutResult>;
  addSet: (exerciseId: string, reps: number, weight: number, kind?: SetKind) => Promise<WorkoutResult>;
  updateSet: (exerciseId: string, setId: string, reps: number, weight: number, kind?: SetKind) => Promise<WorkoutResult>;
  removeSet: (exerciseId: string, setId: string) => Promise<WorkoutResult>;
  finishWorkout: () => Promise<WorkoutResult>;
  discardWorkout: () => Promise<WorkoutResult>;
  deleteWorkout: (id: string) => Promise<WorkoutResult>;
  correctCompletedWorkout: (id: string, expectedRevision: number, input: CompletedWorkoutCorrection) => Promise<WorkoutResult>;
  createRoutine: (input: RoutineInput) => Promise<WorkoutResult>;
  duplicateRoutine: (id: string) => Promise<WorkoutResult>;
  updateRoutine: (id: string, expectedRevision: number, input: RoutineInput) => Promise<WorkoutResult>;
  deleteRoutine: (id: string) => Promise<WorkoutResult>;
  startRoutine: (id: string) => Promise<WorkoutResult>;
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
function active(data: WorkoutData): Workout {
  if (!data.active) invalid('Start a workout first.');
  return data.active;
}
function editExercise(data: WorkoutData, id: string, change: (value: WorkoutExercise) => WorkoutExercise): WorkoutData {
  const draft = active(data);
  if (!draft.exercises.some(e => e.id === id)) invalid('This exercise is no longer in the active workout.');
  return { ...data, active: { ...draft, exercises: draft.exercises.map(e => e.id === id ? change(e) : e) } };
}
export function createWorkoutStore(repository: WorkoutRepository, deps: WorkoutDeps = browserDeps) {
  function preparedRoutine(id: string, input: RoutineInput): WorkoutRoutine {
    if (!Array.isArray(input.exercises) || !input.exercises.length || input.exercises.length > 100) invalid('Add 1 to 100 named exercises to each routine.');
    return { ...input, id, name: cleanName(input.name), exercises: input.exercises.map(e => ({ ...e, id: deps.id(), name: cleanName(e.name) })) };
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
        if (merged.conflicts.length) invalid('Choose a version for each conflict before confirming sync.');
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
        const draft = active(data);
        if (!draft.exercises.some(e => e.id === id)) invalid('This exercise is no longer in the active workout.');
        return { ...data, active: { ...draft, exercises: draft.exercises.filter(e => e.id !== id) } };
      }),
      addSet: (exerciseId, reps, weight, kind = 'regular') => commit(data => editExercise(data, exerciseId, exercise => {
        validateSetValues(reps, weight); validateSetKind(kind);
        if (exercise.sets.length >= 100) invalid('This exercise already has 100 sets. Remove one before adding another.');
        return { ...exercise, sets: [...exercise.sets, { id: deps.id(), reps, weight, ...(kind === 'warmup' ? { kind } : {}) }] };
      })),
      updateSet: (exerciseId, setId, reps, weight, kind) => commit(data => editExercise(data, exerciseId, exercise => {
        validateSetValues(reps, weight);
        if (kind !== undefined) validateSetKind(kind);
        if (!exercise.sets.some(s => s.id === setId)) invalid('This set is no longer in the workout.');
        return { ...exercise, sets: exercise.sets.map(s => s.id === setId ? { id: s.id, reps, weight,
          ...((kind ?? s.kind) === 'warmup' ? { kind: 'warmup' as const } : {}) } : s) };
      })),
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
            validateSetValues(set.reps, set.weight);
            const kind = set.kind === undefined ? 'regular' : set.kind; validateSetKind(kind);
            return { id: saved.id, reps: set.reps, weight: set.weight, ...(kind === 'warmup' ? { kind } : {}) };
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
        const source = routine(data, id);
        return { ...data, active: { id: deps.id(), name: source.name, unit: source.unit, startedAt: deps.now(), finishedAt: null,
          exercises: source.exercises.map(e => ({ ...e, id: deps.id(), sets: [] })) } };
      }),
    };
  });
}
export const workoutStore = createWorkoutStore(createWorkoutRepository(globalThis.indexedDB));
export type WorkoutStore = ReturnType<typeof createWorkoutStore>;
