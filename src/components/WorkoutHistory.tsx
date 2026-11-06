import { useId, useState } from 'react';
import { useStore } from 'zustand';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { isBenchPressName } from '@/core/setLinks';
import { filterWorkoutHistory, type HistoryFilters } from '@/core/historyFilters';
import { SetAnalysisButton, type SetAnalysisActions } from './SetAnalysisButton';

const inputClass = 'w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';

export function WorkoutHistory({ store, initialId, analysis, onSummary }: { store: WorkoutStore; initialId?: string; analysis?: SetAnalysisActions; onSummary?: (id: string) => void }) {
  const state = useStore(store);
  const [selectedId, setSelectedId] = useState(initialId);
  const [requestedId, setRequestedId] = useState(initialId);
  const [filters, setFilters] = useState<HistoryFilters>({ query: '', from: '', to: '' });
  const filterId = useId();
  const [visible, setVisible] = useState(20);
  if (initialId !== requestedId) {
    setRequestedId(initialId);
    setSelectedId(initialId);
  }
  // Direct links resolve against all saved workouts, even when filters exclude them.
  const selected = state.data.history.find(w => w.id === selectedId);
  const { workouts: history, error } = filterWorkoutHistory(state.data.history, filters);
  function changeFilter(field: keyof HistoryFilters, value: string) {
    setFilters(current => ({ ...current, [field]: value }));
    setVisible(20);
  }
  if (selected) return <div className="space-y-5">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={() => setSelectedId(undefined)}>Back to history</button>
    <div><h1 className="break-words text-3xl font-bold text-white">{selected.name}</h1><p className="mt-2 text-sm text-slate-400">{new Date(selected.finishedAt!).toLocaleString()} · weights in {selected.unit}</p></div>
    {onSummary && <button type="button" className="btn-ghost" onClick={() => onSummary(selected.id)}>View summary</button>}
    {selected.exercises.map(e => <section key={e.id} className="border-t border-white/10 pt-4">
      <h2 className="break-words text-xl font-semibold text-white">{e.name}</h2>
      <table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Saved sets for {e.name}</caption>
        <thead className="text-slate-400"><tr><th className="py-2">Set</th><th>Reps</th><th>Weight</th>{analysis && isBenchPressName(e.name) && <th><span className="sr-only">Actions</span></th>}</tr></thead>
        <tbody>{e.sets.map((set, i) => <tr key={set.id} id={`set-row-${set.id}`} tabIndex={-1}><td className="py-2">{i + 1}<span className="block text-xs text-slate-400">{set.kind === 'warmup' ? 'Warm-up' : 'Regular'}</span></td><td>{set.reps}</td><td>{set.weight} {selected.unit}</td>
          {analysis && isBenchPressName(e.name) && <td className="text-right"><SetAnalysisButton link={{ workoutId: selected.id, exerciseId: e.id, setId: set.id }}
            exerciseName={e.name} setNumber={i + 1} actions={analysis} disabled={state.busy || state.needsReload || !state.loaded} /></td>}</tr>)}</tbody>
      </table></section>)}
    <button type="button" disabled={state.busy || state.needsReload} className="btn-ghost text-danger" onClick={async () => {
      if (window.confirm(`Delete the saved workout ${selected.name}?`) && (await state.deleteWorkout(selected.id)).ok) setSelectedId(undefined);
    }}>Delete workout</button>
  </div>;
  return <div className="space-y-5"><h1 className="text-3xl font-bold text-white">Workout history</h1>
    <section aria-label="History filters" className="space-y-3">
      <div><label htmlFor={`${filterId}-search`} className="mb-1 block text-sm text-slate-400">Search workouts or exercises</label>
        <input id={`${filterId}-search`} type="search" className={inputClass} value={filters.query}
          onChange={event => changeFilter('query', event.target.value)} /></div>
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
    {error ? <p id={`${filterId}-error`} role="alert" className="text-sm text-warn">{error}</p> : <p role="status" className="text-sm text-slate-400">{history.length} of {state.data.history.length} workouts match</p>}
    {!state.data.history.length ? <p className="text-slate-400">Finish a workout to see it here.</p> : !error && (!history.length ? <p className="text-slate-400">No workouts match these filters.</p> : <ul className="divide-y divide-white/10">{history.slice(0, visible).map(w => <li key={w.id}>
      <button type="button" className="w-full py-4 text-left" onClick={() => setSelectedId(w.id)}><span className="block break-words font-semibold text-white">{w.name}</span><span className="mt-1 block text-sm text-slate-400">{new Date(w.finishedAt!).toLocaleDateString()} · {w.exercises.length} exercises · {w.unit}</span></button>
    </li>)}</ul>)}
    {history.length > visible && <button type="button" className="btn-ghost" onClick={() => setVisible(n => n + 20)}>Show more workouts</button>}
  </div>;
}
