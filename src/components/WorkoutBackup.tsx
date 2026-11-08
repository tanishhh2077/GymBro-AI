import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { createWorkoutBackup, mergeWorkoutBackup, type BackupMerge, type WorkoutBackup as BackupFile } from '@/core/workoutBackup';
import { readWorkoutBackup } from '@/core/workoutBackupFile';
import { WorkoutError } from '@/core/workouts';
import { saveWorkoutBackup, saveWorkoutCsv } from '@/mobile/workoutBackupExport';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { WorkoutData } from '@/types/workout';

import { BackupReminder } from './BackupReminder';

interface Preview { backup: BackupFile; source: WorkoutData; merge: BackupMerge; filename: string }

export function WorkoutBackup({ store, onHome }: { store: WorkoutStore; onHome: () => void }) {
  const state = useStore(store);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reader = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const exportPending = useRef(false);
  const available = state.loaded && !state.needsReload;
  const blocked = !available || state.busy || reading || exporting;

  useEffect(() => {
    mounted.current = true;
    // Observe load start synchronously, even if React batches busy true/false.
    const unsubscribe = store.subscribe((next, previous) => {
      if (next.busy || next.needsReload || next.data !== previous.data) {
        reader.current?.abort(); reader.current = null;
        setReading(false); setPreview(null);
      }
    });
    return () => {
      mounted.current = false; unsubscribe();
      reader.current?.abort(); reader.current = null;
    };
  }, [store]);

  async function choose(file: File) {
    reader.current?.abort();
    const controller = new AbortController();
    reader.current = controller;
    setReading(true); setPreview(null); setError(''); setNotice('');
    try {
      const backup = await readWorkoutBackup(file, controller.signal);
      if (!mounted.current || reader.current !== controller) return;
      const current = store.getState();
      if (!current.loaded || current.needsReload || current.busy) {
        throw new WorkoutError('validation', 'Reload saved workouts, then choose the backup again.');
      }
      setPreview({ backup, source: current.data, merge: mergeWorkoutBackup(current.data, backup), filename: file.name });
    } catch (failure) {
      if (mounted.current && reader.current === controller && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'The backup could not be opened. Choose it again.');
      }
    } finally {
      if (mounted.current && reader.current === controller) { reader.current = null; setReading(false); }
    }
  }

  async function exportRecords(format: 'json' | 'csv' = 'json') {
    if (blocked || exportPending.current) return false;
    exportPending.current = true;
    setExporting(true); setError(''); setNotice('');
    try {
      const data = store.getState().data;
      const mode = await (format === 'csv' ? saveWorkoutCsv(data, Date.now()) : saveWorkoutBackup(createWorkoutBackup(data, Date.now())));
      const notices = {
        csv: { download: 'CSV download requested. Check your downloads for the file.',
          share: 'CSV share sheet closed. Check your chosen destination for the file.' },
        json: { download: 'Download requested. Keep the JSON file for recovery.',
          share: 'Backup share sheet closed. Keep your saved file for recovery.' },
      };
      if (mounted.current) setNotice(notices[format][mode]);
      return true;
    } catch (failure) {
      if (mounted.current) setError(failure instanceof WorkoutError ? failure.message :
        `${format === 'csv' ? 'CSV' : 'Backup'} export was not confirmed. Try again when ready.`);
      return false;
    } finally { exportPending.current = false; if (mounted.current) setExporting(false); }
  }

  async function restore() {
    if (!preview || blocked) return;
    if (store.getState().data !== preview.source) {
      setPreview(null); setError('Saved records changed. Choose the backup again.'); return;
    }
    const result = await store.getState().restoreBackup(preview.backup, preview.source.revision);
    if (!mounted.current) return;
    if (result.ok) { setPreview(null); setNotice('Backup additions saved on this device.'); }
    else if (!store.getState().error) setError(result.message);
  }

  return <div className="space-y-6">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={onHome}>Back to Home</button>
    <div>
      <h1 className="text-3xl font-bold text-white">Backup and restore</h1>
      <p className="mt-2 text-sm text-slate-400">Keep a recovery copy of your workouts, routines and goals.</p>
    </div>
    <BackupReminder blocked={blocked} onBackup={() => exportRecords()} />
    {!available && <p className="text-slate-400">Reload saved workouts to use backup and restore.</p>}
    <section aria-labelledby="backup-export-title" className="card space-y-3 p-4 sm:p-5">
      <h2 id="backup-export-title" className="text-lg font-semibold text-white">Save a backup</h2>
      <p className="text-sm text-slate-400">Includes completed workouts, routines, goals and your active workout. The file contains readable JSON workout records.</p>
      <p className="text-sm text-slate-400">Your browser downloads the file. In the installed app, choose a destination in the share sheet, such as Save to Files. Keep the file somewhere you trust.</p>
      <button type="button" className="btn-primary" disabled={blocked} onClick={() => { void exportRecords(); }}>{exporting ? 'Opening export…' : 'Export backup'}</button>
    </section>
    <section aria-labelledby="csv-export-title" className="card space-y-3 p-4 sm:p-5">
      <h2 id="csv-export-title" className="text-lg font-semibold text-white">Export workout CSV</h2>
      <p className="text-sm text-slate-400">All completed actual sets, including warm-ups, with workout and exercise names, IDs, UTC timestamps, original units and entered values. Oldest completions appear first.</p>
      <p className="text-sm text-slate-400">Open the CSV in a spreadsheet. Use a JSON backup for recovery and restore. Names beginning with spreadsheet formula characters receive a protective apostrophe.</p>
      <button type="button" className="btn-ghost" disabled={blocked} onClick={() => { void exportRecords('csv'); }}>Export workout CSV</button>
    </section>
    <section aria-labelledby="backup-import-title" className="card min-w-0 space-y-3 p-4 sm:p-5">
      <h2 id="backup-import-title" className="text-lg font-semibold text-white">Restore from a file</h2>
      <p className="text-sm text-slate-400">Review additions before saving. Identical records are skipped. Conflicting versions or different active workouts stop the import.</p>
      <label htmlFor="workout-backup-file" className="block text-sm text-slate-300">Choose backup JSON file</label>
      <input id="workout-backup-file" type="file" accept=".json,application/json" disabled={!available || state.busy || exporting}
        className="block w-full min-w-0 max-w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        onChange={event => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (!files.length) return;
          if (files.length !== 1) { setError('Choose one backup file at a time.'); return; }
          void choose(files[0]);
        }} />
      <p className="text-xs text-slate-500">One UTF-8 .json file, up to 4 MiB. You can choose another file while a read is pending.</p>
    </section>
    <p role="status" aria-live="polite" className="text-sm text-accent">{reading ? 'Reading backup…' : notice}</p>
    {error && <p role="alert" className="break-words text-sm text-warn">{error}</p>}
    {preview && <section aria-labelledby="backup-preview-title" className="space-y-4 border-t border-white/10 pt-5">
      <div>
        <h2 id="backup-preview-title" className="text-lg font-semibold text-white">Restore preview</h2>
        <p className="mt-1 break-all text-sm text-slate-300">{preview.filename}</p>
        <p className="mt-1 text-xs text-slate-500">Created {new Date(preview.backup.exportedAt).toLocaleString()}</p>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-400">Completed workouts to add</dt><dd className="mt-1 text-xl font-semibold text-white">{preview.merge.addedWorkouts}</dd></div>
        <div><dt className="text-slate-400">Routines to add</dt><dd className="mt-1 text-xl font-semibold text-white">{preview.merge.addedRoutines}</dd></div>
        <div><dt className="text-slate-400">Goals to add</dt><dd className="mt-1 text-xl font-semibold text-white">{preview.merge.addedGoals}</dd></div>
        <div><dt className="text-slate-400">Active workout to add</dt><dd className="mt-1 text-white">{preview.merge.addedActive ? 'Yes' : 'No'}</dd></div>
        <div><dt className="text-slate-400">Identical records skipped</dt><dd className="mt-1 text-white">{preview.merge.duplicates}</dd></div>
      </dl>
      {preview.merge.skippedGoals > 0 && <p className="text-sm text-slate-300">{preview.merge.skippedGoals === 1 ? '1 goal' : `${preview.merge.skippedGoals} goals`} skipped:
        {' '}you already have a goal for that exercise. Your saved goal is kept.</p>}
      {preview.merge.data === preview.source ? <p className="text-sm text-slate-400">These records are already on this device.</p> :
        <button type="button" className="btn-primary" disabled={blocked} onClick={() => { void restore(); }}>Restore additions</button>}
      <button type="button" className="btn-ghost ml-2" onClick={() => setPreview(null)}>Cancel preview</button>
    </section>}
  </div>;
}
