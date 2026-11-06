import { test, expect } from './app';
import type { Page } from '@playwright/test';

test.use({ timezoneId: 'America/Chicago' });

async function seed(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    const state = workoutStore.getState();
    const record = (id: string, name: string, date: string) => ({ id, name, unit: 'kg' as const,
      startedAt: Date.parse(date) - 60_000, finishedAt: Date.parse(date),
      exercises: [{ id: `e-${id}`, name: 'Bench press', sets: [{ id: `s-${id}`, reps: 8, weight: 60 }] }] });
    const result = await state.restoreBackup({ format: 'gymbro-ai-workout-backup', version: 1,
      exportedAt: Date.now(), data: { version: 3, revision: 0, active: null, history: [
        record('upper', 'Synthetic upper', '2026-11-04T05:30:00Z'),
        record('other', 'Synthetic other', '2026-11-05T18:00:00Z'),
      ] } }, state.data.revision);
    if (!result.ok) throw new Error(result.message);
  });
  await page.getByRole('button', { name: 'View workout history', exact: true }).click();
}

test('mobile history calendar filters local days and completed corrections save explicitly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByRole('button', { name: 'Show calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Tuesday, November 3, 2026, 1 workout', exact: true }).click();
  await expect(page.getByLabel('From', { exact: true })).toHaveValue('2026-11-03');
  await expect(page.getByLabel('To', { exact: true })).toHaveValue('2026-11-03');
  await expect(page.getByRole('status').filter({ hasText: '1 of 2 workouts match' })).toBeVisible();
  await page.getByRole('button', { name: /Synthetic upper/ }).click();
  await page.getByRole('button', { name: 'Edit completed workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Discarded name');
  page.once('dialog', dialog => { expect(dialog.message()).toBe('Discard unsaved changes?'); void dialog.accept(); });
  await page.getByRole('button', { name: 'Cancel workout edit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic upper', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit completed workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic corrected');
  await page.getByLabel('Exercise 1 set 1 reps', { exact: true }).fill('9');
  await page.getByLabel('Exercise 1 set 1 weight (kg)', { exact: true }).fill('62.5');
  await page.getByLabel('Exercise 1 set 1 kind', { exact: true }).selectOption('warmup');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save corrections', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic corrected', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '62.5 kg', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Warm-up/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'View workout history', exact: true }).click();
  await page.getByLabel('Search workouts or exercises', { exact: true }).fill('corrected');
  await expect(page.getByRole('status').filter({ hasText: '1 of 2 workouts match' })).toBeVisible();
  await page.getByRole('button', { name: 'Show calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.getByText('No completed workouts this month.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await page.getByRole('button', { name: 'Thursday, November 5, 2026, 1 workout', exact: true }).click();
  await expect(page.getByText('No workouts match these filters.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '2 of 2 workouts match' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('completed correction rejects another tab and keeps the old draft after reload', async ({ page, context }) => {
  await seed(page);
  await page.getByRole('button', { name: /Synthetic upper/ }).click();
  await page.getByRole('button', { name: 'Edit completed workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Stale typed draft');
  const other = await context.newPage(); await other.goto('/');
  await other.getByRole('button', { name: 'View workout history', exact: true }).click();
  await other.getByRole('button', { name: /Synthetic upper/ }).click();
  await other.getByRole('button', { name: 'Edit completed workout', exact: true }).click();
  await other.getByLabel('Workout name', { exact: true }).fill('Other tab correction');
  await other.getByRole('button', { name: 'Save corrections', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Other tab correction', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save corrections', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload saved workouts', exact: true })).toBeVisible();
  await expect(page.getByLabel('Workout name', { exact: true })).toHaveValue('Stale typed draft');
  await page.getByRole('button', { name: 'Reload saved workouts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save corrections', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Workout name', { exact: true })).toHaveValue('Stale typed draft');
  page.once('dialog', dialog => { expect(dialog.message()).toBe('Discard unsaved changes?'); void dialog.accept(); });
  await page.getByRole('button', { name: 'Cancel workout edit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Other tab correction', exact: true })).toBeVisible();
  await other.close();
});
