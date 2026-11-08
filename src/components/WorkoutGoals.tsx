import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { buildExerciseLibrary } from '@/core/exerciseCatalog';
import { goalProgress, type GoalProgress } from '@/core/goalProgress';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { WeightUnit, WorkoutData, WorkoutGoal, WorkoutGoalInput } from '@/types/workout';
import { useUnsavedChanges } from './unsavedChanges';
import { AlternateWeight } from './AlternateWeight';
import { groupLabel, weightParts } from './weightText';

const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
const STALE = 'Saved goals changed';

/** The exact exercise a detail view shows; goals there are filtered to it and new goals start from it. */
export interface GoalScope { readonly name: string; readonly unit: WeightUnit; readonly bodyweight?: boolean }
interface Draft { name: string; unit: WeightUnit; bodyweight: boolean; weight: string; reps: string }
/** `revision` is captured when the editor opens so a newer saved goal is never overwritten. */
interface Editing { id: string | null; revision: number; draft: Draft }

function draftOf(goal: WorkoutGoal): Draft {
  return { name: goal.name, unit: goal.unit, bodyweight: goal.bodyweight === true, weight: String(goal.weight), reps: String(goal.reps) };
}
function exerciseSuggestions(data: WorkoutData): readonly string[] {
  const library = buildExerciseLibrary(data);
  const names = new Set(library.map(e => e.name));
  for (const goal of data.goals ?? []) {
    names.add(goal.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
// Blank fields become NaN so the store rejects them with its own message instead of saving zero.
const numeric = (value: string) => value.trim() === '' ? Number.NaN : Number(value);
const round = (value: number) => Math.round(value * 100) / 100;
const sets = (reps: number, weight: number, unit: WeightUnit, bodyweight: boolean) =>
  `${reps} ${reps === 1 ? 'rep' : 'reps'} × ${weightParts(weight, unit, bodyweight).text}`;

export function WorkoutGoals({ data, store, scope, onHistory }: {
  data: WorkoutData;
  store?: WorkoutStore;
  scope?: GoalScope;
  onHistory: (id: string) => void;
}) {
  const titleId = useId();
  const goals = (data.goals ?? []).filter(goal => !scope ||
    (goal.name === scope.name && goal.unit === scope.unit && (goal.bodyweight === true) === (scope.bodyweight === true)));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState('');
  const addBtnRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (wasEditing.current && !editing) {
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
      } else {
        addBtnRef.current?.focus();
      }
    }
    wasEditing.current = !!editing;
  }, [editing]);

  function open(goal?: WorkoutGoal, trigger?: HTMLElement | null) {
    setNotice('');
    triggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setEditing({ id: goal?.id ?? null, revision: data.revision, draft: goal ? draftOf(goal) :
      { name: scope?.name ?? '', unit: scope?.unit ?? 'lb', bodyweight: scope?.bodyweight === true, weight: '', reps: '' } });
  }
  async function remove(goal: WorkoutGoal) {
    if (!store || !window.confirm(`Delete the goal for ${groupLabel(goal)}? Logged workouts stay saved.`)) return;
    const result = await store.getState().deleteGoal(goal.id);
    setNotice(result.ok ? 'Goal deleted.' : result.message);
    if (result.ok) {
      addBtnRef.current?.focus();
    }
  }

  return <section aria-labelledby={titleId} className="space-y-3">
    <h2 id={titleId} className="text-xl font-semibold text-white">Goals</h2>
    <p className="text-sm text-slate-400">Goal progress comes only from regular sets you logged in completed workouts. Warm-ups and planned targets never count.
      {' '}Each goal matches one exact exercise name, unit and bodyweight setting.</p>
    <p role="status" aria-live="polite" className="text-sm text-accent">{notice}</p>
    {!goals.length && <p className="text-slate-400">{scope ? 'No goal for this exercise yet.' : 'No goals yet.'}</p>}
    {goals.length > 0 && <ul className="space-y-3">{goals.map(goal => <li key={goal.id}>
      <GoalCard goal={goal} progress={goalProgress(data.history, goal)} onHistory={onHistory}
        onEdit={store && !editing ? trigger => open(goal, trigger) : undefined} onDelete={store && !editing ? () => { void remove(goal); } : undefined} />
    </li>)}</ul>}
    {store && editing && <GoalForm key={`${editing.id}:${editing.revision}`} store={store} editing={editing}
      onReopen={() => {
        const saved = store.getState().data.goals?.find(goal => goal.id === editing.id);
        if (saved) open(saved); else { setEditing(null); setNotice('This goal was deleted on another screen.'); }
      }}
      onClose={saved => { setEditing(null); if (saved) setNotice('Goal saved.'); }} />}
    {store && !editing && <button ref={addBtnRef} type="button" className="btn-ghost" onClick={e => open(undefined, e.currentTarget)}>Add goal</button>}
  </section>;
}

function GoalCard({ goal, progress, onHistory, onEdit, onDelete }: {
  goal: WorkoutGoal; progress: GoalProgress; onHistory: (id: string) => void; onEdit?: (trigger?: HTMLElement | null) => void; onDelete?: () => void;
}) {
  const label = groupLabel(goal);
  const bodyweight = goal.bodyweight === true;
  return <article aria-label={`Goal for ${label}`} className="card min-w-0 space-y-2 p-4">
    <h3 className="break-words font-semibold text-white">{label}</h3>
    <p className="text-sm tabular-nums text-slate-300">Goal: {sets(goal.reps, goal.weight, goal.unit, bodyweight)}
      <AlternateWeight weight={goal.weight} unit={goal.unit} bodyweight={bodyweight} /></p>
    {progress.status === 'none' && <p className="text-sm text-slate-400">No regular sets logged yet for this exact name and unit.</p>}
    {progress.status !== 'none' && <div className="text-sm tabular-nums text-slate-300">
      {progress.status === 'achieved' ? <p>Achieved: {sets(progress.set.reps, progress.set.weight, goal.unit, bodyweight)}
        {' '}in {progress.set.workoutName} on {new Date(progress.set.finishedAt).toLocaleDateString()}.</p> :
        <p>Best so far: {sets(progress.set.reps, progress.set.weight, goal.unit, bodyweight)}
          <AlternateWeight weight={progress.set.weight} unit={goal.unit} bodyweight={bodyweight} />
          {' — '}{[progress.weightShortfall > 0 ? `${round(progress.weightShortfall)} ${goal.unit}` : '',
            progress.repsShortfall > 0 ? `${progress.repsShortfall} more ${progress.repsShortfall === 1 ? 'rep' : 'reps'}` : '']
            .filter(Boolean).join(' and ')} to go.</p>}
      <button type="button" className="mt-1 text-accent underline underline-offset-4"
        aria-label={`View ${progress.status === 'achieved' ? 'achieving' : 'best'} workout for ${label}`}
        onClick={() => onHistory(progress.set.workoutId)}>View workout</button>
    </div>}
    {(onEdit || onDelete) && <div className="flex flex-wrap gap-2">
      {onEdit && <button type="button" className="btn-ghost" aria-label={`Edit goal for ${label}`} onClick={e => onEdit(e.currentTarget)}>Edit</button>}
      {onDelete && <button type="button" className="btn-ghost" aria-label={`Delete goal for ${label}`} onClick={onDelete}>Delete</button>}
    </div>}
  </article>;
}

function GoalForm({ store, editing, onReopen, onClose }: {
  store: WorkoutStore; editing: Editing; onReopen: () => void; onClose: (saved: boolean) => void;
}) {
  const state = useStore(store);
  const id = useId();
  const listId = `${id}-exercise-suggestions`;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const suggestions = useMemo(() => exerciseSuggestions(state.data), [state.data]);
  const [draft, setDraft] = useState(editing.draft);
  const [error, setError] = useState('');
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(editing.draft), [draft, editing.draft]);
  useUnsavedChanges(dirty);
  const disabled = !state.loaded || state.busy || state.needsReload;
  const change = (field: keyof Draft, value: string | boolean) => setDraft(current => ({ ...current, [field]: value }));

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const input: WorkoutGoalInput = { name: draft.name, unit: draft.unit, bodyweight: draft.bodyweight,
      weight: numeric(draft.weight), reps: numeric(draft.reps) };
    const result = editing.id ? await store.getState().updateGoal(editing.id, editing.revision, input) : await store.getState().createGoal(input);
    if (result.ok) onClose(true); else setError(result.message);
  }
  return <form aria-label="Save goal" onSubmit={save} className="card min-w-0 space-y-4 p-4">
    <h3 className="font-semibold text-white">{editing.id ? 'Edit goal' : 'Add goal'}</h3>
    <p className="text-xs text-slate-500">A goal is a target you set. It is never counted as a logged set.</p>
    {error && <div id={`${id}-error`} role="alert" className="space-y-2 text-sm text-warn"><p className="break-words">{error}</p>
      {editing.id && error.startsWith(STALE) && <p>Your draft is kept below. Reopen the goal to load the saved version, then edit again.</p>}</div>}
    {editing.id && error.startsWith(STALE) && <button type="button" className="btn-ghost" onClick={onReopen}>Reopen goal</button>}
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor={`${id}-name`} className="text-sm text-slate-300">Exercise name</label>
          <input ref={nameInputRef} id={`${id}-name`} required maxLength={80} className={inputClass} value={draft.name} onChange={e => change('name', e.target.value)}
            list={suggestions.length ? listId : undefined} autoComplete="off" />
          {suggestions.length > 0 && <datalist id={listId}>{suggestions.map(name => <option key={name} value={name} />)}</datalist>}</div>
        <div><label htmlFor={`${id}-unit`} className="text-sm text-slate-300">Weight unit</label>
          <select id={`${id}-unit`} className={inputClass} value={draft.unit} onChange={e => change('unit', e.target.value)}>
            <option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option>
          </select></div>
      </div>
      <div className="flex items-center gap-2">
        <input id={`${id}-bodyweight`} type="checkbox" checked={draft.bodyweight} onChange={e => change('bodyweight', e.target.checked)} />
        <label htmlFor={`${id}-bodyweight`} className="text-sm text-slate-300">Bodyweight exercise</label>
      </div>
      {draft.bodyweight && <p id={`${id}-weight-desc`} className="text-xs text-slate-500">Enter added weight: 0 for bodyweight only, a negative number for assistance.</p>}
      <div className="grid grid-cols-2 gap-4">
        <div><label htmlFor={`${id}-weight`} className="text-sm text-slate-300">{draft.bodyweight ? 'Added weight' : 'Goal weight'} ({draft.unit})</label>
          <input id={`${id}-weight`} type="number" inputMode="decimal" min={draft.bodyweight ? -1000 : 0} max={10000} step="any"
            aria-describedby={draft.bodyweight ? `${id}-weight-desc` : undefined}
            className={inputClass} value={draft.weight} onChange={e => change('weight', e.target.value)} /></div>
        <div><label htmlFor={`${id}-reps`} className="text-sm text-slate-300">Goal reps</label>
          <input id={`${id}-reps`} type="number" inputMode="numeric" min={1} max={1000} step={1}
            className={inputClass} value={draft.reps} onChange={e => change('reps', e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">Save goal</button>
        <button type="button" className="btn-ghost" onClick={() => onClose(false)}>Cancel</button>
      </div>
    </fieldset>
  </form>;
}
