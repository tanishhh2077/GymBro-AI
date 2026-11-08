import { MAX_BACKUP_BYTES } from './workoutBackup';
import { parseWorkoutImport, type ImportOptions, type WorkoutImport } from './workoutImport';
import { WorkoutError } from './workouts';

export async function readWorkoutImport(file: File, options: ImportOptions, signal: AbortSignal): Promise<WorkoutImport> {
  if (signal.aborted) throw new DOMException('Import selection cancelled', 'AbortError');
  if (!/\.csv$/i.test(file.name) || file.size === 0 || file.size > MAX_BACKUP_BYTES) {
    throw new WorkoutError('validation', 'Choose a nonempty UTF-8 .csv file of at most 4 MiB.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); let settled = false;
    function finish(error?: unknown, result?: WorkoutImport) {
      if (settled) return;
      settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel);
      reader.onload = null; reader.onerror = null; reader.onabort = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
      if (result) resolve(result); else reject(error);
    }
    function cancel() { finish(new DOMException('Import selection cancelled', 'AbortError')); }
    const timer = setTimeout(() => finish(new WorkoutError('validation', 'Reading the CSV timed out. Choose it again.')), 10_000);
    signal.addEventListener('abort', cancel, { once: true });
    reader.onerror = () => finish(new WorkoutError('validation', 'The CSV could not be read. Choose it again.'));
    reader.onabort = cancel;
    reader.onload = () => {
      let text: string;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(reader.result as ArrayBuffer); }
      catch { finish(new WorkoutError('validation', 'The CSV is not valid UTF-8 text.')); return; }
      try { finish(undefined, parseWorkoutImport(text, options)); } catch (error) { finish(error); }
    };
    try { reader.readAsArrayBuffer(file); } catch { finish(new WorkoutError('validation', 'The CSV could not be opened. Choose it again.')); }
  });
}
