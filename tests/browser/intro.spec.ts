import { expect, test } from './app';

test.use({ firstRunIntro: true });

test('first run shows a skippable three-step intro once, and Home can reopen it', async ({ page }) => {
  await page.goto('/');
  const intro = page.getByRole('dialog', { name: 'Welcome to GymBro AI' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('Step 1 of 3');
  await expect(intro.getByRole('heading', { name: 'Log workouts and routines' })).toBeFocused();

  await intro.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(intro).toContainText('Step 2 of 3');
  await expect(intro.getByRole('heading', { name: 'Progress, records and optional backups' })).toBeFocused();
  await intro.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(intro).toContainText('Step 1 of 3');
  await intro.getByRole('button', { name: 'Next', exact: true }).click();
  await intro.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(intro.getByRole('heading', { name: 'Bench video analysis on this device' })).toBeVisible();
  await expect(intro).toContainText('never uploaded');

  await intro.getByRole('button', { name: 'Get started', exact: true }).click();
  await expect(intro).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'Your training.' })).toBeFocused();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Your training.' })).toBeVisible();
  await expect(intro).toBeHidden();

  await page.getByRole('button', { name: 'Show intro again', exact: true }).click();
  await expect(intro).toContainText('Step 1 of 3');
  await page.keyboard.press('Escape');
  await expect(intro).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Your training.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show intro again', exact: true }).click();
  await page.getByRole('dialog', { name: 'Welcome to GymBro AI' }).getByRole('button', { name: 'Skip intro', exact: true }).click();
  await expect(intro).toBeHidden();
});
