import { test, expect } from './app';

test('RPE, supersets, bodyweight loads and dual units work at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic detail day');
  await page.getByLabel('Weight unit', { exact: true }).selectOption('kg');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  for (const name of ['Bench press', 'Pull-up', 'Curl']) {
    await page.getByLabel('Exercise name', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  }

  const bench = page.getByRole('form', { name: 'Log a set for Bench press' });
  await bench.getByLabel('Reps', { exact: true }).fill('8');
  await bench.getByLabel('Weight (kg)', { exact: true }).fill('60');
  await bench.getByLabel('RPE', { exact: true }).fill('8.5');
  await bench.getByRole('button', { name: 'Log set', exact: true }).click();
  const benchSets = page.getByRole('table', { name: 'Logged sets for Bench press' });
  await expect(benchSets).toContainText('60 kg'); await expect(benchSets).toContainText('≈ 132.5 lb'); await expect(benchSets).toContainText('8.5');

  const pullUp = page.getByRole('region', { name: 'Pull-up' });
  await pullUp.getByLabel('Bodyweight exercise', { exact: true }).check();
  const pulls = page.getByRole('form', { name: 'Log a set for Pull-up' });
  await expect(pulls.getByText('Use 0 for bodyweight only, a negative number for assistance.')).toBeVisible();
  await pulls.getByLabel('Reps', { exact: true }).fill('6');
  await pulls.getByLabel('Added weight (kg)', { exact: true }).fill('-20');
  await pulls.getByRole('button', { name: 'Log set', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Logged sets for Pull-up' })).toContainText('−20 kg assist');
  await pullUp.getByLabel('Bodyweight exercise', { exact: true }).click();
  await expect(page.getByText('Change assisted (negative weight) sets to 0 or more', { exact: false }).first()).toBeVisible();
  await expect(pullUp.getByLabel('Bodyweight exercise', { exact: true })).toBeChecked();

  await page.getByLabel('Select Bench press for superset', { exact: true }).check();
  await page.getByLabel('Select Pull-up for superset', { exact: true }).check();
  await page.getByRole('button', { name: 'Group as superset', exact: true }).click();
  const group = page.getByRole('group', { name: 'Superset A' });
  await expect(group.getByRole('region', { name: 'Bench press' })).toBeVisible();
  await expect(group.getByRole('region', { name: 'Pull-up' })).toBeVisible();
  await page.getByRole('button', { name: 'Move Curl up', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move Curl down', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const curl = page.getByRole('form', { name: 'Log a set for Curl' });
  await curl.getByLabel('Reps', { exact: true }).fill('10');
  await curl.getByLabel('Weight (kg)', { exact: true }).fill('12');
  await curl.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await expect(page.getByText('Bodyweight exercises are left out of volume', { exact: false })).toBeVisible();
  await expect(page.getByText('RPE 8.5', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'View saved workout', exact: true }).click();
  await expect(page.getByText('Superset A', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Edit completed workout', exact: true }).click();
  await expect(page.getByLabel('Exercise 2 set 1 added weight (kg)', { exact: true })).toHaveValue('-20');
  await page.getByLabel('Exercise 1 set 1 RPE', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save corrections', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic detail day', level: 1 })).toBeVisible();
});
