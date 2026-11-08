import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { mergeWorkoutBackup, type BackupMerge } from '@/core/workoutBackup';
import { readWorkoutImport } from '@/core/workoutImportFile';
import type { WorkoutImport as ImportResult } from '@/core/workoutImport';
import type { WeightUnit, WorkoutData } from '@/types/workout';
import type { WorkoutStore } from '@/store/useWorkoutStore';

interface Preview { result: ImportResult; source: WorkoutData; merge: BackupMerge; filename: string }
export function WorkoutImport({ store, onClose }: { store: WorkoutStore; onClose: () => void }) {
  const state = useStore(store);
  const [unit, setUnit] = useState<WeightUnit | ''>('');
  const [offset, setOffset] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const reader = useRef<AbortController | null>(null), mounted = useRef(false);
  const available = state.loaded && !state.needsReload;
  const blocked = !available || state.busy || reading;
  function clear() { reader.current?.abort(); reader.current = null; setReading(false); setPreview(null); setAcknowledged(false); }
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = store.subscribe((next, previous) => {
      if (next.busy || next.needsReload || next.data !== previous.data) {
        reader.current?.abort(); reader.current = null; setReading(false); setPreview(null); setAcknowledged(false);
      }
    });
    return () => { mounted.current = false; unsubscribe(); reader.current?.abort(); reader.current = null; };
  }, [store]);
  async function choose(file: File) {
    clear(); setError(''); setNotice('');
    if (offset.trim() === '' || !/^-?\d+$/.test(offset)) { setError('Enter the source UTC offset in minutes before choosing a file. For UTC use 0; Chicago standard time is -360.'); return; }
    const controller = new AbortController(); reader.current = controller; setReading(true);
    try {
      const result = await readWorkoutImport(file, { ...(unit ? { unit } : {}), utcOffsetMinutes: Number(offset) }, controller.signal);
      if (!mounted.current || reader.current !== controller) return;
      const current = store.getState();
      if (!current.loaded || current.needsReload || current.busy) throw new Error('Reload saved workouts, then choose the CSV again.');
      setPreview({ result, source: current.data, merge: mergeWorkoutBackup(current.data, result.backup), filename: file.name });
    } catch (failure) {
      if (mounted.current && reader.current === controller && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'The CSV could not be opened.');
    } finally { if (mounted.current && reader.current === controller) { reader.current = null; setReading(false); } }
  }
  async function save() {
    if (!preview || blocked || !acknowledged) return;
    const current = store.getState();
    if (current.data !== preview.source || current.busy || current.needsReload) { clear(); setError('Saved records changed. Choose the CSV again.'); return; }
    const result = await current.restoreBackup(preview.result.backup, preview.source.revision);
    if (!mounted.current) return;
    if (result.ok) { clear(); setNotice('Imported workout additions saved on this device.'); }
    else setError(result.message);
  }
  return <section className="space-y-4" aria-labelledby="workout-import-title">
    <button type="button" className="btn-ghost" onClick={onClose}>Back to backup and restore</button>
    <h2 id="workout-import-title" className="text-xl font-semibold text-white">Import workout CSV</h2>
    <p className="text-sm text-slate-400">Local processing only. Supports English Strong legacy CSV, Hevy weight_lbs exports and FitNotes Android 25.1 CSV with Weight and Weight Unit columns. Metric Hevy, newer Strong and other FitNotes variants are unsupported.</p>
    <p className="text-sm text-slate-400">Only external-load weight-and-reps sets are supported. Bodyweight, assisted, timed and distance sets stop the entire import. No records are saved until you confirm the preview.</p>
    {!available && <p role="status">Reload saved workouts to import.</p>}
    <label className="block text-sm">Strong file weight unit
      <select aria-label="Strong file weight unit" className="input ml-2" value={unit} disabled={state.busy} onChange={event => { clear(); setUnit(event.target.value as WeightUnit | ''); }}>
        <option value="">Choose if importing Strong</option><option value="kg">kg</option><option value="lb">lb</option>
      </select>
    </label>
    <label className="block text-sm">Source UTC offset in minutes
      <input aria-label="Source UTC offset in minutes" className="input ml-2" type="number" min={-840} max={840} step={1} value={offset} disabled={state.busy}
        onChange={event => { clear(); setOffset(event.target.value); }} />
    </label>
    <p className="text-xs text-slate-400">For example, UTC is 0 and Chicago standard time is -360. A fixed offset cannot recover daylight-saving changes across a long export. FitNotes date-only rows use midnight at this offset and have unknown duration.</p>
    <label htmlFor="workout-import-file" className="block text-sm">Choose workout CSV file</label>
    <input id="workout-import-file" type="file" accept=".csv,text/csv" disabled={!available || state.busy} className="block w-full min-w-0 text-sm"
      onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = '';
        if (!files.length) return;
        if (files.length !== 1) { clear(); setError('Choose one CSV file at a time.'); return; } void choose(files[0]); }} />
    <p className="text-xs text-slate-400">One UTF-8 CSV, up to 4 MiB and 10000 set rows. Saved-library limits also apply. Re-importing the same source sessions skips identical records; changed sessions conflict. Imports from different apps can duplicate the same real workout.</p>
    <p role="status" aria-live="polite">{reading ? 'Reading CSV…' : notice}</p>
    {error && <p role="alert" className="text-warn">{error}</p>}
    {preview && <div className="card space-y-3 p-4">
      <h3 className="font-semibold">Import preview</h3>
      <p className="break-all">{preview.filename} — {preview.result.format}</p>
      <p>{preview.merge.addedWorkouts} completed workouts to add; {preview.merge.duplicates} identical workouts skipped; {preview.result.sets} sets in file.</p>
      <ul className="list-disc space-y-2 pl-5 text-sm">{preview.result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      <details><summary>Review all imported workouts and sets</summary>
        {preview.result.backup.data.history.map(workout => <div key={workout.id} className="my-3 text-sm"><p className="font-semibold">{workout.name} — {new Date(workout.startedAt).toISOString()} ({workout.unit})</p>
          {workout.exercises.map(exercise => <p key={exercise.id}>{exercise.name}: {exercise.sets.map(set => `${set.weight} ${workout.unit} × ${set.reps}${set.kind === 'warmup' ? ' (warm-up)' : ''}${set.rpe ? ` RPE ${set.rpe}` : ''}`).join('; ')}</p>)}
        </div>)}
      </details>
      {preview.merge.addedWorkouts === 0 ? <p>These imported records are already on this device.</p> : <>
        <label className="block text-sm"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I reviewed the units, times and warnings. All included exercises use external loads.</label>
        <button type="button" className="btn-primary" disabled={blocked || !acknowledged} onClick={() => { void save(); }}>Import additions</button>
      </>}
      <button type="button" className="btn-ghost ml-2" onClick={clear}>Cancel import preview</button>
    </div>}
  </section>;
}
