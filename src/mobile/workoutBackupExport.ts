import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { parseWorkoutBackup } from '@/core/workoutBackup';
import { WorkoutError } from '@/core/workouts';
import { createWorkoutCsv } from '@/core/workoutCsv';
import type { WorkoutData } from '@/types/workout';

let exporting = false;

export async function saveWorkoutBackup(text: string): Promise<'download' | 'share'> {
  const backup = parseWorkoutBackup(text);
  return saveWorkoutFile(text, backup.exportedAt, 'json');
}

export async function saveWorkoutCsv(data: WorkoutData, exportedAt: number): Promise<'download' | 'share'> {
  if (!Number.isSafeInteger(exportedAt) || exportedAt < 0 || exportedAt > 8.64e15) {
    throw new WorkoutError('validation', 'CSV export needs a valid current time.');
  }
  return saveWorkoutFile(createWorkoutCsv(data), exportedAt, 'csv');
}

async function saveWorkoutFile(text: string, exportedAt: number, format: 'json' | 'csv'): Promise<'download' | 'share'> {
  if (exporting) throw new WorkoutError('validation', 'A workout export is already open. Finish it before exporting again.');
  exporting = true;
  try {
    const date = new Date(exportedAt).toISOString().slice(0, 10);
    const filename = `gymbro-ai-workouts-${date}.${format}`;
    if (Capacitor.isNativePlatform()) {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      const path = `gymbro-ai-workouts-${date}-${id}.${format}`;
      try {
        const file = await Filesystem.writeFile({ path, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: format === 'json' ? 'GymBro AI workout backup' : 'GymBro AI workout CSV',
          dialogTitle: format === 'json' ? 'Save your workout backup' : 'Save your workout CSV', files: [file.uri] });
        // Android recipients can read after handoff. The OS manages this cache artifact.
        return 'share';
      } catch (error) {
        try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); }
        catch (cleanupFailure) {
          const code = (cleanupFailure as { code?: string } | null)?.code;
          if (code !== 'OS-PLUG-FILE-0008') {
            throw new WorkoutError('storage', 'File sharing could not be confirmed and its temporary cache copy could not be removed.');
          }
        }
        throw error;
      }
    }
    const type = format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8';
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    try { document.body.append(anchor); anchor.click(); }
    catch (error) { URL.revokeObjectURL(url); throw error; }
    finally { anchor.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'download';
  } finally { exporting = false; }
}
