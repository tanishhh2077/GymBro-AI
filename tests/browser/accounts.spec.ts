import { test, expect } from './app';

test('unconfigured accounts keep the guest library available and use the existing store entry point', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  expect(await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return workoutStore.getState().loaded;
  })).toBe(true);
  await page.getByRole('button', { name: 'Account and sync', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Accounts are not configured', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
});
