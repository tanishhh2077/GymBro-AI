import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import type { Workout, WorkoutRoutine } from '@/types/workout';
import { RecordVersion } from './AccountPanel';

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
