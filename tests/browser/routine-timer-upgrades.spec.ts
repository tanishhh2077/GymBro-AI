import { test, expect } from './app';

test('routine search and sorting preserve saved order and timer alerts are session opt-ins at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    for (const routine of [
      { name: 'Synthetic upper', unit: 'kg' as const, exercises: [{ name: 'Bench press' }] },
      { name: 'Alpha legs', unit: 'lb' as const, exercises: [{ name: 'Squat' }] },
    ]) {
      const result = await workoutStore.getState().createRoutine(routine);
      if (!result.ok) throw new Error(result.message);
    }
  });
  await page.getByRole('button', { name: 'Manage routines', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Synthetic upper', 'Alpha legs']);
  await page.getByLabel('Sort routines', { exact: true }).selectOption('name');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Alpha legs', 'Synthetic upper']);
  await page.getByLabel('Search routines or exercises', { exact: true }).fill(' BENCH ');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Synthetic upper']);
  await page.getByLabel('Search routines or exercises', { exact: true }).fill('missing');
  await expect(page.getByText('No routines match these filters.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear routine filters', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Synthetic upper', 'Alpha legs']);
  expect(await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().data.routines!.map(routine => routine.name);
  })).toEqual(['Synthetic upper', 'Alpha legs']);
  await page.getByRole('button', { name: 'Start routine Synthetic upper', exact: true }).click();
  const timer = page.getByRole('region', { name: 'Rest timer', exact: true });
  await expect(timer.getByLabel('Sound on completion', { exact: true })).not.toBeChecked();
  await expect(timer.getByLabel('Vibrate on completion', { exact: true })).not.toBeChecked();
  await timer.getByLabel('Sound on completion', { exact: true }).check();
  await expect(timer.getByText('Sound enabled for this workout.', { exact: true })).toBeVisible();
  await timer.getByLabel('Sound on completion', { exact: true }).uncheck();
  await expect(timer).toContainText('without a guaranteed background alert');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Resume workout', exact: true }).click();
  await expect(page.getByLabel('Sound on completion', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Vibrate on completion', { exact: true })).not.toBeChecked();
});
