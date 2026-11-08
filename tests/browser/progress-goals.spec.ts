import { test, expect } from './app';

// Requires App to pass its workout store to WorkoutProgress (store={workouts}); synthetic logs only.
test('adds, edits and deletes a goal derived from a logged regular set', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic goal day');
  await page.getByLabel('Weight unit', { exact: true }).selectOption('lb');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  const exercise = page.getByRole('region', { name: 'Bench press', exact: true });
  await exercise.getByLabel('Reps', { exact: true }).fill('5');
  await exercise.getByLabel('Weight (lb)', { exact: true }).fill('205');
  await exercise.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Workout saved.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();

  await expect(page.getByText('Goal progress comes only from regular sets you logged in completed workouts.')).toBeVisible();
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  const form = page.getByRole('form', { name: 'Save goal' });
  await form.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await form.getByLabel('Weight unit', { exact: true }).selectOption('lb');
  await form.getByLabel('Goal weight (lb)', { exact: true }).fill('225');
  await form.getByLabel('Goal reps', { exact: true }).fill('5');
  await form.getByRole('button', { name: 'Save goal', exact: true }).click();
  const card = page.getByRole('article', { name: 'Goal for Bench press (lb)', exact: true });
  await expect(card).toContainText('Best so far: 5 reps × 205 lb');
  await expect(card).toContainText('20 lb to go');

  await page.reload();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  await page.getByRole('button', { name: 'Edit goal for Bench press (lb)', exact: true }).click();
  await page.getByRole('form', { name: 'Save goal' }).getByLabel('Goal weight (lb)', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await expect(card).toContainText('Achieved: 5 reps × 205 lb');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete goal for Bench press (lb)', exact: true }).click();
  await expect(page.getByText('No goals yet.', { exact: true })).toBeVisible();
});
