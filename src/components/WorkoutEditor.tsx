import { useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { SetKind, WeightUnit, Workout, WorkoutExercise } from '@/types/workout';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { findPreviousExercise } from '@/core/previousWorkout';
import { formatWeight } from '@/core/weightDisplay';
import { SetAnalysisButton, type SetAnalysisActions } from './SetAnalysisButton';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseHistory } from './ExerciseHistory';
import { PlateCalculator } from './PlateCalculator';
import { REST_DURATIONS, type ExerciseRestSettings } from '@/store/useExerciseRest';
import { confirmDiscard, useConfirmLeave, useUnsavedChanges } from './unsavedChanges';
import { plannedTarget } from './plannedTarget';
import { AlternateWeightHint, RpeText, WeightText } from './trainingDetail';
import { BODYWEIGHT_HELP, exerciseBlocks, RPE_HELP, supersetNames } from './trainingDetailText';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
function numeric(value: string) { return value.trim() ? Number(value) : NaN; }
const NOTE_LIMIT = 1000;

/** Distinct finished-workout names, most recently finished first. */
function previousNames(history: readonly Workout[]) {
  return [...new Set([...history].sort((a, b) => b.finishedAt! - a.finishedAt!).map(w => w.name))].slice(0, 20);
}

/** Shared labelled note input with a visible character count. */
export function WorkoutNoteField({ id, value, onChange, dirty }: { id: string; value: string; onChange: (value: string) => void; dirty?: boolean }) {
  return <div>
    <label htmlFor={id} className="text-sm text-slate-300">Workout note</label>
    <textarea id={id} rows={3} maxLength={NOTE_LIMIT} aria-describedby={`${id}-count`} className={inputClass} value={value}
      onChange={event => onChange(event.target.value)} />
    <p id={`${id}-count`} className="mt-1 text-xs text-slate-500">{value.length} / {NOTE_LIMIT} characters{dirty ? ' · Not saved yet' : ''}</p>
  </div>;
}

export function WorkoutEditor({ store, onFinished, onSetLogged, analysis, restSettings, onRest }: {
  store: WorkoutStore; onFinished: (workoutId: string) => void;
  onSetLogged?: (workoutId: string, name: string, seconds: number) => void; analysis?: SetAnalysisActions;
  restSettings?: ExerciseRestSettings; onRest?: (name: string, seconds: number) => void;
}) {
  const state = useStore(store);
  const [name, setName] = useState('Workout');
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [exerciseName, setExerciseName] = useState('');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const disabled = state.busy || state.needsReload || !state.loaded;
  const workout = state.data.active;
  const names = useMemo(() => previousNames(state.data.history), [state.data.history]);
  const nameListId = useId();
  const confirmLeave = useConfirmLeave();
  useUnsavedChanges(state.loaded && !workout && (name !== 'Workout' || unit !== 'lb'));
  if (!state.loaded) return <div><h1 className="text-3xl font-bold text-white">Workout</h1><p className="mt-3 text-slate-400">Open saved workouts to begin.</p></div>;
  if (!workout) return <div className="max-w-lg space-y-5">
    <div><h1 className="text-3xl font-bold text-white">Start a workout</h1><p className="mt-2 text-sm text-slate-400">Choose your weight unit before logging. Each workout keeps its original unit.</p></div>
    <form aria-label="Start a workout" onSubmit={async (event: FormEvent) => { event.preventDefault(); await state.startWorkout(name, unit); }}>
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <div><label htmlFor="workout-name" className="text-sm text-slate-300">Workout name</label>
          <input id="workout-name" required maxLength={80} className={inputClass} value={name} onChange={e => setName(e.target.value)}
            list={names.length ? nameListId : undefined} autoComplete="off" />
          {names.length > 0 && <><datalist id={nameListId}>{names.map(value => <option key={value} value={value} />)}</datalist>
            <p className="mt-1 text-xs text-slate-500">Choose a previous name or type a new one.</p></>}</div>
        <div><label htmlFor="workout-unit" className="text-sm text-slate-300">Weight unit</label>
          <select id="workout-unit" className={inputClass} value={unit} onChange={e => setUnit(e.target.value as WeightUnit)}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></div>
        <button className="btn-primary" type="submit">Start workout</button>
      </fieldset>
    </form>
    <p className="text-xs text-slate-500">Saved locally as you log. Clearing app or browser data removes workout history.</p>
  </div>;
  // Only still-present, ungrouped exercises count; a stale selection never reaches the store.
  const choosable = selected.filter(id => workout.exercises.some(e => e.id === id && e.superset === undefined));
  const groups = supersetNames(workout.exercises);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><h1 className="break-words text-3xl font-bold text-white">{workout.name}</h1><p className="mt-2 text-sm text-slate-400">Active workout · weights in {workout.unit}</p></div>
      <button type="button" className="btn-ghost text-danger" disabled={disabled} onClick={async () => {
        if (window.confirm('Discard this workout and its logged sets?')) await state.discardWorkout();
      }}>Discard workout</button>
    </div>
    <fieldset disabled={disabled} className="min-w-0 space-y-6">
      <ActiveWorkoutNote key={workout.id} store={store} workoutId={workout.id} note={workout.note} />
      {workout.exercises.length > 1 && <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3">
        <button type="button" className="btn-ghost" disabled={choosable.length < 2} onClick={async () => {
          // Grouping re-nests the exercise sections, which resets their typed set entries.
          if (confirmLeave() && (await state.groupSuperset(choosable)).ok) setSelected([]);
        }}>Group as superset</button>
        <p className="min-w-0 flex-1 text-xs text-slate-400">Select two or more neighbouring exercises to group them. A superset moves as one block.</p>
      </div>}
      {exerciseBlocks(workout.exercises).map(block => {
        const label = block.group === undefined ? undefined : groups.get(block.group);
        const editors = block.items.map((exercise, offset) => <ExerciseEditor key={exercise.id} workoutId={workout.id} exercise={exercise}
          unit={workout.unit} index={block.start + offset} count={workout.exercises.length}
          first={block.start === 0} last={block.start + block.items.length === workout.exercises.length} groupName={label}
          groupSize={block.group === undefined ? undefined : block.items.length}
          selected={label === undefined ? choosable.includes(exercise.id) : undefined}
          onSelect={label === undefined ? checked => setSelected(current => checked ? [...current, exercise.id] : current.filter(id => id !== exercise.id)) : undefined}
          store={store} analysis={analysis} onSetLogged={onSetLogged} restSettings={restSettings} onRest={onRest} />);
        // A lone exercise is returned bare, not in an array, so React keeps its exercise-ID key across moves.
        if (label === undefined) return editors[0];
        return <div key={block.group} role="group" aria-label={label} className="space-y-4 border-l-4 border-accent/60 pl-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-accent">{label} · {block.items.length} exercises. Alternate sets between them.</p>
            <button type="button" className="btn-ghost" aria-label={`Ungroup ${label}`} onClick={async () => {
              if (confirmLeave()) await state.ungroupSuperset(block.group!);
            }}>Ungroup superset</button>
          </div>
          {editors}
        </div>;
      })}
      <form aria-label="Add an exercise" className="border-t border-white/10 pt-5" onSubmit={async event => {
        event.preventDefault(); if ((await state.addExercise(exerciseName)).ok) setExerciseName('');
      }}>
        <ExercisePicker id="exercise-name" label="Exercise name" value={exerciseName} onChange={setExerciseName} data={state.data}>
          <button type="submit" className="btn-ghost">Add exercise</button>
        </ExercisePicker>
      </form>
      <PlateCalculator key={workout.id} unit={workout.unit} />
      <button type="button" className="btn-primary w-full sm:w-auto" onClick={async () => {
        if (confirmLeave() && (await state.finishWorkout()).ok) onFinished(workout.id);
      }}>Finish workout</button>
    </fieldset>
  </div>;
}

/**
 * Explicit Save keeps a failed note in the field. The save carries the revision at which this editor last saw the
 * stored note: unrelated active-workout saves (logged sets) advance it, but a note changed underneath a dirty draft
 * (sync, restore, reload) does not, so the store refuses to overwrite it.
 */
function ActiveWorkoutNote({ store, workoutId, note }: { store: WorkoutStore; workoutId: string; note?: string }) {
  const id = useId();
  const storeError = useStore(store, s => s.error);
  const revision = useStore(store, s => s.data.revision);
  const saved = note ?? '';
  const [draft, setDraft] = useState(saved);
  const [base, setBase] = useState(saved);
  const [opened, setOpened] = useState(revision);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  if (saved !== base && draft.trim() === base) { setBase(saved); setDraft(saved); setOpened(revision); }
  else if (saved === base && opened !== revision) setOpened(revision);
  const dirty = draft.trim() !== saved;
  useUnsavedChanges(dirty);
  function reopen() { setDraft(saved); setBase(saved); setOpened(revision); setConflict(false); setError(''); setStatus(''); }
  return <form aria-label="Active workout note" className="space-y-2" onSubmit={async event => {
    event.preventDefault(); setStatus(''); setError(''); setConflict(false);
    const result = await store.getState().setWorkoutNote(workoutId, draft, opened);
    if (result.ok) {
      const stored = store.getState().data.active?.note ?? '';
      setBase(stored); setOpened(store.getState().data.revision);
      setStatus(stored ? 'Note saved.' : 'Note removed.');
    } else { setError(result.message); setConflict(saved !== base); }
  }}>
    <WorkoutNoteField id={id} value={draft} dirty={dirty} onChange={value => { setDraft(value); setStatus(''); }} />
    <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn-ghost" disabled={!dirty}>Save note</button>
      <span role="status" className="text-sm text-accent">{status}</span></div>
    {error && error !== storeError && <p role="alert" className="text-sm text-warn">{error}</p>}
    {conflict && <div className="text-sm text-slate-300">
      <p>Your typed note is still in the field. Copy anything you need, then load the saved note.</p>
      <button type="button" className="mt-1 text-accent underline underline-offset-4" onClick={reopen}>Load current note</button>
    </div>}
  </form>;
}

function ExerciseEditor({ workoutId, exercise, unit, store, analysis, onSetLogged, restSettings, onRest, index, count, first, last,
  groupName, groupSize, selected, onSelect }: {
  workoutId: string; exercise: WorkoutExercise; unit: WeightUnit; store: WorkoutStore; analysis?: SetAnalysisActions; index: number; count: number;
  /** Whether this exercise's block (itself, or its whole superset) is first or last; Move steps whole blocks. */
  first: boolean; last: boolean; groupName?: string; groupSize?: number; selected?: boolean; onSelect?: (checked: boolean) => void;
  onSetLogged?: (workoutId: string, name: string, seconds: number) => void;
  restSettings?: ExerciseRestSettings; onRest?: (name: string, seconds: number) => void;
}) {
  const id = useId();
  const confirmLeave = useConfirmLeave();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [kind, setKind] = useState<SetKind>('regular');
  const [bodyweightError, setBodyweightError] = useState('');
  const [pendingBodyweight, setPendingBodyweight] = useState<boolean | null>(null);
  // Values last saved or loaded into the entry form; typing away from them is unsaved input.
  const [base, setBase] = useState({ reps: '', weight: '', rpe: '' });
  const entryDirty = reps !== base.reps || weight !== base.weight || rpe !== base.rpe;
  useUnsavedChanges(entryDirty);
  const repsInput = useRef<HTMLInputElement>(null);
  const moveUp = useRef<HTMLButtonElement>(null);
  const moveDown = useRef<HTMLButtonElement>(null);
  const movedFocus = useRef<'up' | 'down' | null>(null);
  // React re-inserts the moved section, which drops focus; restore it on the same exercise.
  useLayoutEffect(() => {
    const direction = movedFocus.current;
    if (!direction) return;
    movedFocus.current = null;
    const preferred = direction === 'up' ? moveUp.current : moveDown.current;
    (preferred && !preferred.disabled ? preferred : direction === 'up' ? moveDown.current : moveUp.current)?.focus();
  }, [index, count]);
  const state = useStore(store);
  const bodyweight = exercise.bodyweight === true;
  const previous = state.data.active ? findPreviousExercise(state.data.history, state.data.active, exercise.name, kind, bodyweight) : null;
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const restSeconds = restSettings?.getDuration(exercise.name) ?? 90;
  function focusReps() { repsInput.current?.focus(); repsInput.current?.select(); }
  return <section className="rounded-xl border border-white/10 bg-ink-900/50 p-4" aria-label={exercise.name}>
    <div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0">
      <h2 className="break-words text-xl font-semibold text-white">{exercise.name}</h2>
      {groupName && <p className="text-xs text-accent">In {groupName}</p>}
    </div>
      <button type="button" className="shrink-0 text-sm text-slate-400 underline underline-offset-4" aria-label={`Remove exercise ${exercise.name}`} onClick={async () => {
        if (groupSize === 2 && !confirmLeave()) return;
        if (window.confirm(`Remove ${exercise.name} and its logged sets?`)) await state.removeExercise(exercise.id);
      }}>Remove</button></div>
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
      <label className="flex items-center gap-2" htmlFor={`${id}-bodyweight`}>
        {/* Show the clicked state while saving; the stored value takes over once the save settles. */}
        <input id={`${id}-bodyweight`} type="checkbox" checked={pendingBodyweight ?? bodyweight} onChange={async event => {
          const on = event.target.checked;
          setBodyweightError(''); setPendingBodyweight(on);
          const result = await state.setExerciseBodyweight(exercise.id, on);
          setPendingBodyweight(null);
          if (!result.ok) setBodyweightError(result.message);
        }} />Bodyweight exercise</label>
      {onSelect && <label className="flex min-w-0 items-center gap-2" htmlFor={`${id}-select`}>
        <input id={`${id}-select`} type="checkbox" className="shrink-0" checked={!!selected} onChange={event => onSelect(event.target.checked)} />
        <span className="min-w-0 [overflow-wrap:anywhere]">Select {exercise.name} for superset</span></label>}
    </div>
    {bodyweightError && <p className="mb-4 text-sm text-warn">{bodyweightError}</p>}
    {count > 1 && <div className="mb-4 flex flex-wrap gap-2">
      {(['up', 'down'] as const).map(direction => <button key={direction} type="button" className="btn-ghost"
        ref={direction === 'up' ? moveUp : moveDown} aria-label={`Move ${exercise.name} ${direction}`}
        disabled={state.busy || (direction === 'up' ? first : last)} onClick={async () => {
          movedFocus.current = direction;
          if (!(await state.moveExercise(exercise.id, direction)).ok) movedFocus.current = null;
        }}>{direction === 'up' ? 'Move up' : 'Move down'}</button>)}
      {groupName && <p className="w-full text-xs text-slate-500">Moves the whole {groupName}.</p>}
    </div>}
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
    {(exercise.targetSets !== undefined || exercise.targetReps !== undefined || exercise.targetWeight !== undefined) && <p className="mb-4 text-sm text-slate-400">
      <span className="text-accent">Planned target: {plannedTarget(exercise, unit)}.</span> Log actual sets below.
    </p>}
    {previous && <div className="mb-4 rounded-lg bg-white/5 p-3">
      <h3 className="text-sm font-semibold text-slate-300">Previous workout</h3>
      <p className="mt-1 break-words text-xs text-slate-400">{previous.workoutName} · {new Date(previous.finishedAt).toLocaleDateString()}</p>
      <ul className="mt-2 space-y-1">{previous.sets.map((set, index) => <li key={set.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-300">{index + 1}. {set.reps} reps × {formatWeight(set.weight, unit, { bodyweight })}</span>
        <button type="button" className="px-2 py-2 text-accent" aria-label={`Use previous set ${index + 1} for ${exercise.name}`}
          onClick={() => { setReps(String(set.reps)); setWeight(String(set.weight)); focusReps(); }}>Use values</button>
      </li>)}</ul>
      <p className="mt-2 text-xs text-slate-500">Same exercise name, unit and bodyweight setting. Review copied values before logging.</p>
    </div>}
    {state.data.active && <ExerciseHistory history={state.data.history} name={exercise.name} unit={unit} bodyweight={bodyweight}
      startedAt={state.data.active.startedAt} />}
    {exercise.sets.length > 0 && <div className="mb-4 overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Logged sets for {exercise.name}</caption><thead className="text-slate-400"><tr><th className="py-2">Set</th><th>Reps</th><th>{bodyweight ? 'Added weight' : 'Weight'}</th><th>RPE</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody className="divide-y divide-white/10">{exercise.sets.map((set, index) => <tr key={set.id} id={`set-row-${set.id}`} tabIndex={-1}>
        <td className="py-3">{index + 1}<span className="block text-xs text-slate-400">{set.kind === 'warmup' ? 'Warm-up' : 'Regular'}</span></td><td>{set.reps}</td>
        <td><WeightText weight={set.weight} unit={unit} bodyweight={bodyweight} /></td><td><RpeText rpe={set.rpe} /></td>
        <td className="text-right"><SetAnalysisButton link={{ workoutId, exerciseId: exercise.id, setId: set.id }} exerciseName={exercise.name}
          setNumber={index + 1} actions={analysis} disabled={state.busy || state.needsReload || !state.loaded} />
          <button type="button" className="px-2 py-2 text-accent" aria-label={`Edit set ${index + 1} for ${exercise.name}`} onClick={() => {
            if (!confirmDiscard(entryDirty)) return;
            const values = { reps: String(set.reps), weight: String(set.weight), rpe: set.rpe === undefined ? '' : String(set.rpe) };
            setEditing(set.id); setReps(values.reps); setWeight(values.weight); setRpe(values.rpe); setBase(values); setKind(set.kind ?? 'regular');
          }}>Edit</button>
          <button type="button" className="px-2 py-2 text-slate-400" aria-label={`Remove set ${index + 1} for ${exercise.name}`} onClick={async () => {
            if ((await state.removeSet(exercise.id, set.id)).ok && editing === set.id) { setEditing(null); setBase({ reps, weight, rpe }); }
          }}>Remove</button></td>
      </tr>)}</tbody>
    </table></div>}
    <form aria-label={`Log a set for ${exercise.name}`} className="space-y-3" onSubmit={async event => {
      event.preventDefault();
      // Blank RPE means none: omitted on a new set, cleared (null) when editing.
      const rating = rpe.trim() ? Number(rpe) : undefined;
      const result = editing ? await state.updateSet(exercise.id, editing, numeric(reps), numeric(weight), kind, rating ?? null)
        : await state.addSet(exercise.id, numeric(reps), numeric(weight), kind, rating);
      if (result.ok) {
        if (!editing) onSetLogged?.(workoutId, exercise.name, restSeconds);
        setEditing(null); setBase({ reps, weight, rpe }); focusReps();
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={`${id}-reps`} className="text-sm text-slate-300">Reps</label><input ref={repsInput} id={`${id}-reps`} type="number" inputMode="numeric" required min={1} max={1000} step={1} className={inputClass} value={reps} onChange={e => setReps(e.target.value)} /></div>
        <div><label htmlFor={`${id}-weight`} className="text-sm text-slate-300">{bodyweight ? `Added weight (${unit})` : `Weight (${unit})`}</label>
          <input id={`${id}-weight`} type="number" inputMode="decimal" required min={bodyweight ? -1000 : 0} max={10000} step="any" className={inputClass}
            aria-describedby={`${id}-weight-help`} value={weight} onChange={e => setWeight(e.target.value)} />
          <AlternateWeightHint value={weight} unit={unit} bodyweight={bodyweight} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={`${id}-kind`} className="text-sm text-slate-300">Set type</label>
          <select id={`${id}-kind`} className={inputClass} value={kind} onChange={event => setKind(event.target.value as SetKind)}>
            <option value="regular">Regular</option><option value="warmup">Warm-up</option>
          </select></div>
        <div><label htmlFor={`${id}-rpe`} className="text-sm text-slate-300">RPE</label>
          <input id={`${id}-rpe`} type="number" inputMode="decimal" min={1} max={10} step={0.5} placeholder="Optional" className={inputClass}
            aria-describedby={`${id}-rpe-help`} value={rpe} onChange={e => setRpe(e.target.value)} /></div>
      </div>
      <p id={`${id}-rpe-help`} className="text-xs text-slate-500">{RPE_HELP}</p>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn-ghost">{editing ? 'Save set' : 'Log set'}</button>
        {!editing && lastSet && <button type="button" className="btn-ghost" aria-label={`Repeat last set for ${exercise.name}`} onClick={async () => {
          // Repeats reps, load and type; effort is rated fresh for each set, so RPE is not copied.
          if ((await state.addSet(exercise.id, lastSet.reps, lastSet.weight, lastSet.kind ?? 'regular')).ok) { onSetLogged?.(workoutId, exercise.name, restSeconds); focusReps(); }
        }}>Repeat last set</button>}
        {editing && <button type="button" className="text-sm text-slate-400 underline" onClick={() => {
          if (!confirmDiscard(entryDirty)) return;
          setEditing(null); setBase({ reps, weight, rpe });
        }}>Cancel edit</button>}
        <span id={`${id}-weight-help`} className="text-xs text-slate-500">{bodyweight ? BODYWEIGHT_HELP : 'Use 0 for no added load.'}</span></div>
    </form>
  </section>;
}
