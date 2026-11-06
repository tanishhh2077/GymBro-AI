import { test, expect } from './app';

test('a copied routine starts independently and exercise history preserves set drafts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    const state = workoutStore.getState();
    const result = await state.restoreBackup({ format: 'gymbro-ai-workout-backup', version: 1,
      exportedAt: Date.now(), data: { version: 3, revision: 0, active: null,
        routines: [{ id: 'routine-source', name: 'Synthetic push', unit: 'kg', exercises: [
          { id: 'routine-bench', name: 'Bench press', targetSets: 3, targetReps: 8 },
        ] }], history: [
          { id: 'recent', name: 'Synthetic previous push', unit: 'kg', startedAt: 1000, finishedAt: 2000,
            exercises: [
              { id: 'recent-warmup', name: 'Bench press', sets: [{ id: 'warmup', reps: 10, weight: 20, kind: 'warmup' }] },
              { id: 'recent-regular', name: 'Bench press', sets: [{ id: 'regular', reps: 8, weight: 60 }] },
            ] },
          { id: 'other-unit', name: 'Synthetic pounds', unit: 'lb', startedAt: 3000, finishedAt: 4000,
            exercises: [{ id: 'pounds-bench', name: 'Bench press', sets: [{ id: 'pounds-set', reps: 2, weight: 99 }] }] },
        ] } }, state.data.revision);
    if (!result.ok) throw new Error(result.message);
  });
  await page.getByRole('button', { name: 'Manage routines', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate routine Synthetic push', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic push (copy)', exact: true })).toBeVisible();
  const copied = await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().data.routines!;
  });
  expect(copied).toHaveLength(2);
  const source = copied.find(routine => routine.id === 'routine-source')!;
  const copy = copied.find(routine => routine.id !== source.id)!;
  expect(source.name).toBe('Synthetic push');
  expect(source.exercises[0].id).toBe('routine-bench');
  expect(copy.exercises[0]).toEqual({ ...source.exercises[0], id: expect.any(String) });
  expect(copy.exercises[0].id).not.toBe(source.exercises[0].id);
  await page.getByRole('button', { name: 'Edit routine Synthetic push (copy)', exact: true }).click();
  await page.getByLabel('Target reps for exercise 1', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic push (copy)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start routine Synthetic push (copy)', exact: true }).click();
  const exercise = page.getByRole('region', { name: 'Bench press', exact: true });
  await expect(exercise.getByText(/6 reps per set/)).toBeVisible();
  await exercise.getByLabel('Reps', { exact: true }).fill('6');
  await exercise.getByLabel('Weight (kg)', { exact: true }).fill('62.5');
  await exercise.getByRole('button', { name: 'Exercise history', exact: true }).click();
  const history = exercise.getByRole('region', { name: 'Recent exercise history', exact: true });
  await expect(history.getByText('Synthetic previous push', { exact: true })).toBeVisible();
  await expect(history).toContainText('Warm-up');
  await expect(history).toContainText('Regular');
  await expect(history).toContainText('60');
  await expect(history).toContainText('20');
  await expect(history).not.toContainText('Synthetic pounds');
  await exercise.getByRole('button', { name: 'Exercise history', exact: true }).click();
  await expect(exercise.getByLabel('Reps', { exact: true })).toHaveValue('6');
  await expect(exercise.getByLabel('Weight (kg)', { exact: true })).toHaveValue('62.5');
  await expect(page.locator('summary').filter({ hasText: 'Plate calculator' })).toBeVisible();
  expect(await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().data.active!.exercises[0].sets.length;
  })).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume workout', exact: true })).toBeEnabled();
  const saved = await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().data;
  });
  expect(saved.history).toHaveLength(2);
  expect(saved.routines!.find(routine => routine.id === source.id)).toEqual(source);
  expect(saved.routines!.find(routine => routine.id === copy.id)!.exercises[0].targetReps).toBe(6);
  expect(saved.active!.exercises[0].sets).toEqual([]);
});
