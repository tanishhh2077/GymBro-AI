import { test, expect } from './app';

test('an enabled weekly reminder appears on Home and opens backup without claiming an export', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Remind me to back up weekly', exact: true }).check();
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Back up now', exact: true })).toHaveCount(0);
  await page.clock.fastForward(7 * 24 * 60 * 60 * 1000);
  await page.getByRole('button', { name: 'Back up now', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Backup and restore', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back up now', exact: true })).toBeVisible();
  await expect(page.getByText('Download requested. Keep the JSON file for recovery.', { exact: true })).toHaveCount(0);
});

test('Home opens searchable help and returns without changing the workout library', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Help', exact: true })).toBeVisible();
  await page.getByLabel('Search help', { exact: true }).fill('backup');
  await expect(page.getByRole('main')).toContainText('JSON');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  expect(await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().data.revision;
  })).toBe(0);
});
