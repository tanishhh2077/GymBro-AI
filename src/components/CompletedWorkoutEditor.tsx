import { useId, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { SetKind, Workout } from '@/types/workout';
import { formatDurationLine } from '@/core/workoutClock';
import { WorkoutNoteField } from './WorkoutEditor';
import { confirmDiscard, useUnsavedChanges } from './unsavedChanges';
import { AlternateWeightHint } from './trainingDetail';
import { BODYWEIGHT_HELP, RPE_HELP } from './trainingDetailText';

const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
export function CompletedWorkoutEditor({ store, workout, expectedRevision, onClose }: {
  store: WorkoutStore; workout: Workout; expectedRevision: number; onClose: () => void;
}) {
  const state = useStore(store);
  const id = useId();
  const duration = formatDurationLine(workout.startedAt, workout.finishedAt);
  const [name, setName] = useState(workout.name);
  const [exercises, setExercises] = useState(() => workout.exercises.map(exercise => ({ ...exercise,
    sets: exercise.sets.map(set => ({ id: set.id, reps: String(set.reps), weight: String(set.weight), kind: set.kind ?? 'regular',
      rpe: set.rpe === undefined ? '' : String(set.rpe) })) })));
  const [note, setNote] = useState(workout.note ?? '');
  // Opening values; the draft is unsaved while it differs from them.
  const [opened] = useState(() => JSON.stringify({ name, note: note.trim(), exercises }));
  const dirty = JSON.stringify({ name, note: note.trim(), exercises }) !== opened;
  useUnsavedChanges(dirty);
  // Advances after corrections save so a failed note save can be retried without reopening.
  const [revision, setRevision] = useState(expectedRevision);
  const [error, setError] = useState('');
  const stale = state.data.revision !== revision;
  const disabled = state.busy || !state.loaded || state.needsReload || stale;
  function change(exerciseId: string, setId: string, field: 'reps' | 'weight' | 'kind' | 'rpe', value: string) {
    setExercises(current => current.map(exercise => exercise.id === exerciseId ? { ...exercise,
      sets: exercise.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) } : exercise));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    if (exercises.some(e => e.sets.some(set => !set.reps.trim() || !set.weight.trim()))) {
      setError('Enter reps and weight for every set. Use 0 for no added load.'); return;
    }
    const result = await state.correctCompletedWorkout(workout.id, revision, { name,
      exercises: exercises.map(e => ({ id: e.id, sets: e.sets.map(set => ({ id: set.id,
        reps: Number(set.reps), weight: Number(set.weight), kind: set.kind as SetKind,
        // Blank clears a saved rating; the store rejects anything outside 1-10 in 0.5 steps.
        rpe: set.rpe.trim() ? Number(set.rpe) : null })) })) });
    if (!result.ok) { setError(result.message); return; }
    setRevision(store.getState().data.revision);
    // The store treats an unchanged note as a no-op, so this write only happens for an edited note.
    const saved = await store.getState().setWorkoutNote(workout.id, note, store.getState().data.revision);
    if (saved.ok) onClose();
    else { setRevision(store.getState().data.revision); setError(`Corrections were saved, but the note was not: ${saved.message}`); }
  }
  return <div className="space-y-5">
    <h1 className="text-3xl font-bold text-white">Edit completed workout</h1>
    <p className="text-sm text-slate-400">Correct the name, note and logged set values. Weights in {workout.unit}. Progress and summaries use the saved corrections.</p>
    {duration && <p className="text-sm text-slate-400">{duration} <span className="text-xs text-slate-500">(includes rests and time away)</span></p>}
    {stale && <p role="alert" className="text-sm text-warn">Saved workouts changed. Cancel and reopen this workout before saving your edits.</p>}
    {(error || state.error) && <p role="alert" className="text-sm text-warn">{error || state.error}</p>}
    <form aria-label="Correct completed workout" onSubmit={save}>
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        <div><label htmlFor={`${id}-name`} className="text-sm text-slate-300">Workout name</label>
          <input id={`${id}-name`} required maxLength={80} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></div>
        <WorkoutNoteField id={`${id}-note`} value={note} onChange={setNote} />
        <p id={`${id}-rpe-help`} className="text-xs text-slate-500">RPE: {RPE_HELP}</p>
        {exercises.map((exercise, exerciseIndex) => <fieldset key={exercise.id} className="min-w-0 space-y-4 border-t border-white/10 pt-4">
          <legend className="break-words text-lg font-semibold text-white">{exercise.name}</legend>
          {exercise.bodyweight && <p id={`${id}-${exercise.id}-bodyweight`} className="text-xs text-slate-400">Bodyweight exercise: weight is added load. {BODYWEIGHT_HELP}</p>}
          {exercise.sets.map((set, index) => {
            const prefix = `${id}-${exercise.id}-${set.id}`;
            const label = `Exercise ${exerciseIndex + 1} set ${index + 1}`;
            return <div key={set.id} className="min-w-0 rounded-lg border border-white/10 p-3">
              <p className="text-sm text-slate-300">Set {index + 1}</p>
              <div className="mt-2 grid min-w-0 grid-cols-2 gap-3">
                <div className="min-w-0"><label htmlFor={`${prefix}-reps`} className="text-xs text-slate-400">{label} reps</label>
                  <input id={`${prefix}-reps`} required type="number" inputMode="numeric" min={1} max={1000} step={1} className={inputClass}
                    value={set.reps} onChange={e => change(exercise.id, set.id, 'reps', e.target.value)} /></div>
                <div className="min-w-0"><label htmlFor={`${prefix}-weight`} className="text-xs text-slate-400">{label} {exercise.bodyweight ? 'added weight' : 'weight'} ({workout.unit})</label>
                  <input id={`${prefix}-weight`} required type="number" inputMode="decimal" min={exercise.bodyweight ? -1000 : 0} max={10000} step="any"
                    className={inputClass} aria-describedby={exercise.bodyweight ? `${id}-${exercise.id}-bodyweight` : undefined}
                    value={set.weight} onChange={e => change(exercise.id, set.id, 'weight', e.target.value)} />
                  <AlternateWeightHint value={set.weight} unit={workout.unit} bodyweight={exercise.bodyweight} /></div>
              </div>
              <label htmlFor={`${prefix}-rpe`} className="mt-3 block text-xs text-slate-400">{label} RPE</label>
              <input id={`${prefix}-rpe`} type="number" inputMode="decimal" min={1} max={10} step={0.5} placeholder="Optional" className={inputClass}
                aria-describedby={`${id}-rpe-help`} value={set.rpe} onChange={e => change(exercise.id, set.id, 'rpe', e.target.value)} />
              <label htmlFor={`${prefix}-kind`} className="mt-3 block text-xs text-slate-400">{label} kind</label>
              <select id={`${prefix}-kind`} className={inputClass} value={set.kind} onChange={e => change(exercise.id, set.id, 'kind', e.target.value)}>
                <option value="regular">Regular</option><option value="warmup">Warm-up</option>
              </select>
            </div>;
          })}
        </fieldset>)}
        <button type="submit" className="btn-primary">Save corrections</button>
      </fieldset>
    </form>
    <button type="button" className="btn-ghost" disabled={state.busy} onClick={() => { if (confirmDiscard(dirty)) onClose(); }}>Cancel workout edit</button>
  </div>;
}
