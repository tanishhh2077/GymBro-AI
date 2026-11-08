import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { CompletedWorkoutEditor } from './CompletedWorkoutEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('shows the finished duration with an honest note, and nothing for unusable times', async () => {
  const make = (startedAt: number, finishedAt: number) => ({ id: 'w', name: 'Upper', unit: 'kg' as const, startedAt, finishedAt,
    exercises: [{ id: 'e', name: 'Bench press', sets: [{ id: 's', reps: 8, weight: 60 }] }] });
  const repository = createWorkoutRepository(new IDBFactory());
  await repository.save(0, { ...emptyWorkoutData(), history: [make(0, 52 * 60_000 + 5000)] });
  const store = createWorkoutStore(repository); await store.getState().load();
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const render = (workout: ReturnType<typeof make>) => act(async () => root.render(
    <CompletedWorkoutEditor store={store} workout={workout} expectedRevision={store.getState().data.revision} onClose={() => {}} />));
  try {
    await render(store.getState().data.history[0] as ReturnType<typeof make>);
    expect(container.textContent).toContain('Duration 52 min (includes rests and time away)');
    await render(make(9000, 1000));
    expect(container.textContent).not.toContain('Duration');
  } finally { await act(async () => root.unmount()); container.remove(); }
});
