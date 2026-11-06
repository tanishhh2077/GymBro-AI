import { test, expect } from './app';

test.use({ timezoneId: 'America/Chicago' });

test('integrated history, progress ranges and calculator retain saved and draft workout values', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: Date.UTC(2026, 10, 6, 18) });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    const record = (id: string, name: string, exercise: string, date: string, weight: number) => ({
      id, name, unit: 'kg' as const, startedAt: Date.parse(date) - 60000, finishedAt: Date.parse(date),
      exercises: [{ id: `e-${id}`, name: exercise, sets: [{ id: `s-${id}`, reps: 8, weight }] }],
    });
    const state = workoutStore.getState();
    const result = await state.restoreBackup({ format: 'gymbro-ai-workout-backup', version: 1,
      exportedAt: Date.now(), data: { version: 3, revision: 0, active: null, history: [
        record('old', 'Synthetic older upper', 'Bench press', '2026-03-01T18:00:00Z', 100),
        record('recent', 'Synthetic recent upper', 'Bench press', '2026-11-05T18:00:00Z', 60.5),
        record('legs', 'Synthetic recent legs', 'Leg press', '2026-11-05T18:00:00Z', 80),
      ] } }, state.data.revision);
    if (!result.ok) throw new Error(result.message);
  });
  await page.getByRole('button', { name: 'View workout history', exact: true }).click();
  await page.getByLabel('Search workouts or exercises', { exact: true }).fill('BENCH');
  await page.getByLabel('From', { exact: true }).fill('2026-11-05');
  await page.getByLabel('To', { exact: true }).fill('2026-11-05');
  await expect(page.getByRole('status').filter({ hasText: '1 of 3 workouts match' })).toBeVisible();
  await page.getByRole('button', { name: /Synthetic recent upper/ }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic recent upper', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  const heaviest = page.getByRole('region', { name: 'Heaviest logged set', exact: true });
  await expect(heaviest).toContainText('100 kg × 8 reps');
  await page.getByLabel('Time period', { exact: true }).selectOption({ label: 'Last month' });
  await expect(heaviest).toContainText('60.5 kg × 8 reps');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Weight unit', { exact: true }).selectOption('kg');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Reps', { exact: true }).fill('8');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('62.5');
  await page.locator('summary').filter({ hasText: 'Plate calculator' }).click();
  await page.getByLabel('Total target weight (kg)', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Calculate plates', exact: true }).click();
  await expect(page.getByText('Resulting total: 60 kg', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('8');
  await expect(page.getByLabel('Weight (kg)', { exact: true })).toHaveValue('62.5');
  expect(await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().data.active?.exercises[0].sets.length;
  })).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
