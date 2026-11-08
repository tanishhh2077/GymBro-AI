import { useId, useState } from 'react';
import type { WeightUnit } from '@/types/workout';
import type { WorkoutResult } from '@/types/workout';
import { suggestWarmupRamp } from '@/core/warmupRamp';
import { WorkoutError } from '@/core/workouts';
import { useUnsavedChanges } from './unsavedChanges';

const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
interface Row { readonly key: number; readonly reps: string; readonly weight: string }

/**
 * Optional helper that proposes an editable ramp of lighter sets before the working weight. The numbers are only
 * a starting point; each row can be changed or removed, and nothing is saved until "Add these warm-up sets".
 */
export function WarmupSuggestion({ name, unit, prefill, disabled, addWarmup }: {
  name: string; unit: WeightUnit; prefill?: number; disabled?: boolean;
  addWarmup: (reps: number, weight: number) => Promise<WorkoutResult>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState('');
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState(false);
  const [counter, setCounter] = useState(0);
  useUnsavedChanges(open && rows.length > 0);

  function build(text: string) {
    setStatus(''); setMessage('');
    try {
      const steps = suggestWarmupRamp(text.trim() ? Number(text) : NaN, unit);
      setRows(steps.map((step, index) => ({ key: counter + index, reps: String(step.reps), weight: String(step.weight) })));
      setCounter(counter + steps.length);
      if (!steps.length) setMessage('This working weight is too light for a ramp. Log the set directly.');
    } catch (error) {
      setRows([]); setMessage(error instanceof WorkoutError ? error.message : 'Enter a working weight above 0.');
    }
  }
  function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true); setStatus('');
    if (prefill !== undefined) { setWorking(String(prefill)); build(String(prefill)); }
  }
  function change(key: number, field: 'reps' | 'weight', value: string) {
    setRows(current => current.map(row => row.key === key ? { ...row, [field]: value } : row));
  }
  async function add() {
    setAdding(true); setMessage(''); setStatus('');
    let done = 0;
    for (const row of rows) {
      const result = await addWarmup(row.reps.trim() ? Number(row.reps) : NaN, row.weight.trim() ? Number(row.weight) : NaN);
      if (!result.ok) {
        setMessage(result.message); setRows(current => current.slice(done));
        if (done) setStatus(`Added ${done} warm-up ${done === 1 ? 'set' : 'sets'} before the problem.`);
        setAdding(false); return;
      }
      done++;
    }
    setRows([]); setOpen(false); setStatus(`Added ${done} warm-up ${done === 1 ? 'set' : 'sets'}.`); setAdding(false);
  }
  return <div className="mb-4">
    <button type="button" className="btn-ghost" aria-expanded={open} aria-label={`Suggest warm-up sets for ${name}`}
      disabled={disabled} onClick={toggle}>Suggest warm-up sets</button>
    <span role="status" className="ml-3 text-sm text-accent">{status}</span>
    {open && <form aria-label={`Warm-up suggestion for ${name}`} className="mt-3 space-y-3 rounded-lg bg-white/5 p-3"
      onSubmit={event => { event.preventDefault(); build(working); }}>
      <p className="text-xs text-slate-400">A starting point you can change. Rows climb toward your working weight; edit or remove any of them.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1"><label htmlFor={`${id}-working`} className="text-sm text-slate-300">Working weight ({unit})</label>
          <input id={`${id}-working`} type="number" inputMode="decimal" min={0} max={10000} step="any" className={inputClass}
            value={working} onChange={event => setWorking(event.target.value)} /></div>
        <button type="submit" className="btn-ghost">{rows.length ? 'Rebuild suggestion' : 'Build suggestion'}</button>
      </div>
      {rows.length > 0 && <ol className="space-y-2">{rows.map((row, index) => <li key={row.key} className="flex flex-wrap items-end gap-2">
        <span className="w-6 pb-2 text-sm text-slate-300">{index + 1}.</span>
        <div className="min-w-0 flex-1"><label htmlFor={`${id}-reps-${row.key}`} className="text-xs text-slate-400">Warm-up {index + 1} reps</label>
          <input id={`${id}-reps-${row.key}`} type="number" inputMode="numeric" min={1} max={1000} step={1} className={inputClass}
            value={row.reps} onChange={event => change(row.key, 'reps', event.target.value)} /></div>
        <div className="min-w-0 flex-1"><label htmlFor={`${id}-weight-${row.key}`} className="text-xs text-slate-400">Warm-up {index + 1} weight ({unit})</label>
          <input id={`${id}-weight-${row.key}`} type="number" inputMode="decimal" min={0} max={10000} step="any" className={inputClass}
            value={row.weight} onChange={event => change(row.key, 'weight', event.target.value)} /></div>
        <button type="button" className="px-2 py-2 text-slate-400" aria-label={`Remove warm-up row ${index + 1} for ${name}`}
          onClick={() => setRows(current => current.filter(item => item.key !== row.key))}>Remove</button>
      </li>)}</ol>}
      {message && <p role="alert" className="text-sm text-warn">{message}</p>}
      {rows.length > 0 && <button type="button" className="btn-primary" disabled={adding} onClick={add}>Add these warm-up sets</button>}
    </form>}
  </div>;
}

