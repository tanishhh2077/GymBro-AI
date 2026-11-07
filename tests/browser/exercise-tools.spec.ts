import { test, expect } from './app';

test('keeps favorites across reload and custom exercises searchable with equipment filters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic favorites workout');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Custom exercise');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Custom exercise', exact: true })).toBeVisible();
  await page.getByText('Browse exercise library', { exact: true }).click();
  await page.getByRole('button', { name: 'Favorite Bench press', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unfavorite Bench press', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('');
  await page.reload();
  await page.getByRole('button', { name: 'Resume workout', exact: true }).click();
  await page.getByText('Browse exercise library', { exact: true }).click();
  await expect(page.locator('details li').first()).toContainText('Bench press');
  await page.getByLabel('Filter built-in equipment', { exact: true }).selectOption('Dumbbell');
  await expect(page.getByRole('button', { name: 'Use Bench press', exact: true })).toHaveCount(0);
  await page.getByLabel('Search exercise library', { exact: true }).fill('Custom');
  await expect(page.getByRole('button', { name: 'Use Custom exercise', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Use Custom exercise', exact: true }).click();
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Custom exercise');
});
