import { afterEach, expect, it, vi } from 'vitest';
const options = { unit: 'kg' as const, utcOffsetMinutes: 0 };

import { readWorkoutImport } from './workoutImportFile';

const text = () => 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps\n2025-01-02 18:00:00,Upper,45m,Bench Press,1,60,8';
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('reads a real UTF-8 CSV File and accepts an unreliable MIME hint', async () => {
  const file = new File([text()], 'backup.CSV', { type: 'application/octet-stream' });
  expect((await readWorkoutImport(file, options, new AbortController().signal)).backup.data.history).toHaveLength(1);
});
it('rejects empty, excessive and wrongly named files before starting a read', async () => {
  const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
  for (const file of [new File([], 'empty.csv'), new File([text()], 'backup.txt'),
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'huge.csv')]) {
    await expect(readWorkoutImport(file, options, new AbortController().signal)).rejects.toThrow();
  }
  expect(read).not.toHaveBeenCalled();
});
it('rejects invalid UTF-8 even when replacement decoding would make valid CSV', async () => {
  const file = new File([new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])], 'bad.csv');
  await expect(readWorkoutImport(file, options, new AbortController().signal)).rejects.toThrow(/UTF-8/);
});
it('rejects malformed file contents through the real reader', async () => {
  await expect(readWorkoutImport(new File(['{'], 'bad.csv'), options, new AbortController().signal)).rejects.toThrow(/CSV/);
});
it('cancels an already-aborted or pending read', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(readWorkoutImport(new File([text()], 'backup.csv'), options, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  const pending = new AbortController();
  const abort = vi.spyOn(FileReader.prototype, 'abort');
  const result = readWorkoutImport(new File([text()], 'backup.csv'), options, pending.signal);
  pending.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(abort).toHaveBeenCalledTimes(1);
});
it('bounds a stalled read and removes abort listeners', async () => {
  vi.useFakeTimers();
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(() => {});
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const result = readWorkoutImport(new File([text()], 'backup.csv'), options, controller.signal);
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
  await readWorkoutImport(new File([text()], 'backup.csv'), options, controller.signal);
  expect(clear).toHaveBeenCalled();
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});
