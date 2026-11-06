import { useId, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { SetKind, Workout } from '@/types/workout';

const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
export function CompletedWorkoutEditor({ store, workout, expectedRevision, onClose }: {
  store: WorkoutStore; workout: Workout; expectedRevision: number; onClose: () => void;
}) {
  const state = useStore(store);
  const id = useId();
  const [name, setName] = useState(workout.name);
  const [exercises, setExercises] = useState(() => workout.exercises.map(exercise => ({ ...exercise,
    sets: exercise.sets.map(set => ({ id: set.id, reps: String(set.reps), weight: String(set.weight), kind: set.kind ?? 'regular' })) })));
  const [error, setError] = useState('');
  const stale = state.data.revision !== expectedRevision;
  const disabled = state.busy || !state.loaded || state.needsReload || stale;
  function change(exerciseId: string, setId: string, field: 'reps' | 'weight' | 'kind', value: string) {
    setExercises(current => current.map(exercise => exercise.id === exerciseId ? { ...exercise,
      sets: exercise.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) } : exercise));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    if (exercises.some(e => e.sets.some(set => !set.reps.trim() || !set.weight.trim()))) {
      setError('Enter reps and weight for every set. Use 0 for no added load.'); return;
    }
    const result = await state.correctCompletedWorkout(workout.id, expectedRevision, { name,
      exercises: exercises.map(e => ({ id: e.id, sets: e.sets.map(set => ({ id: set.id,
        reps: Number(set.reps), weight: Number(set.weight), kind: set.kind as SetKind })) })) });
    if (result.ok) onClose(); else setError(result.message);
  }
  return <div className="space-y-5">
    <h1 className="text-3xl font-bold text-white">Edit completed workout</h1>
    <p className="text-sm text-slate-400">Correct the name and logged set values. Weights in {workout.unit}. Progress and summaries use the saved corrections.</p>
    {stale && <p role="alert" className="text-sm text-warn">Saved workouts changed. Cancel and reopen this workout before saving your edits.</p>}
    {(error || state.error) && <p role="alert" className="text-sm text-warn">{error || state.error}</p>}
    <form aria-label="Correct completed workout" onSubmit={save}>
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        <div><label htmlFor={`${id}-name`} className="text-sm text-slate-300">Workout name</label>
          <input id={`${id}-name`} required maxLength={80} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></div>
        {exercises.map((exercise, exerciseIndex) => <fieldset key={exercise.id} className="min-w-0 space-y-4 border-t border-white/10 pt-4">
          <legend className="break-words text-lg font-semibold text-white">{exercise.name}</legend>
          {exercise.sets.map((set, index) => {
            const prefix = `${id}-${exercise.id}-${set.id}`;
            const label = `Exercise ${exerciseIndex + 1} set ${index + 1}`;
            return <div key={set.id} className="min-w-0 rounded-lg border border-white/10 p-3">
              <p className="text-sm text-slate-300">Set {index + 1}</p>
              <div className="mt-2 grid min-w-0 grid-cols-2 gap-3">
                <div className="min-w-0"><label htmlFor={`${prefix}-reps`} className="text-xs text-slate-400">{label} reps</label>
                  <input id={`${prefix}-reps`} required type="number" inputMode="numeric" min={1} max={1000} step={1} className={inputClass}
                    value={set.reps} onChange={e => change(exercise.id, set.id, 'reps', e.target.value)} /></div>
                <div className="min-w-0"><label htmlFor={`${prefix}-weight`} className="text-xs text-slate-400">{label} weight ({workout.unit})</label>
                  <input id={`${prefix}-weight`} required type="number" inputMode="decimal" min={0} max={10000} step="any" className={inputClass}
                    value={set.weight} onChange={e => change(exercise.id, set.id, 'weight', e.target.value)} /></div>
              </div>
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
    <button type="button" className="btn-ghost" disabled={state.busy} onClick={onClose}>Cancel workout edit</button>
  </div>;
}
