import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutImport } from './WorkoutImport';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const text = 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps\n2025-01-02 18:00:00,Synthetic upper,45m,Bench Press,1,60,8';
let root: Root, container: HTMLDivElement, store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
beforeEach(async () => {
  repository = createWorkoutRepository(new IDBFactory()); store = createWorkoutStore(repository); await store.getState().load();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<WorkoutImport store={store} onClose={() => {}} />));
  await act(async () => {
    const select = container.querySelector('select')!; select.value = 'kg'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const input = container.querySelector('input[type="number"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0'); input.dispatchEvent(new Event('input', { bubbles: true }));
  });
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); });
async function choose(value = text) {
  const input = container.querySelector('input[type="file"]')!;
  const read = FileReader.prototype.readAsArrayBuffer;
  let didRead = false;
  const loaded = new Promise<void>(resolve => {
    vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementationOnce(function(this: FileReader, file) {
      didRead = true; this.addEventListener('loadend', () => resolve(), { once: true }); read.call(this, file);
    });
  });
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([value], 'synthetic.csv')] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (didRead) await loaded;
  });
}
function button(name: string) { return [...container.querySelectorAll('button')].find(item => item.textContent === name)!; }
async function acknowledgeAndSave() {
  await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await act(async () => { button('Import additions').click(); await new Promise<void>(resolve => {
    if (!store.getState().busy) { resolve(); return; }
    const off = store.subscribe(state => { if (!state.busy) { off(); resolve(); } });
  }); });
}
it('previews all imported records without writing, then saves once after acknowledgement', async () => {
  const save = vi.spyOn(repository, 'save'); await choose();
  expect(container.textContent).toContain('Import preview'); expect(save).not.toHaveBeenCalled();
  expect(button('Import additions').disabled).toBe(true);
  expect(container.textContent).toContain('60 kg × 8');
  await acknowledgeAndSave(); expect(store.getState().data.history).toHaveLength(1);
  expect(container.textContent).toContain('Imported workout additions saved');
  await choose(); expect(container.textContent).toContain('already on this device'); expect(save).toHaveBeenCalledTimes(1);
});
it('invalidates a preview when library data changes or reload starts', async () => {
  await choose(); expect(container.textContent).toContain('Import preview');
  await act(async () => { await store.getState().startWorkout('New', 'kg'); });
  expect(container.textContent).not.toContain('Import preview');
});
it('changing import options invalidates the preview', async () => {
  await choose(); await act(async () => {
    const select = container.querySelector('select')!; select.value = 'lb'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(container.textContent).not.toContain('Import preview');
});
it('failed parsing clears an older preview and never saves partial data', async () => {
  await choose(); await choose(text.replace(',60,8', ',60,0'));
  expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/reps/i);
  expect(container.textContent).not.toContain('Import preview'); expect((await repository.load()).history).toHaveLength(0);
});
it('keeps records intact on persistence failure and shows the failure', async () => {
  await choose(); vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('disk unavailable'));
  await acknowledgeAndSave(); expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect((await repository.load()).history).toHaveLength(0);
});
