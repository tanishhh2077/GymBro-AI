import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { AccountService } from '@/core/accountService';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { createWorkoutRepository } from '@/store/workoutRepository';
import type { Workout, WorkoutRoutine } from '@/types/workout';
import { AccountPanel, RecordVersion } from './AccountPanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
async function text(value: Workout | WorkoutRoutine) {
  const container = document.createElement('div'); const root = createRoot(container);
  await act(async () => root.render(<RecordVersion value={value} />));
  const result = container.textContent; await act(async () => root.unmount()); return result;
}
it('shows workout notes and target weights so conflict versions that differ only there are distinguishable', async () => {
  const workout: Workout = { id: 'w', name: 'Push', unit: 'kg', startedAt: 1, finishedAt: 2, note: 'Device note',
    exercises: [{ id: 'e', name: 'Bench press', targetSets: 3, targetWeight: 60, sets: [{ id: 's', reps: 8, weight: 60 }] }] };
  expect(await text(workout)).toContain('Note: Device note');
  expect(await text(workout)).toContain('Planned: 3 sets · 60 kg');
  expect(await text({ ...workout, note: 'Cloud note' })).not.toEqual(await text(workout));
  const routine: WorkoutRoutine = { id: 'r', name: 'Heavy', unit: 'lb', exercises: [{ id: 'x', name: 'Row', targetReps: 8, targetWeight: 135 }] };
  expect(await text(routine)).toContain('— sets / 8 reps / 135 lb planned');
  expect(await text({ ...routine, exercises: [{ id: 'x', name: 'Row', targetReps: 8 }] })).toContain('— sets / 8 reps planned');
});

it('labels sign-in form and moves focus to code input when email code is sent', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let resolveSend: () => void = () => {};
  const mockService: AccountService = {
    namespace: 'test',
    getAccount: async () => null,
    subscribe: () => () => {},
    sendCode: vi.fn(async () => new Promise<void>(res => { resolveSend = res; })),
    verifyCode: vi.fn(async () => ({ id: 'u1', email: 'user@example.test' })),
    signOut: vi.fn(async () => {}),
    cloud: vi.fn(),
  };
  const repository = createWorkoutRepository(new IDBFactory());
  const store = createWorkoutStore(repository);
  await store.getState().load();
  const guest = createWorkoutRepository(new IDBFactory(), 'guest');

  await act(async () => {
    root.render(<AccountPanel service={mockService} account={null} store={store} guest={guest} />);
  });

  const form = container.querySelector('form');
  expect(form?.getAttribute('aria-label')).toBe('Sign in');

  const emailInput = container.querySelector<HTMLInputElement>('input[type="email"]')!;
  expect(emailInput.id).toBeTruthy();
  const emailLabel = container.querySelector(`label[for="${emailInput.id}"]`);
  expect(emailLabel?.textContent).toContain('Email address');

  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(emailInput, 'user@example.test');
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await act(async () => {
    form!.requestSubmit();
  });
  resolveSend();
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise(res => setTimeout(res, 0));
    });
  }

  const codeInput = container.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
  expect(codeInput).toBeTruthy();
  expect(codeInput.id).toBeTruthy();
  const codeLabel = container.querySelector(`label[for="${codeInput.id}"]`);
  expect(codeLabel?.textContent).toContain('Email code');
  expect(document.activeElement).toBe(codeInput);

  await act(async () => root.unmount());
  container.remove();
});
