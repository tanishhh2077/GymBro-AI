import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutBackup } from '@/core/workoutBackup';
import { emptyWorkoutData } from '@/core/workouts';
import { saveRoutineFile, saveWorkoutBackup, saveWorkoutCsv } from './workoutBackupExport';

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
it('downloads CSV using its own filename and MIME type and releases the URL', async () => {
  vi.useFakeTimers();
  const click = vi.mocked(HTMLAnchorElement.prototype.click);
  click.mockImplementationOnce(function (this: HTMLAnchorElement) { expect(this.download).toBe('gymbro-ai-workouts-1970-01-01.csv'); });
  expect(await saveWorkoutCsv(emptyWorkoutData(), 1000)).toBe('download');
  expect((vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).type).toBe('text/csv;charset=utf-8');
  await vi.advanceTimersByTimeAsync(1000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
});
it('shares CSV through native cache and cleans up a failed share', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  expect(await saveWorkoutCsv(emptyWorkoutData(), 1000)).toBe('share');
  expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching(/\.csv$/), data: expect.stringContaining('workout_id,') }));
  vi.mocked(Share.share).mockRejectedValueOnce(new Error('cancelled'));
  await expect(saveWorkoutCsv(emptyWorkoutData(), 1000)).rejects.toThrow('cancelled');
  expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
});
it('serializes CSV and JSON together and validates CSV sources before allocating files', async () => {
  await expect(saveWorkoutCsv({ ...emptyWorkoutData(), media: 'private' } as never, 1000)).rejects.toThrow();
  await expect(saveWorkoutCsv(emptyWorkoutData(), NaN)).rejects.toThrow();
  expect(URL.createObjectURL).not.toHaveBeenCalled(); expect(Filesystem.writeFile).not.toHaveBeenCalled();
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  let resume!: () => void;
  vi.mocked(Share.share).mockImplementationOnce(() => new Promise(resolve => { resume = () => resolve({}); }));
  const pending = saveWorkoutCsv(emptyWorkoutData(), 1000);
  await vi.waitFor(() => expect(Share.share).toHaveBeenCalled());
  await expect(saveWorkoutBackup(text())).rejects.toThrow(/already|finish/i);
  resume(); await pending;
});

it('propagates share sheet cancellation or dismissal and cleans up the temporary cache file', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Share.share).mockRejectedValueOnce(new Error('User cancelled'));
  await expect(saveWorkoutBackup(text())).rejects.toThrow('User cancelled');
  expect(Filesystem.deleteFile).toHaveBeenCalledWith(expect.objectContaining({ directory: Directory.Cache }));
  expect(await saveWorkoutBackup(text())).toBe('share');
});

it('cleans up temporary CSV file when share sheet is dismissed and allows subsequent export', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Share.share).mockRejectedValueOnce(new Error('Share canceled'));
  await expect(saveWorkoutCsv(emptyWorkoutData(), 1000)).rejects.toThrow('Share canceled');
  expect(Filesystem.deleteFile).toHaveBeenCalledWith(expect.objectContaining({
    path: expect.stringMatching(/\.csv$/),
    directory: Directory.Cache,
  }));
  expect(await saveWorkoutCsv(emptyWorkoutData(), 1000)).toBe('share');
});

it('clears export lock even when share cancellation cleanup fails with unexpected error', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Share.share).mockRejectedValueOnce(new Error('share failed'));
  vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('EPERM: operation not permitted'));
  await expect(saveWorkoutBackup(text())).rejects.toThrow(/File sharing could not be confirmed/);
  expect(await saveWorkoutBackup(text())).toBe('share');
});

it('propagates filesystem write failure for CSV export without calling share and allows retry', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));
  await expect(saveWorkoutCsv(emptyWorkoutData(), 1000)).rejects.toThrow('ENOSPC');
  expect(Share.share).not.toHaveBeenCalled();
  expect(Filesystem.deleteFile).toHaveBeenCalledWith(expect.objectContaining({
    path: expect.stringMatching(/\.csv$/),
    directory: Directory.Cache,
  }));
  expect(await saveWorkoutCsv(emptyWorkoutData(), 1000)).toBe('share');
});

it('exposes storage error when filesystem write fails and deleteFile throws unexpected error', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('permission denied'));
  vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('storage failure'));
  await expect(saveWorkoutBackup(text())).rejects.toThrow(/temporary cache copy could not be removed/);
  expect(await saveWorkoutBackup(text())).toBe('share');
});

it('prevents concurrent double invocation from corrupting export state across overlapping calls', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  let resolveShare!: () => void;
  vi.mocked(Share.share).mockImplementationOnce(() => new Promise(resolve => { resolveShare = () => resolve({}); }));

  const firstExport = saveWorkoutBackup(text());
  await vi.waitFor(() => expect(Filesystem.writeFile).toHaveBeenCalledTimes(1));

  await expect(saveWorkoutBackup(text())).rejects.toThrow(/already open/i);
  await expect(saveWorkoutCsv(emptyWorkoutData(), 1000)).rejects.toThrow(/already open/i);

  resolveShare();
  expect(await firstExport).toBe('share');

  expect(await saveWorkoutBackup(text())).toBe('share');
});

it('releases concurrency lock when in-flight export fails so subsequent export succeeds', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  let rejectShare!: (err: unknown) => void;
  vi.mocked(Share.share).mockImplementationOnce(() => new Promise((_, reject) => { rejectShare = reject; }));

  const firstExport = saveWorkoutBackup(text());
  await vi.waitFor(() => expect(Share.share).toHaveBeenCalledTimes(1));

  await expect(saveWorkoutBackup(text())).rejects.toThrow(/already open/i);

  rejectShare(new Error('share failed'));
  await expect(firstExport).rejects.toThrow('share failed');

  expect(await saveWorkoutBackup(text())).toBe('share');
});

it('cleans up anchor, URL, and lock when web CSV download throws during click', async () => {
  vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => { throw new Error('click blocked'); });
  await expect(saveWorkoutCsv(emptyWorkoutData(), 1000)).rejects.toThrow('click blocked');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  expect(document.querySelector('a')).toBeNull();
  expect(await saveWorkoutCsv(emptyWorkoutData(), 1000)).toBe('download');
});

it('shares a validated routine through native cache without any workout records', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  const routine = JSON.stringify({ format: 'gymbro-ai-routine', version: 1, routine: { name: 'Synthetic upper', unit: 'kg', exercises: [{ name: 'Row' }] } });
  expect(await saveRoutineFile(routine)).toBe('share');
  expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching(/^gymbro-routine-synthetic-upper-.*\.json$/), data: routine }));
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ title: 'GymBro AI routine', files: ['file:///app/cache/backup.json'] }));
});
