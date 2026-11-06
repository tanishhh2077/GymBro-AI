import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutBackup } from '@/core/workoutBackup';
import { emptyWorkoutData } from '@/core/workouts';
import { saveWorkoutBackup } from './workoutBackupExport';

vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn() } }));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));
const text = () => createWorkoutBackup(emptyWorkoutData(), 1000);
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.mocked(Filesystem.writeFile).mockReset().mockResolvedValue({ uri: 'file:///app/cache/backup.json' });
  vi.mocked(Filesystem.deleteFile).mockReset().mockResolvedValue();
  vi.mocked(Share.share).mockReset().mockResolvedValue({});
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

it('requests a JSON download and releases its URL after admission', async () => {
  vi.useFakeTimers();
  expect(await saveWorkoutBackup(text())).toBe('download');
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  expect(blob.size).toBe(new TextEncoder().encode(text()).byteLength);
  expect(blob.type).toContain('application/json');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  expect(document.querySelector('a')).toBeNull();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  expect(vi.getTimerCount()).toBe(0);
});
it('cleans up the anchor and URL if download admission throws', async () => {
  vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => { throw new Error('blocked'); });
  await expect(saveWorkoutBackup(text())).rejects.toThrow('blocked');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  expect(document.querySelector('a')).toBeNull();
});
it('rejects malformed or media-bearing content before allocating export resources', async () => {
  await expect(saveWorkoutBackup('{}')).rejects.toThrow();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(Filesystem.writeFile).not.toHaveBeenCalled();
});
it('shares a native cache file and retains it for asynchronous recipient reads', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  expect(await saveWorkoutBackup(text())).toBe('share');
  expect(Filesystem.writeFile).toHaveBeenCalledWith({ path: expect.stringMatching(/^gymbro-ai-workouts-.*\.json$/),
    data: text(), directory: Directory.Cache, encoding: Encoding.UTF8 });
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///app/cache/backup.json'] }));
  expect(Filesystem.deleteFile).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('exports natively using the same randomness API supported by workout IDs', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(1) });
  expect(await saveWorkoutBackup(text())).toBe('share');
});
it('attempts cleanup after a native write failure and permits retry', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('disk full'));
  await expect(saveWorkoutBackup(text())).rejects.toThrow('disk full');
  expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
  expect(Share.share).not.toHaveBeenCalled();
  expect(await saveWorkoutBackup(text())).toBe('share');
});
it('cleans cancelled or failed native sharing and exposes cleanup failures', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Share.share).mockRejectedValueOnce(new Error('cancelled'));
  await expect(saveWorkoutBackup(text())).rejects.toThrow('cancelled');
  expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
  vi.mocked(Share.share).mockRejectedValueOnce(new Error('failed'));
  vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('cleanup failed'));
  await expect(saveWorkoutBackup(text())).rejects.toThrow(/cache copy/);
});
it('preserves the original native failure when its cache file was never created', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('disk full'));
  vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce({ code: 'OS-PLUG-FILE-0008' });
  await expect(saveWorkoutBackup(text())).rejects.toThrow('disk full');
});
it('serializes native export while the share sheet is pending', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  let resume!: () => void;
  vi.mocked(Share.share).mockImplementationOnce(() => new Promise(resolve => { resume = () => resolve({}); }));
  const first = saveWorkoutBackup(text()).then(value => ({ value }), error => ({ error }));
  await vi.waitFor(() => expect(Share.share).toHaveBeenCalled());
  await expect(saveWorkoutBackup(text())).rejects.toThrow(/already|finish/i);
  resume();
  expect(await first).toEqual({ value: 'share' });
});
