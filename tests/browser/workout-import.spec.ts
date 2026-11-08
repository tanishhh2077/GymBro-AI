import { test, expect } from './app';
const csv = 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n2025-01-02 18:00:00,Synthetic import,45m,Bench Press,1,60,8,0,0,,,8';

test('previews a local CSV then imports only additions and skips a repeat', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await page.getByRole('button', { name: 'Import workout CSV', exact: true }).click();
  await page.getByLabel('Strong file weight unit', { exact: true }).selectOption('kg');
  await page.getByLabel('Source UTC offset in minutes', { exact: true }).fill('0');
  const file = { name: 'synthetic-strong.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) };
  await page.getByLabel('Choose workout CSV file', { exact: true }).setInputFiles(file);
  await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toBeVisible();
  await expect(page.getByText('1 completed workouts to add; 0 identical workouts skipped; 1 sets in file.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import additions', exact: true })).toBeDisabled();
  await page.getByLabel('I reviewed the units, times and warnings. All included exercises use external loads.', { exact: true }).check();
  await page.getByRole('button', { name: 'Import additions', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Imported workout additions saved on this device.');
  await page.getByLabel('Choose workout CSV file', { exact: true }).setInputFiles(file);
  await expect(page.getByText('These imported records are already on this device.', { exact: true })).toBeVisible();
  await page.getByLabel('Choose workout CSV file', { exact: true }).setInputFiles({ ...file, buffer: Buffer.from(csv.replace(',60,8,', ',70,8,')) });
  await expect(page.getByRole('alert')).toContainText('conflict');
  await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toHaveCount(0);
});
