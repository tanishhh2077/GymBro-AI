import { Buffer } from 'node:buffer';
import { test, expect } from './app';
import { expectReadable } from './readability';

test('follows live system appearance and retains a manual override after reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' }); await page.goto('/');
  const root = page.locator('html');
  const appearance = page.getByRole('combobox', { name: 'Appearance', exact: true });
  await expect(appearance).toHaveValue('system'); await expect(root).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' }); await expect(root).toHaveAttribute('data-theme', 'dark');
  await appearance.selectOption('light'); await expect(root).toHaveAttribute('data-theme', 'light');
  await page.reload(); await expect(appearance).toHaveValue('light');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await appearance.selectOption('system'); await expect(root).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' }); await expect(root).toHaveAttribute('data-theme', 'light');
});

for (const mode of ['light', 'dark'] as const) {
  test(`${mode} appearance keeps workout, library, progress and video controls readable at phone width`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/'); await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption(mode);
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    await expectReadable(page.locator('body'));
    await expectReadable(page.getByRole('heading', { name: 'Your training.', exact: true }));
    await expectReadable(page.getByRole('combobox', { name: 'Appearance', exact: true }));
    await page.getByRole('button', { name: 'Start workout', exact: true }).click();
    await expectReadable(page.getByLabel('Workout name', { exact: true }));
    await expectReadable(page.getByRole('button', { name: 'Start workout', exact: true }));
    await page.getByLabel('Workout name', { exact: true }).fill(`Synthetic ${mode} workout`);
    await page.getByRole('button', { name: 'Start workout', exact: true }).click();
    await page.getByText('Browse exercise library', { exact: true }).click();
    await page.getByLabel('Search exercise library', { exact: true }).fill('bench press');
    const useBench = page.getByRole('button', { name: 'Use Bench press', exact: true });
    await expectReadable(useBench.locator('span').first()); await useBench.click();
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Reps', { exact: true }).fill('8');
    await page.getByLabel('Weight (lb)', { exact: true }).fill('60');
    await page.getByRole('button', { name: 'Log set', exact: true }).click();
    await expect(page.getByRole('row')).toHaveCount(2);
    await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
    await page.getByRole('button', { name: 'View progress', exact: true }).click();
    await expectReadable(page.getByRole('heading', { name: 'Progress', exact: true }));
    await expectReadable(page.locator('svg[role=img] path.text-accent'));
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expectReadable(page.getByRole('button', { name: 'Choose video', exact: true }));
    await page.locator('input[type=file]').setInputFiles({ name: 'empty.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(0) });
    const alert = page.getByRole('alert', { name: 'Video not accepted' });
    await expect(alert).toBeVisible(); await expectReadable(alert.locator('strong'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
