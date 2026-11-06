import { test, expect } from './app';

test('workout note, exercise order, repeat and unsaved-change prompts work at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic editing day');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  for (const name of ['Bench press', 'Row']) {
    await page.getByLabel('Exercise name', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  }
  await page.getByLabel('Workout note', { exact: true }).fill('Synthetic note');
  await expect(page.getByText('14 / 1000 characters', { exact: false })).toBeVisible();

  // Unsaved typed text: dismissing the prompt keeps the user on the workout.
  let prompt = '';
  page.once('dialog', dialog => { prompt = dialog.message(); void dialog.dismiss(); });
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(prompt).toBe('Discard unsaved changes?');
  await expect(page.getByLabel('Workout note', { exact: true })).toHaveValue('Synthetic note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText('Note saved.', { exact: true })).toBeVisible();

  const reps = page.getByRole('form', { name: 'Log a set for Bench press' }).getByLabel('Reps', { exact: true });
  await reps.fill('8');
  await page.getByRole('form', { name: 'Log a set for Bench press' }).getByLabel('Weight (lb)', { exact: true }).fill('95');
  await page.getByRole('button', { name: 'Log set', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Move Bench press up', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Move Bench press down', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move Bench press up', exact: true })).toBeFocused();
  await expect(page.getByRole('table', { name: 'Logged sets for Bench press' })).toContainText('95 lb');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const row = page.getByRole('form', { name: 'Log a set for Row' });
  await row.getByLabel('Reps', { exact: true }).fill('10');
  await row.getByLabel('Weight (lb)', { exact: true }).fill('70');
  await row.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await expect(page.getByText('Synthetic note', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View saved workout', exact: true }).click();
  await page.getByRole('button', { name: 'Repeat workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic editing day', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Previous workout' }).first()).toBeVisible();
});
