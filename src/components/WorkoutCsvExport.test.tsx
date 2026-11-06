import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutBackup } from './WorkoutBackup';

vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn() } }));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let container: HTMLDivElement;
let repository: ReturnType<typeof createWorkoutRepository>;
let store: ReturnType<typeof createWorkoutStore>;
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  repository = createWorkoutRepository(new IDBFactory()); store = createWorkoutStore(repository);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:csv'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function exportButton() {
  const button = [...container.querySelectorAll('button')].find(value => value.textContent === 'Export workout CSV');
  expect(button).toBeDefined(); return button!;
}
it('requests a separate CSV download without changing records and reports download admission honestly', async () => {
  await store.getState().load();
  vi.useFakeTimers();
  const save = vi.spyOn(repository, 'save'); const source = store.getState().data;
  await act(async () => root.render(<WorkoutBackup store={store} onHome={() => {}} />));
  await act(async () => exportButton().click());
  expect(container.textContent).toContain('CSV download requested.');
  expect(container.textContent).toContain('Use a JSON backup for recovery');
  expect((vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).type).toContain('text/csv');
  expect(save).not.toHaveBeenCalled(); expect(store.getState().data).toBe(source);
  await vi.advanceTimersByTimeAsync(1000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv');
});
it('disables CSV while records are unavailable and reports failed export without success', async () => {
  await act(async () => root.render(<WorkoutBackup store={store} onHome={() => {}} />));
  expect(exportButton().disabled).toBe(true);
  await act(async () => store.getState().load());
  vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => { throw new Error('blocked'); });
  await act(async () => exportButton().click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('CSV export was not confirmed');
  expect(container.textContent).not.toContain('CSV download requested.');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv');
  expect(exportButton().disabled).toBe(false);
});
it('waits for the native share sheet before reporting completion and blocks overlapping exports', async () => {
  await store.getState().load();
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Filesystem.writeFile).mockResolvedValueOnce({ uri: 'file:///synthetic.csv' });
  let finish!: () => void;
  vi.mocked(Share.share).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({}); }));
  await act(async () => root.render(<WorkoutBackup store={store} onHome={() => {}} />));
  await act(async () => exportButton().click());
  expect(exportButton().disabled).toBe(true);
  expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  expect(Share.share).toHaveBeenCalledOnce();
  await act(async () => finish());
  expect(container.textContent).toContain('CSV share sheet closed. Check your chosen destination for the file.');
  expect(exportButton().disabled).toBe(false);
});
