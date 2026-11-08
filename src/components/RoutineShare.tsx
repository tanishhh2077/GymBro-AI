import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { createRoutineShare, readRoutineShareFile, routineShareFilename } from '@/core/routineShare';
import { saveRoutineFile } from '@/mobile/workoutBackupExport';
import { WorkoutError } from '@/core/workouts';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { WorkoutData } from '@/types/workout';
import type { RoutineExerciseInput, RoutineInput, WorkoutRoutine } from '@/types/workout';

export interface RoutineShareProps {
  store: WorkoutStore;
  routine?: WorkoutRoutine;
  onExport?: (text: string, filename: string) => void;
}

interface Preview {
  readonly routine: RoutineInput;
  readonly filename: string;
  readonly source: WorkoutData;
}

function formatExerciseTargets(ex: RoutineExerciseInput, unit: string): string {
  const parts: string[] = [];
  if (ex.targetSets !== undefined && ex.targetReps !== undefined) {
    parts.push(`${ex.targetSets} sets × ${ex.targetReps} reps`);
  } else if (ex.targetSets !== undefined) {
    parts.push(`${ex.targetSets} sets`);
  } else if (ex.targetReps !== undefined) {
    parts.push(`${ex.targetReps} reps`);
  }
  if (ex.targetWeight !== undefined) {
    parts.push(`@ ${ex.targetWeight} ${unit}`);
  }
  return parts.length > 0 ? parts.join(' ') : 'No targets specified';
}

export function RoutineShare({ store, routine, onExport }: RoutineShareProps) {
  const state = useStore(store);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportPending = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reader = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mounted = useRef(false);

  const available = state.loaded && !state.needsReload;
  const blocked = !available || state.busy || reading || importing || exporting;

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = store.subscribe((next, previous) => {
      if (next.busy || next.needsReload || next.data !== previous.data) {
        reader.current?.abort();
        reader.current = null;
        setReading(false);
        setPreview(null);
      }
    });
    return () => {
      mounted.current = false;
      unsubscribe();
      reader.current?.abort();
      reader.current = null;
    };
  }, [store]);

  async function exportRoutine() {
    if (!routine || blocked || exportPending.current) return;
    exportPending.current = true; setExporting(true);
    setError('');
    setNotice('');
    try {
      const text = createRoutineShare(routine);
      const filename = routineShareFilename(routine.name);
      if (onExport) {
        onExport(text, filename);
        setNotice(`Exported ${filename}.`);
      } else {
        const mode = await saveRoutineFile(text);
        if (mounted.current) setNotice(mode === 'share' ? 'Routine share sheet closed. Check your chosen destination for the file.' : `Routine export requested: ${filename}`);
      }
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'The routine could not be exported.');
    } finally { exportPending.current = false; if (mounted.current) setExporting(false); }
  }

  async function chooseFile(file: File) {
    reader.current?.abort();
    const controller = new AbortController();
    reader.current = controller;
    setReading(true);
    setPreview(null);
    setError('');
    setNotice('');

    try {
      const parsed = await readRoutineShareFile(file, controller.signal);
      if (!mounted.current || reader.current !== controller) return;
      const current = store.getState();
      if (!current.loaded || current.needsReload || current.busy) {
        throw new WorkoutError('validation', 'Reload saved workouts, then choose the routine file again.');
      }
      setPreview({ routine: parsed, filename: file.name, source: current.data });
    } catch (failure) {
      if (mounted.current && reader.current === controller && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'The routine file could not be read. Choose it again.');
      }
    } finally {
      if (mounted.current && reader.current === controller) {
        reader.current = null;
        setReading(false);
      }
    }
  }

  async function confirmImport() {
    if (!preview || blocked) return;
    if (store.getState().data !== preview.source) {
      setPreview(null); setError('Saved records changed. Choose the routine file again.'); return;
    }
    setImporting(true);
    setError('');
    setNotice('');

    try {
      const result = await store.getState().createRoutine(preview.routine);
      if (!mounted.current) return;
      if (result.ok) {
        const importedName = preview.routine.name;
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setNotice(`Routine "${importedName}" imported successfully.`);
      } else {
        setError(result.message);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(failure instanceof Error ? failure.message : 'Import failed. Please try again.');
      }
    } finally {
      if (mounted.current) {
        setImporting(false);
      }
    }
  }

  function cancelPreview() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {routine && (
        <section aria-labelledby="routine-share-export-title" className="card min-w-0 max-w-full space-y-3 p-4 sm:p-5">
          <h2 id="routine-share-export-title" className="text-lg font-semibold text-white">
            Export routine
          </h2>
          <p className="break-words text-sm text-slate-300">
            Share <span className="font-medium text-white">{routine.name}</span> as a portable .json file.
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={blocked}
            aria-label={`Export routine ${routine.name}`}
            onClick={() => { void exportRoutine(); }}
          >
            Export routine
          </button>
        </section>
      )}

      <section aria-labelledby="routine-share-import-title" className="card min-w-0 max-w-full space-y-3 p-4 sm:p-5">
        <h2 id="routine-share-import-title" className="text-lg font-semibold text-white">
          Import routine
        </h2>
        <p className="text-sm text-slate-300">Choose a GymBro AI routine .json file to preview and import.</p>
        <label htmlFor="routine-share-file-input" className="block text-sm text-slate-300">
          Choose routine JSON file
        </label>
        <input
          ref={fileInputRef}
          id="routine-share-file-input"
          type="file"
          accept=".json,application/json"
          disabled={blocked}
          className="block w-full min-w-0 max-w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          onChange={event => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = '';
            if (!files.length) return;
            if (files.length !== 1) {
              setError('Choose one routine file at a time.');
              return;
            }
            void chooseFile(files[0]);
          }}
        />
        <p className="text-xs text-slate-400">One UTF-8 .json routine file, up to 64 KiB.</p>
      </section>

      <p role="status" aria-live="polite" className="text-sm text-accent">
        {reading ? 'Reading routine file...' : importing ? 'Importing routine...' : exporting ? 'Opening routine export...' : notice}
      </p>

      {error && (
        <p role="alert" className="break-words text-sm text-warn">
          {error}
        </p>
      )}

      {preview && (
        <section
          aria-labelledby="routine-share-preview-title"
          className="card min-w-0 max-w-full space-y-4 p-4 sm:p-5 border-t border-white/10"
        >
          <div>
            <h3 id="routine-share-preview-title" className="text-lg font-semibold text-white">
              Routine preview
            </h3>
            <p className="break-all text-xs text-slate-400 mt-0.5">{preview.filename}</p>
          </div>

          <div className="space-y-1">
            <h4 className="break-words text-base font-medium text-white">{preview.routine.name}</h4>
            <p className="text-sm text-slate-300">
              {preview.routine.exercises.length} {preview.routine.exercises.length === 1 ? 'exercise' : 'exercises'} · Unit:{' '}
              {preview.routine.unit}
            </p>
          </div>

          <ul
            className="divide-y divide-white/5 rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-sm max-w-full overflow-hidden"
            aria-label="Exercises in preview"
          >
            {preview.routine.exercises.map((ex, index) => (
              <li key={index} className="pt-2 first:pt-0">
                <p className="break-words font-medium text-white">{ex.name}</p>
                <p className="text-xs text-slate-300">
                  {formatExerciseTargets(ex, preview.routine.unit)}
                  {ex.superset ? ' · Superset' : ''}
                  {ex.bodyweight ? ' · Bodyweight' : ''}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={blocked}
              aria-label="Import this routine"
              onClick={() => {
                void confirmImport();
              }}
            >
              {importing ? 'Importing…' : 'Import this routine'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={blocked}
              aria-label="Cancel preview"
              onClick={cancelPreview}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
