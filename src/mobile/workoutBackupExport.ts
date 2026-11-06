import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { parseWorkoutBackup } from '@/core/workoutBackup';
import { WorkoutError } from '@/core/workouts';

let exporting = false;

export async function saveWorkoutBackup(text: string): Promise<'download' | 'share'> {
  if (exporting) throw new WorkoutError('validation', 'A backup export is already open. Finish it before exporting again.');
  exporting = true;
  try {
    const backup = parseWorkoutBackup(text);
    const date = new Date(backup.exportedAt).toISOString().slice(0, 10);
    const filename = `gymbro-ai-workouts-${date}.json`;
    if (Capacitor.isNativePlatform()) {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      const path = `gymbro-ai-workouts-${date}-${id}.json`;
      try {
        const file = await Filesystem.writeFile({ path, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'GymBro AI workout backup', dialogTitle: 'Save your workout backup', files: [file.uri] });
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
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    try { document.body.append(anchor); anchor.click(); }
    catch (error) { URL.revokeObjectURL(url); throw error; }
    finally { anchor.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'download';
  } finally { exporting = false; }
}
