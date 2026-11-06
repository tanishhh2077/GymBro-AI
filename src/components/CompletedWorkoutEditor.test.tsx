import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutHistory } from './WorkoutHistory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('opens a correction draft, cancels without writes and retains failed edits through reload', async () => {
  const repository = createWorkoutRepository(new IDBFactory());
  await repository.save(0, { ...emptyWorkoutData(), history: [{ id: 'w', name: 'Upper', unit: 'kg', startedAt: 100, finishedAt: 200,
    exercises: [{ id: 'e', name: 'Bench press', sets: [{ id: 's', reps: 8, weight: 60 }] }] }] });
  const store = createWorkoutStore(repository); await store.getState().load();
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const click = async (name: string) => {
    const button = [...container.querySelectorAll('button')].find(b => b.textContent === name);
    expect(button, name).toBeTruthy(); await act(async () => { button!.click(); });
  };
  try {
    await act(async () => root.render(<WorkoutHistory store={store} initialId="w" />));
    await click('Edit completed workout');
    const input = container.querySelector<HTMLInputElement>('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Corrected');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Typed corrections make Cancel ask before discarding them (Q30).
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await click('Cancel workout edit'); expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
    expect((await repository.load()).revision).toBe(1);
    await click('Edit completed workout');
    vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('disk'));
    await act(async () => {
      const name = container.querySelector<HTMLInputElement>('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Corrected');
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('Save corrections');
    expect(container.querySelector<HTMLInputElement>('input')!.value).toBe('Corrected');
    expect(container.textContent).toContain('could not be confirmed');
    await act(async () => { await store.getState().load(); });
    await click('Save corrections');
    expect((await repository.load()).history[0].name).toBe('Corrected');
    expect(container.querySelector('h1')!.textContent).toBe('Corrected');
  } finally { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); }
});
