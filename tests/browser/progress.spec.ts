import type { Page } from '@playwright/test';
import type { WeightUnit, Workout, WorkoutData } from '../../src/types/workout';
import { test, expect } from './app';

async function logWorkout(page: Page, name: string, unit: WeightUnit, reps: number, weight: number) {
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill(name);
  await page.getByLabel('Weight unit', { exact: true }).selectOption(unit);
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  const exercise = page.getByRole('region', { name: 'Bench press', exact: true });
  await exercise.getByLabel('Reps', { exact: true }).fill(String(reps));
  await exercise.getByLabel(`Weight (${unit})`, { exact: true }).fill(String(weight));
  await exercise.getByRole('button', { name: 'Log set', exact: true }).click();
  await expect(exercise.getByRole('cell', { name: new RegExp(`^${String(weight).replace(/\./g, '\\.')} ${unit}`) })).toBeVisible();
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Workout saved.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
}

function fixtureWorkout(id: string, exerciseName: string, weight: number, unit: WeightUnit, finishedAt: number): Workout {
  return {
    id, name: `Synthetic ${id}`, unit, startedAt: 0, finishedAt,
    exercises: [{ id: `${id}-exercise`, name: exerciseName, sets: [{ id: `${id}-set`, reps: 5, weight }] }],
  };
}

test('completed workout records survive reload and follow their actual source through deletion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await logWorkout(page, 'Synthetic rep day', 'kg', 12, 30);
  await logWorkout(page, 'Synthetic heavy day', 'kg', 5, 50);
  await logWorkout(page, 'Synthetic pound day', 'lb', 8, 100);
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Heaviest logged set', exact: true })).toContainText('50 kg × 5 reps');
  await expect(page.getByRole('region', { name: 'Most reps in a set', exact: true })).toContainText('12 reps at 30 kg');
  await page.reload();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  await page.getByLabel('Exercise and unit', { exact: true }).selectOption({ label: 'Bench press (lb)' });
  await expect(page.getByRole('region', { name: 'Heaviest logged set', exact: true })).toContainText('100 lb × 8 reps');
  await page.getByLabel('Exercise and unit', { exact: true }).selectOption({ label: 'Bench press (kg)' });
  await page.getByRole('button', { name: 'View workout for heaviest set', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic heavy day', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /^50 kg/ })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Heaviest logged set', exact: true })).toContainText('30 kg × 12 reps');
  await page.getByRole('button', { name: 'View record at 30 kg', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic rep day', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /^30 kg/ })).toBeVisible();
});

test('long names, full chart history, paging and a zero-load point work at phone width', async ({ page }) => {
  const name = 'E'.repeat(80);
  const data: WorkoutData = {
    version: 2, revision: 0, active: null,
    history: [
      ...Array.from({ length: 25 }, (_, index) => fixtureWorkout(`w-${index}`, name, index + 1, 'kg', index + 1)),
      fixtureWorkout('zero', 'Row', 0, 'lb', 50),
    ],
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await page.evaluate(async value => {
    const modulePath = '/src/store/workoutRepository.ts';
    const { createWorkoutRepository } = await import(modulePath) as typeof import('../../src/store/workoutRepository');
    const repository = createWorkoutRepository(indexedDB);
    const current = await repository.load();
    await repository.save(current.revision, { ...value, revision: current.revision });
  }, data);
  await page.reload();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  const historyRows = page.getByRole('table', { name: 'Workout progress history', exact: true }).locator('tbody tr');
  await expect(historyRows).toHaveCount(20);
  expect((await page.locator('polyline').getAttribute('points'))?.split(' ')).toHaveLength(25);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Show more workouts', exact: true }).click();
  await expect(historyRows).toHaveCount(25);
  await page.getByRole('button', { name: 'Show more weight records', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Rep records by weight', exact: true }).locator('tbody tr')).toHaveCount(25);
  await page.getByLabel('Exercise and unit', { exact: true }).selectOption({ label: 'Row (lb)' });
  await expect(page.getByRole('region', { name: 'Heaviest logged set', exact: true })).toContainText('0 lb × 5 reps');
  await expect(page.getByRole('img', { name: 'Heaviest logged load per completed workout (lb)', exact: true })).toBeVisible();
  expect(await page.locator('svg[role="img"] path').getAttribute('d')).not.toMatch(/NaN|Infinity/);
  await page.getByLabel('Exercise and unit', { exact: true }).selectOption({ label: `${name} (kg)` });
  await expect(historyRows).toHaveCount(20);
});
