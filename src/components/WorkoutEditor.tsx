import { useId, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { SetKind, WeightUnit, WorkoutExercise } from '@/types/workout';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { findPreviousExercise } from '@/core/previousWorkout';
import { SetAnalysisButton, type SetAnalysisActions } from './SetAnalysisButton';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseHistory } from './ExerciseHistory';
import { PlateCalculator } from './PlateCalculator';
import { REST_DURATIONS, type ExerciseRestSettings } from '@/store/useExerciseRest';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
function numeric(value: string) { return value.trim() ? Number(value) : NaN; }

export function WorkoutEditor({ store, onFinished, onSetLogged, analysis, restSettings, onRest }: {
  store: WorkoutStore; onFinished: (workoutId: string) => void;
  onSetLogged?: (workoutId: string, name: string, seconds: number) => void; analysis?: SetAnalysisActions;
  restSettings?: ExerciseRestSettings; onRest?: (name: string, seconds: number) => void;
}) {
  const state = useStore(store);
  const [name, setName] = useState('Workout');
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [exerciseName, setExerciseName] = useState('');
  const disabled = state.busy || state.needsReload || !state.loaded;
  const workout = state.data.active;
  if (!state.loaded) return <div><h1 className="text-3xl font-bold text-white">Workout</h1><p className="mt-3 text-slate-400">Open saved workouts to begin.</p></div>;
  if (!workout) return <div className="max-w-lg space-y-5">
    <div><h1 className="text-3xl font-bold text-white">Start a workout</h1><p className="mt-2 text-sm text-slate-400">Choose your weight unit before logging. Each workout keeps its original unit.</p></div>
    <form aria-label="Start a workout" onSubmit={async (event: FormEvent) => { event.preventDefault(); await state.startWorkout(name, unit); }}>
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <div><label htmlFor="workout-name" className="text-sm text-slate-300">Workout name</label>
          <input id="workout-name" required maxLength={80} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label htmlFor="workout-unit" className="text-sm text-slate-300">Weight unit</label>
          <select id="workout-unit" className={inputClass} value={unit} onChange={e => setUnit(e.target.value as WeightUnit)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></div>
        <button className="btn-primary" type="submit">Start workout</button>
      </fieldset>
    </form>
    <p className="text-xs text-slate-500">Saved locally as you log. Clearing app or browser data removes workout history.</p>
  </div>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><h1 className="break-words text-3xl font-bold text-white">{workout.name}</h1><p className="mt-2 text-sm text-slate-400">Active workout · weights in {workout.unit}</p></div>
      <button type="button" className="btn-ghost text-danger" disabled={disabled} onClick={async () => {
        if (window.confirm('Discard this workout and its logged sets?')) await state.discardWorkout();
      }}>Discard workout</button>
    </div>
    <fieldset disabled={disabled} className="min-w-0 space-y-6">
      {workout.exercises.map(exercise => <ExerciseEditor key={exercise.id} workoutId={workout.id} exercise={exercise} unit={workout.unit}
        store={store} analysis={analysis} onSetLogged={onSetLogged} restSettings={restSettings} onRest={onRest} />)}
      <form aria-label="Add an exercise" className="border-t border-white/10 pt-5" onSubmit={async event => {
        event.preventDefault(); if ((await state.addExercise(exerciseName)).ok) setExerciseName('');
      }}>
        <ExercisePicker id="exercise-name" label="Exercise name" value={exerciseName} onChange={setExerciseName} data={state.data}>
          <button type="submit" className="btn-ghost">Add exercise</button>
        </ExercisePicker>
      </form>
      <PlateCalculator key={workout.id} unit={workout.unit} />
      <button type="button" className="btn-primary w-full sm:w-auto" onClick={async () => { if ((await state.finishWorkout()).ok) onFinished(workout.id); }}>Finish workout</button>
    </fieldset>
  </div>;
}

function ExerciseEditor({ workoutId, exercise, unit, store, analysis, onSetLogged, restSettings, onRest }: {
  workoutId: string; exercise: WorkoutExercise; unit: WeightUnit; store: WorkoutStore; analysis?: SetAnalysisActions;
  onSetLogged?: (workoutId: string, name: string, seconds: number) => void;
  restSettings?: ExerciseRestSettings; onRest?: (name: string, seconds: number) => void;
}) {
  const id = useId();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [kind, setKind] = useState<SetKind>('regular');
  const repsInput = useRef<HTMLInputElement>(null);
  const state = useStore(store);
  const previous = state.data.active ? findPreviousExercise(state.data.history, state.data.active, exercise.name, kind) : null;
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const restSeconds = restSettings?.getDuration(exercise.name) ?? 90;
  function focusReps() { repsInput.current?.focus(); repsInput.current?.select(); }
  return <section className="rounded-xl border border-white/10 bg-ink-900/50 p-4" aria-label={exercise.name}>
    <div className="mb-3 flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold text-white">{exercise.name}</h2>
      <button type="button" className="shrink-0 text-sm text-slate-400 underline underline-offset-4" aria-label={`Remove exercise ${exercise.name}`} onClick={async () => {
        if (window.confirm(`Remove ${exercise.name} and its logged sets?`)) await state.removeExercise(exercise.id);
      }}>Remove</button></div>
    {restSettings && <div className="mb-4 flex flex-wrap items-end gap-3">
      <div><label htmlFor={`${id}-rest`} className="text-sm text-slate-300">Default rest</label>
        <select id={`${id}-rest`} className={inputClass} value={restSeconds}
          onChange={event => restSettings.setDuration(exercise.name, Number(event.target.value))}>
          {REST_DURATIONS.map(seconds => <option value={seconds} key={seconds}>{seconds} seconds</option>)}
        </select></div>
      {onRest && <button type="button" className="btn-ghost" aria-label={`Start rest for ${exercise.name}`}
        onClick={() => onRest(exercise.name, restSeconds)}>Start rest</button>}
      <p className="w-full text-xs text-slate-500">Remembered on this device for this exact exercise name.</p>
    </div>}
    {(exercise.targetSets !== undefined || exercise.targetReps !== undefined) && <p className="mb-4 text-sm text-slate-400">
      <span className="text-accent">Planned target: {exercise.targetSets !== undefined ? `${exercise.targetSets} sets` : ''}
        {exercise.targetSets !== undefined && exercise.targetReps !== undefined ? ' · ' : ''}
        {exercise.targetReps !== undefined ? `${exercise.targetReps} reps per set` : ''}.</span> Log actual sets below.
    </p>}
    {previous && <div className="mb-4 rounded-lg bg-white/5 p-3">
      <h3 className="text-sm font-semibold text-slate-300">Previous workout</h3>
      <p className="mt-1 break-words text-xs text-slate-400">{previous.workoutName} · {new Date(previous.finishedAt).toLocaleDateString()}</p>
      <ul className="mt-2 space-y-1">{previous.sets.map((set, index) => <li key={set.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-300">{index + 1}. {set.reps} reps × {set.weight} {unit}</span>
        <button type="button" className="px-2 py-2 text-accent" aria-label={`Use previous set ${index + 1} for ${exercise.name}`}
          onClick={() => { setReps(String(set.reps)); setWeight(String(set.weight)); focusReps(); }}>Use values</button>
      </li>)}</ul>
      <p className="mt-2 text-xs text-slate-500">Same exercise name and unit. Review copied values before logging.</p>
    </div>}
    {state.data.active && <ExerciseHistory history={state.data.history} name={exercise.name} unit={unit} startedAt={state.data.active.startedAt} />}
    {exercise.sets.length > 0 && <div className="mb-4 overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Logged sets for {exercise.name}</caption><thead className="text-slate-400"><tr><th className="py-2">Set</th><th>Reps</th><th>Weight</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody className="divide-y divide-white/10">{exercise.sets.map((set, index) => <tr key={set.id} id={`set-row-${set.id}`} tabIndex={-1}>
        <td className="py-3">{index + 1}<span className="block text-xs text-slate-400">{set.kind === 'warmup' ? 'Warm-up' : 'Regular'}</span></td><td>{set.reps}</td><td>{set.weight} {unit}</td>
        <td className="text-right"><SetAnalysisButton link={{ workoutId, exerciseId: exercise.id, setId: set.id }} exerciseName={exercise.name}
          setNumber={index + 1} actions={analysis} disabled={state.busy || state.needsReload || !state.loaded} />
          <button type="button" className="px-2 py-2 text-accent" aria-label={`Edit set ${index + 1} for ${exercise.name}`} onClick={() => { setEditing(set.id); setReps(String(set.reps)); setWeight(String(set.weight)); setKind(set.kind ?? 'regular'); }}>Edit</button>
          <button type="button" className="px-2 py-2 text-slate-400" aria-label={`Remove set ${index + 1} for ${exercise.name}`} onClick={async () => {
            if ((await state.removeSet(exercise.id, set.id)).ok && editing === set.id) setEditing(null);
          }}>Remove</button></td>
      </tr>)}</tbody>
    </table></div>}
    <form aria-label={`Log a set for ${exercise.name}`} className="space-y-3" onSubmit={async event => {
      event.preventDefault();
      const result = editing ? await state.updateSet(exercise.id, editing, numeric(reps), numeric(weight), kind) : await state.addSet(exercise.id, numeric(reps), numeric(weight), kind);
      if (result.ok) {
        if (!editing) onSetLogged?.(workoutId, exercise.name, restSeconds);
        setEditing(null); focusReps();
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={`${id}-reps`} className="text-sm text-slate-300">Reps</label><input ref={repsInput} id={`${id}-reps`} type="number" inputMode="numeric" required min={1} max={1000} step={1} className={inputClass} value={reps} onChange={e => setReps(e.target.value)} /></div>
        <div><label htmlFor={`${id}-weight`} className="text-sm text-slate-300">Weight ({unit})</label><input id={`${id}-weight`} type="number" inputMode="decimal" required min={0} max={10000} step="any" className={inputClass} value={weight} onChange={e => setWeight(e.target.value)} /></div>
      </div>
      <div className="max-w-xs"><label htmlFor={`${id}-kind`} className="text-sm text-slate-300">Set type</label>
        <select id={`${id}-kind`} className={inputClass} value={kind} onChange={event => setKind(event.target.value as SetKind)}>
          <option value="regular">Regular</option><option value="warmup">Warm-up</option>
        </select></div>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn-ghost">{editing ? 'Save set' : 'Log set'}</button>
        {!editing && lastSet && <button type="button" className="btn-ghost" aria-label={`Repeat last set for ${exercise.name}`} onClick={async () => {
          if ((await state.addSet(exercise.id, lastSet.reps, lastSet.weight, lastSet.kind ?? 'regular')).ok) { onSetLogged?.(workoutId, exercise.name, restSeconds); focusReps(); }
        }}>Repeat last set</button>}
        {editing && <button type="button" className="text-sm text-slate-400 underline" onClick={() => setEditing(null)}>Cancel edit</button>}
        <span className="text-xs text-slate-500">Use 0 for no added load.</span></div>
    </form>
  </section>;
}
