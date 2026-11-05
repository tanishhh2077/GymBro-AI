import { MAX_BACKUP_BYTES, parseWorkoutBackup, type WorkoutBackup } from './workoutBackup';
import { WorkoutError } from './workouts';

export async function readWorkoutBackup(file: File, signal: AbortSignal): Promise<WorkoutBackup> {
  if (signal.aborted) throw new DOMException('Backup selection cancelled', 'AbortError');
  if (!/\.json$/i.test(file.name) || file.size === 0 || file.size > MAX_BACKUP_BYTES) {
    throw new WorkoutError('validation', 'Choose a nonempty .json backup file of at most 4 MiB.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    function finish(error?: unknown, backup?: WorkoutBackup) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reader.onload = null; reader.onerror = null; reader.onabort = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
      if (backup) resolve(backup);
      else reject(error);
    }
    function cancel() { finish(new DOMException('Backup selection cancelled', 'AbortError')); }
    const timer = setTimeout(() => finish(new WorkoutError('validation', 'Reading the backup timed out. Choose the file again.')), 10_000);
    signal.addEventListener('abort', cancel, { once: true });
    reader.onerror = () => finish(new WorkoutError('validation', 'The backup file could not be read. Choose it again.'));
    reader.onabort = cancel;
    reader.onload = () => {
      let text: string;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(reader.result as ArrayBuffer); }
      catch { finish(new WorkoutError('validation', 'The backup is not valid UTF-8 text. Choose another file.')); return; }
      try { finish(undefined, parseWorkoutBackup(text)); }
      catch (error) { finish(error); }
    };
    try { reader.readAsArrayBuffer(file); }
    catch { finish(new WorkoutError('validation', 'The backup file could not be opened. Choose it again.')); }
  });
}
