import { useId, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { RoutineInput, WeightUnit, WorkoutRoutine } from '@/types/workout';
import type { WorkoutStore } from '@/store/useWorkoutStore';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
interface Row { key: string; name: string; sets: string; reps: string }
export function RoutineEditor({ store, routine, expectedRevision, onClose }: {
  store: WorkoutStore; routine?: WorkoutRoutine; expectedRevision: number; onClose: (saved: boolean) => void;
}) {
  const state = useStore(store);
  const id = useId();
  const sequence = useRef(0);
  const [name, setName] = useState(routine?.name ?? '');
  const [unit, setUnit] = useState<WeightUnit>(routine?.unit ?? 'lb');
  const [rows, setRows] = useState<Row[]>(() => routine ? routine.exercises.map(e => ({ key: e.id, name: e.name,
    sets: e.targetSets === undefined ? '' : String(e.targetSets), reps: e.targetReps === undefined ? '' : String(e.targetReps) }))
    : [{ key: 'draft:0', name: '', sets: '', reps: '' }]);
  const [error, setError] = useState('');
  const disabled = !state.loaded || state.busy || state.needsReload;
  function change(key: string, field: 'name' | 'sets' | 'reps', value: string) {
    setRows(current => current.map(row => row.key === key ? { ...row, [field]: value } : row));
  }
  function move(key: string, direction: number) {
    setRows(current => {
      const at = current.findIndex(row => row.key === key), to = at + direction;
      if (at < 0 || to < 0 || to >= current.length) return current;
      const next = [...current]; const [row] = next.splice(at, 1); next.splice(to, 0, row); return next;
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const input: RoutineInput = { name, unit, exercises: rows.map(row => ({ name: row.name,
      ...(row.sets.trim() ? { targetSets: Number(row.sets) } : {}), ...(row.reps.trim() ? { targetReps: Number(row.reps) } : {}) })) };
    const result = routine ? await state.updateRoutine(routine.id, expectedRevision, input) : await state.createRoutine(input);
    if (result.ok) onClose(true); else setError(result.message);
  }
  return <div className="space-y-5">
    <div><h1 className="text-3xl font-bold text-white">{routine ? 'Edit routine' : 'New routine'}</h1>
      <p className="mt-2 text-sm text-slate-400">Plan exercises in order. Optional targets are separate from the sets you actually log.</p></div>
    {error && error !== state.error && <p role="alert" className="text-sm text-warn">{error}</p>}
    <form aria-label="Save routine" onSubmit={save}>
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor={`${id}-name`} className="text-sm text-slate-300">Routine name</label>
            <input id={`${id}-name`} required maxLength={80} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label htmlFor={`${id}-unit`} className="text-sm text-slate-300">Routine weight unit</label>
            <select id={`${id}-unit`} className={inputClass} value={unit} onChange={e => setUnit(e.target.value as WeightUnit)}>
              <option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option>
            </select></div>
        </div>
        <div className="space-y-4">{rows.map((row, index) => <fieldset key={row.key} className="min-w-0 rounded-xl border border-white/10 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-300">Exercise {index + 1}</legend>
          <div><label htmlFor={`${id}-${row.key}-name`} className="text-sm text-slate-300">Exercise {index + 1} name</label>
            <input id={`${id}-${row.key}-name`} required maxLength={80} className={inputClass} value={row.name} onChange={e => change(row.key, 'name', e.target.value)} /></div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><label htmlFor={`${id}-${row.key}-sets`} className="text-xs text-slate-400">Target sets for exercise {index + 1}</label>
              <input id={`${id}-${row.key}-sets`} type="number" inputMode="numeric" min={1} max={100} step={1} placeholder="Optional"
                className={inputClass} value={row.sets} onChange={e => change(row.key, 'sets', e.target.value)} /></div>
            <div><label htmlFor={`${id}-${row.key}-reps`} className="text-xs text-slate-400">Target reps for exercise {index + 1}</label>
              <input id={`${id}-${row.key}-reps`} type="number" inputMode="numeric" min={1} max={1000} step={1} placeholder="Optional"
                className={inputClass} value={row.reps} onChange={e => change(row.key, 'reps', e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" disabled={index === 0} aria-label={`Move exercise ${index + 1} up`} onClick={() => move(row.key, -1)}>Move up</button>
            <button type="button" className="btn-ghost" disabled={index === rows.length - 1} aria-label={`Move exercise ${index + 1} down`} onClick={() => move(row.key, 1)}>Move down</button>
            <button type="button" className="btn-ghost text-danger" aria-label={`Remove routine exercise ${index + 1}`} onClick={() => setRows(current => current.filter(e => e.key !== row.key))}>Remove</button>
          </div>
        </fieldset>)}</div>
        {!rows.length && <p className="text-sm text-slate-400">Add at least one exercise before saving.</p>}
        <button type="button" className="btn-ghost" disabled={rows.length >= 100} onClick={() => {
          const key = `draft:${++sequence.current}`; setRows(current => [...current, { key, name: '', sets: '', reps: '' }]);
        }}>Add routine exercise</button>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn-primary" disabled={!rows.length}>Save routine</button>
          <span className="text-xs text-slate-500">Targets: 1–100 sets, 1–1000 reps, or leave blank.</span></div>
      </fieldset>
    </form>
    <button type="button" className="text-sm text-slate-400 underline underline-offset-4" disabled={state.busy} onClick={() => onClose(false)}>Cancel routine edit</button>
  </div>;
}
