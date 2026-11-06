import { useId, useState } from 'react';
import { useStore } from 'zustand';
import type { WorkoutRoutine } from '@/types/workout';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { RoutineEditor } from './RoutineEditor';

export function WorkoutRoutines({ store, onStarted, onResume }: { store: WorkoutStore; onStarted: () => void; onResume: () => void }) {
  const state = useStore(store);
  // Capture record and revision together; a later reload must not legitimize an old draft.
  const [editor, setEditor] = useState<{ routine?: WorkoutRoutine; revision: number } | null>(null);
  const [notice, setNotice] = useState('');
  const filterId = useId();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('creation');
  const disabled = state.busy || state.needsReload || !state.loaded;
  const routines = state.data.routines ?? [];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleRoutines = routines.filter(routine => [routine.name, ...routine.exercises.map(exercise => exercise.name)]
    .some(name => name.toLocaleLowerCase().includes(normalizedQuery)));
  if (sort === 'name') visibleRoutines.sort((a, b) => a.name.localeCompare(b.name));
  if (editor) return <RoutineEditor store={store} routine={editor.routine} expectedRevision={editor.revision}
    onClose={saved => { setEditor(null); setNotice(saved ? 'Routine saved.' : ''); }} />;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-3xl font-bold text-white">Routines</h1><p className="mt-2 text-sm text-slate-400">Your exercise plans, ready for a fresh workout.</p></div>
      <button type="button" className="btn-primary" disabled={disabled || routines.length >= 100} onClick={() => {
        setNotice(''); setEditor({ revision: state.data.revision });
      }}>New routine</button>
    </div>
    {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
    {!state.loaded ? <p className="text-slate-400">Open saved workouts to view routines.</p> : <>
      {state.data.active && <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-slate-300">
        <p>Finish or discard the active workout before starting another routine.</p>
        <button type="button" className="mt-2 text-accent underline underline-offset-4" onClick={onResume}>Resume workout</button>
      </div>}
      {!!routines.length && <div className="space-y-3">
        <div><label htmlFor={`${filterId}-search`} className="mb-1 block text-sm text-slate-400">Search routines or exercises</label>
          <input id={`${filterId}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)}
            className="w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white" /></div>
        <div><label htmlFor={`${filterId}-sort`} className="mb-1 block text-sm text-slate-400">Sort routines</label>
          <select id={`${filterId}-sort`} value={sort} onChange={event => setSort(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white">
            <option value="creation">Creation order</option><option value="name">Name (A�Z)</option>
          </select></div>
        <button type="button" className="btn-ghost" onClick={() => { setQuery(''); setSort('creation'); }}>Clear routine filters</button>
        <p className="text-sm text-slate-400">{visibleRoutines.length} of {routines.length} routines match</p>
      </div>}
      {!routines.length ? <p className="text-slate-400">Save a routine to reuse your exercise plan without retyping it.</p> :
        !visibleRoutines.length ? <p className="text-slate-400">No routines match these filters.</p> :
        <div className="space-y-4">{visibleRoutines.map(routine => <section key={routine.id} aria-labelledby={`routine-${routine.id}`} className="card min-w-0 p-4 sm:p-5">
          <h2 id={`routine-${routine.id}`} className="break-words text-xl font-semibold text-white">{routine.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{routine.exercises.length} exercises · weights in {routine.unit}</p>
          <ol className="my-4 list-inside list-decimal space-y-2 text-sm text-slate-300">{routine.exercises.map(e => <li key={e.id} className="break-words">
            {e.name}{e.targetSets !== undefined && <span className="text-slate-400"> · {e.targetSets} sets</span>}
            {e.targetReps !== undefined && <span className="text-slate-400"> · {e.targetReps} reps per set</span>}
          </li>)}</ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" aria-label={`Start routine ${routine.name}`} disabled={disabled || !!state.data.active}
              onClick={async () => { if ((await state.startRoutine(routine.id)).ok) onStarted(); }}>Start routine</button>
            <button type="button" className="btn-ghost" aria-label={`Edit routine ${routine.name}`} disabled={disabled} onClick={() => {
              setNotice(''); setEditor({ routine, revision: state.data.revision });
            }}>Edit</button>
            <button type="button" className="btn-ghost" aria-label={`Duplicate routine ${routine.name}`} disabled={disabled || routines.length >= 100} onClick={async () => {
              setNotice('');
              if ((await state.duplicateRoutine(routine.id)).ok) setNotice('Routine duplicated.');
            }}>Duplicate</button>
            <button type="button" className="btn-ghost text-danger" aria-label={`Delete routine ${routine.name}`} disabled={disabled} onClick={async () => {
              if (window.confirm(`Delete routine ${routine.name}? Existing workouts will stay saved.`) && (await state.deleteRoutine(routine.id)).ok) setNotice('Routine deleted.');
            }}>Delete</button>
          </div>
        </section>)}</div>}
      {routines.length >= 100 && <p className="text-sm text-slate-400">You have 100 routines. Delete one before creating another.</p>}
    </>}
    <p className="text-xs text-slate-500">Routines are saved on this device. Clearing app or browser data removes them. Targets are plans; only logged sets count as completed work.</p>
  </div>;
}
