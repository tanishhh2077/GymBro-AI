import { useState } from 'react';
import { useStore } from 'zustand';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { isBenchPressName } from '@/core/setLinks';
import { SetAnalysisButton, type SetAnalysisActions } from './SetAnalysisButton';

export function WorkoutHistory({ store, initialId, analysis }: { store: WorkoutStore; initialId?: string; analysis?: SetAnalysisActions }) {
  const state = useStore(store);
  const [selectedId, setSelectedId] = useState(initialId);
  const [visible, setVisible] = useState(20);
  const selected = state.data.history.find(w => w.id === selectedId);
  const history = [...state.data.history].sort((a, b) => b.finishedAt! - a.finishedAt!);
  if (selected) return <div className="space-y-5">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={() => setSelectedId(undefined)}>Back to history</button>
    <div><h1 className="break-words text-3xl font-bold text-white">{selected.name}</h1><p className="mt-2 text-sm text-slate-400">{new Date(selected.finishedAt!).toLocaleString()} · weights in {selected.unit}</p></div>
    {selected.exercises.map(e => <section key={e.id} className="border-t border-white/10 pt-4">
      <h2 className="break-words text-xl font-semibold text-white">{e.name}</h2>
      <table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Saved sets for {e.name}</caption>
        <thead className="text-slate-400"><tr><th className="py-2">Set</th><th>Reps</th><th>Weight</th>{analysis && isBenchPressName(e.name) && <th><span className="sr-only">Actions</span></th>}</tr></thead>
        <tbody>{e.sets.map((set, i) => <tr key={set.id} id={`set-row-${set.id}`} tabIndex={-1}><td className="py-2">{i + 1}</td><td>{set.reps}</td><td>{set.weight} {selected.unit}</td>
          {analysis && isBenchPressName(e.name) && <td className="text-right"><SetAnalysisButton link={{ workoutId: selected.id, exerciseId: e.id, setId: set.id }}
            exerciseName={e.name} setNumber={i + 1} actions={analysis} disabled={state.busy || state.needsReload || !state.loaded} /></td>}</tr>)}</tbody>
      </table></section>)}
    <button type="button" disabled={state.busy || state.needsReload} className="btn-ghost text-danger" onClick={async () => {
      if (window.confirm(`Delete the saved workout ${selected.name}?`) && (await state.deleteWorkout(selected.id)).ok) setSelectedId(undefined);
    }}>Delete workout</button>
  </div>;
  return <div className="space-y-5"><h1 className="text-3xl font-bold text-white">Workout history</h1>
    {!history.length ? <p className="text-slate-400">Finish a workout to see it here.</p> : <ul className="divide-y divide-white/10">{history.slice(0, visible).map(w => <li key={w.id}>
      <button type="button" className="w-full py-4 text-left" onClick={() => setSelectedId(w.id)}><span className="block break-words font-semibold text-white">{w.name}</span><span className="mt-1 block text-sm text-slate-400">{new Date(w.finishedAt!).toLocaleDateString()} · {w.exercises.length} exercises · {w.unit}</span></button>
    </li>)}</ul>}
    {history.length > visible && <button type="button" className="btn-ghost" onClick={() => setVisible(n => n + 20)}>Show more workouts</button>}
  </div>;
}
