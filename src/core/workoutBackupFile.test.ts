import { afterEach, expect, it, vi } from 'vitest';
import { createWorkoutBackup } from './workoutBackup';
import { emptyWorkoutData } from './workouts';
import { readWorkoutBackup } from './workoutBackupFile';

const text = () => createWorkoutBackup(emptyWorkoutData(), 1000);
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('reads a real UTF-8 JSON File and accepts an unreliable MIME hint', async () => {
  const file = new File([text()], 'backup.JSON', { type: 'application/octet-stream' });
  expect((await readWorkoutBackup(file, new AbortController().signal)).data).toEqual(emptyWorkoutData());
});
it('rejects empty, excessive and wrongly named files before starting a read', async () => {
  const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
  for (const file of [new File([], 'empty.json'), new File([text()], 'backup.txt'),
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'huge.json')]) {
    await expect(readWorkoutBackup(file, new AbortController().signal)).rejects.toThrow();
  }
  expect(read).not.toHaveBeenCalled();
});
it('rejects invalid UTF-8 even when replacement decoding would make valid JSON', async () => {
  const file = new File([new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])], 'bad.json');
  await expect(readWorkoutBackup(file, new AbortController().signal)).rejects.toThrow(/UTF-8/);
});
it('rejects malformed file contents through the real reader', async () => {
  await expect(readWorkoutBackup(new File(['{'], 'bad.json'), new AbortController().signal)).rejects.toThrow(/JSON/);
});
it('cancels an already-aborted or pending read', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(readWorkoutBackup(new File([text()], 'backup.json'), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  const pending = new AbortController();
  const abort = vi.spyOn(FileReader.prototype, 'abort');
  const result = readWorkoutBackup(new File([text()], 'backup.json'), pending.signal);
  pending.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(abort).toHaveBeenCalledTimes(1);
});
it('bounds a stalled read and removes abort listeners', async () => {
  vi.useFakeTimers();
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(() => {});
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const result = readWorkoutBackup(new File([text()], 'backup.json'), controller.signal);
  const failure = result.catch(error => error);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(await failure).toMatchObject({ message: expect.stringMatching(/timed out/) });
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});
it('releases the timeout and listeners after a successful read', async () => {
  const clear = vi.spyOn(globalThis, 'clearTimeout');
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  await readWorkoutBackup(new File([text()], 'backup.json'), controller.signal);
  expect(clear).toHaveBeenCalled();
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});
