import { useId, useState } from 'react';
import { useStore } from 'zustand';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { isBenchPressName } from '@/core/setLinks';
import { filterWorkoutHistory, type HistoryFilters } from '@/core/historyFilters';
import { SetAnalysisButton, type SetAnalysisActions } from './SetAnalysisButton';
import type { Workout } from '@/types/workout';
import { CompletedWorkoutEditor } from './CompletedWorkoutEditor';
import { WorkoutCalendar } from './WorkoutCalendar';
import { RpeText, WeightText } from './trainingDetail';
import { supersetNames } from './trainingDetailText';

const inputClass = 'w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';

export function WorkoutHistory({ store, initialId, analysis, onSummary, onWorkout }: {
  store: WorkoutStore; initialId?: string; analysis?: SetAnalysisActions; onSummary?: (id: string) => void;
  /** Opens the active workout after Repeat, or to resume the one that blocks it. */
  onWorkout?: () => void;
}) {
  const state = useStore(store);
  const [selectedId, setSelectedId] = useState(initialId);
  const [requestedId, setRequestedId] = useState(initialId);
  const [filters, setFilters] = useState<HistoryFilters>({ query: '', from: '', to: '' });
  const filterId = useId();
  const [visible, setVisible] = useState(20);
  const [editing, setEditing] = useState<{ workout: Workout; revision: number } | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [repeatError, setRepeatError] = useState('');
  if (initialId !== requestedId) {
    setRequestedId(initialId);
    setSelectedId(initialId);
    setEditing(null);
    setRepeatError('');
  }
  // Direct links resolve against all saved workouts, even when filters exclude them.
  const selected = state.data.history.find(w => w.id === selectedId);
  const total = state.data.history.filter(w => typeof w.finishedAt === 'number' && w.finishedAt > 0).length;
  const { workouts: history, error } = filterWorkoutHistory(state.data.history, filters);
  function changeFilter(field: keyof HistoryFilters, value: string) {
    setFilters(current => ({ ...current, [field]: value }));
    setVisible(20);
  }
  if (editing) return <CompletedWorkoutEditor store={store} workout={editing.workout} expectedRevision={editing.revision} onClose={() => setEditing(null)} />;
  if (selected) return <div className="space-y-5">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={() => { setSelectedId(undefined); setRepeatError(''); }}>Back to history</button>
    <div><h1 className="break-words text-3xl font-bold text-white">{selected.name}</h1><p className="mt-2 text-sm text-slate-400">{new Date(selected.finishedAt!).toLocaleString()} · weights in {selected.unit}</p></div>
    {onSummary && <button type="button" className="btn-ghost" onClick={() => onSummary(selected.id)}>View summary</button>}
    <button type="button" className="btn-ghost" disabled={state.busy || state.needsReload || !state.loaded}
      onClick={() => setEditing({ workout: selected, revision: state.data.revision })}>Edit completed workout</button>
    {onWorkout && <button type="button" className="btn-ghost" disabled={state.busy || state.needsReload || !state.loaded} onClick={async () => {
      setRepeatError('');
      const result = await state.repeatWorkout(selected.id);
      if (result.ok) onWorkout(); else setRepeatError(result.message);
    }}>Repeat workout</button>}
    {repeatError && <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-slate-300">
      {repeatError !== state.error && <p role="alert">{repeatError}</p>}
      {state.data.active && <button type="button" className="mt-2 text-accent underline underline-offset-4" onClick={onWorkout}>Resume workout</button>}
    </div>}
    {selected.note && <section aria-labelledby="saved-workout-note" className="rounded-lg bg-white/5 p-3">
      <h2 id="saved-workout-note" className="text-sm font-semibold text-slate-300">Workout note</h2>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-200">{selected.note}</p>
    </section>}
    {selected.exercises.map(e => <section key={e.id} className="border-t border-white/10 pt-4">
      <h2 className="break-words text-xl font-semibold text-white">{e.name}</h2>
      {(e.superset !== undefined || e.bodyweight) && <p className="text-xs text-accent">
        {[e.superset !== undefined ? supersetNames(selected.exercises).get(e.superset) : '', e.bodyweight ? 'Bodyweight exercise' : ''].filter(Boolean).join(' · ')}</p>}
      <table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Saved sets for {e.name}</caption>
        <thead className="text-slate-400"><tr><th className="py-2">Set</th><th>Reps</th><th>{e.bodyweight ? 'Added weight' : 'Weight'}</th><th>RPE</th>{analysis && isBenchPressName(e.name) && <th><span className="sr-only">Actions</span></th>}</tr></thead>
        <tbody>{e.sets.map((set, i) => <tr key={set.id} id={`set-row-${set.id}`} tabIndex={-1}><td className="py-2">{i + 1}<span className="block text-xs text-slate-400">{set.kind === 'warmup' ? 'Warm-up' : 'Regular'}</span></td><td>{set.reps}</td>
          <td><WeightText weight={set.weight} unit={selected.unit} bodyweight={e.bodyweight} /></td><td><RpeText rpe={set.rpe} /></td>
          {analysis && isBenchPressName(e.name) && <td className="text-right"><SetAnalysisButton link={{ workoutId: selected.id, exerciseId: e.id, setId: set.id }}
            exerciseName={e.name} setNumber={i + 1} actions={analysis} disabled={state.busy || state.needsReload || !state.loaded} /></td>}</tr>)}</tbody>
      </table></section>)}
    <button type="button" disabled={state.busy || state.needsReload} className="btn-ghost text-danger" onClick={async () => {
      if (window.confirm(`Delete the saved workout ${selected.name}?`) && (await state.deleteWorkout(selected.id)).ok) setSelectedId(undefined);
    }}>Delete workout</button>
  </div>;
  return <div className="space-y-5"><h1 className="text-3xl font-bold text-white">Workout history</h1>
    <button type="button" className="btn-ghost" aria-expanded={showCalendar} onClick={() => setShowCalendar(value => !value)}>{showCalendar ? 'Hide calendar' : 'Show calendar'}</button>
    {showCalendar && <WorkoutCalendar history={state.data.history} from={filters.from} to={filters.to} onSelect={day => {
      setFilters(current => ({ ...current, from: day, to: day })); setVisible(20);
    }} />}
    <section aria-label="History filters" className="space-y-3">
      <div><label htmlFor={`${filterId}-search`} className="mb-1 block text-sm text-slate-400">Search workouts or exercises</label>
        <div className="flex gap-2">
          <input id={`${filterId}-search`} type="search" className={`${inputClass} flex-1`} value={filters.query}
            placeholder="Search by workout or exercise"
            onChange={event => changeFilter('query', event.target.value)}
            onKeyDown={event => { if (event.key === 'Escape' && filters.query) { changeFilter('query', ''); } }} />
          {filters.query && <button type="button" aria-label="Clear search" className="btn-ghost shrink-0" onClick={() => changeFilter('query', '')}>Clear search</button>}
        </div></div>
      <p id={`${filterId}-dates`} className="text-xs text-slate-400">Completion dates, inclusive, in your local time.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['from', 'to'] as const).map(field => <div key={field} className="min-w-0">
          <label htmlFor={`${filterId}-${field}`} className="mb-1 block text-sm text-slate-400">{field === 'from' ? 'From' : 'To'}</label>
          <input id={`${filterId}-${field}`} type="date" className={inputClass} value={filters[field]}
            aria-invalid={error ? true : undefined} aria-describedby={`${filterId}-dates${error ? ` ${filterId}-error` : ''}`}
            onChange={event => changeFilter(field, event.target.value)} />
        </div>)}
      </div>
      <button type="button" className="btn-ghost" onClick={() => { setFilters({ query: '', from: '', to: '' }); setVisible(20); }}>Clear filters</button>
    </section>
    {error ? <p id={`${filterId}-error`} role="alert" className="text-sm text-warn">{error}</p> : <p role="status" className="text-sm text-slate-400">{history.length} of {total} workouts match</p>}
    {!total ? <p className="text-slate-400">Finish a workout to see it here.</p> : !error && (!history.length ? <p className="text-slate-400">No workouts match these filters.</p> : <ul className="divide-y divide-white/10">{history.slice(0, visible).map(w => <li key={w.id}>
      <button type="button" className="w-full py-4 text-left" onClick={() => setSelectedId(w.id)}><span className="block break-words font-semibold text-white">{w.name}</span><span className="mt-1 block text-sm text-slate-400">{new Date(w.finishedAt!).toLocaleDateString()} · {w.exercises.length} exercises · {w.unit}</span></button>
    </li>)}</ul>)}
    {history.length > visible && <button type="button" className="btn-ghost" onClick={() => setVisible(n => n + 20)}>Show more workouts</button>}
  </div>;
}
