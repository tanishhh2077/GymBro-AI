import { test, expect } from './app';

test('equipment profiles survive reload without logging sets at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic equipment workout');
  await page.getByLabel('Weight unit', { exact: true }).selectOption('lb');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByText('Plate calculator', { exact: true }).click();
  await page.getByLabel('Equipment profile name', { exact: true }).fill('Garage');
  await page.getByLabel('Bar weight (lb)', { exact: true }).fill('35');
  await page.getByRole('button', { name: 'Save equipment profile', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Resume workout', exact: true }).click();
  await page.getByText('Plate calculator', { exact: true }).click();
  await page.getByLabel('Total target weight (lb)', { exact: true }).fill('125');
  await page.getByRole('button', { name: 'Load Garage', exact: true }).click();
  await expect(page.getByLabel('Bar weight (lb)', { exact: true })).toHaveValue('35');
  await expect(page.getByLabel('Total target weight (lb)', { exact: true })).toHaveValue('125');
  await page.getByRole('button', { name: 'Calculate plates', exact: true }).click();
  await expect(page.getByText('Resulting total: 125 lb', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Delete Garage', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load Garage', exact: true })).toHaveCount(0);
});

test('weekly reminder revisits due state and requests a JSON backup at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const now = Date.UTC(2026, 10, 6, 12);
  await page.clock.install({ time: now });
  await page.goto('/');
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await page.getByLabel('Remind me to back up weekly', { exact: true }).check();
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await page.clock.fastForward(7 * 86_400_000);
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Back up now', exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up now', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await download.delete();
  await expect(page.getByText('Download requested. Keep the JSON file for recovery.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back up now', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Back up now', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
