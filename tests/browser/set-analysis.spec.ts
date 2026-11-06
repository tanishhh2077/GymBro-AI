import { Buffer } from 'node:buffer';
import { test, expect, sessionSnapshot } from './app';

// An undecodable synthetic file is enough: linking does not depend on the
// processing outcome, and the real decoder still runs and reports failure.
const invalidVideo = { name: 'invalid.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not a movie') };

test('opens analysis from a logged bench set and returns to that set', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic linked workout');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Reps', { exact: true }).fill('5');
  await page.getByLabel('Weight (lb)', { exact: true }).fill('135');
  await page.getByRole('button', { name: 'Log set', exact: true }).click();

  await page.getByRole('button', { name: 'Analyze video for set 1 of Bench press', exact: true }).click();
  await expect(page.getByText('For your logged set 1 of Bench press: 5 reps × 135 lb', { exact: false })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(invalidVideo);
  await expect(page.getByRole('alert')).toContainText('The video could not be read');
  await expect(page.getByText('Linked to your logged set 1 of Bench press', { exact: false })).toBeVisible();
  const [clip] = (await sessionSnapshot(page)).clips;
  expect(clip.errorKind).toBe('video-load');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Back to set', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic linked workout', exact: true })).toBeVisible();
  await expect(page.locator('tr[id^="set-row-"]').first()).toBeFocused();
  await expect(page.getByRole('button', { name: 'View analysis for set 1 of Bench press', exact: true })).toBeVisible();
});
