import type { Page } from '@playwright/test';
import type { WorkoutData } from '../../src/types/workout';
import { test, expect } from './app';

type StoredLibrary = Omit<WorkoutData, 'version'> & { version: number };
async function library(page: Page, replacement?: unknown): Promise<StoredLibrary> {
  return page.evaluate(value => new Promise<StoredLibrary>((resolve, reject) => {
    const open = indexedDB.open('gymbro-workouts', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('library', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('library');
      const request = value === undefined ? store.get('current') : store.put(value, 'current');
      tx.oncomplete = () => { db.close(); resolve((value === undefined ? request.result : value) as StoredLibrary); };
      tx.onabort = () => { db.close(); reject(tx.error); };
      request.onerror = () => reject(request.error);
    };
  }), replacement);
}
async function draft(page: Page, name = 'Synthetic push day') {
  await page.getByRole('button', { name: 'Routines', exact: true }).click();
  await page.getByRole('button', { name: 'New routine', exact: true }).click();
  await page.getByLabel('Routine name', { exact: true }).fill(name);
  await page.getByLabel('Routine weight unit', { exact: true }).selectOption('kg');
  await page.getByLabel('Exercise 1 name', { exact: true }).fill('Bench press');
  await page.getByLabel('Target sets for exercise 1', { exact: true }).fill('3');
  await page.getByLabel('Target reps for exercise 1', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Add routine exercise', exact: true }).click();
  await page.getByLabel('Exercise 2 name', { exact: true }).fill('Row');
  await page.getByLabel('Target reps for exercise 2', { exact: true }).fill('12');
}
test('routine CRUD, order and target snapshots keep actual workout history accurate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await draft(page); await page.getByRole('button', { name: 'Move exercise 2 up', exact: true }).click();
  await expect(page.getByLabel('Exercise 1 name', { exact: true })).toHaveValue('Row');
  await expect(page.getByLabel('Target reps for exercise 1', { exact: true })).toHaveValue('12');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic push day', exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Manage routines', exact: true }).click();
  await page.getByRole('button', { name: 'Start routine Synthetic push day', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic push day', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('Planned target:', { exact: false })).toHaveCount(2);
  const active = (await library(page)).active!;
  expect(active.exercises.map(e => e.name)).toEqual(['Row', 'Bench press']);
  expect(active.exercises.every(e => e.sets.length === 0)).toBe(true);
  for (const name of ['Row', 'Bench press']) {
    const exercise = page.getByRole('region', { name, exact: true });
    await exercise.getByLabel('Reps', { exact: true }).fill('5');
    await exercise.getByLabel('Weight (kg)', { exact: true }).fill('20');
    await exercise.getByRole('button', { name: 'Log set', exact: true }).click();
    await expect(exercise.getByRole('cell', { name: '20 kg', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Workout saved.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  expect((await library(page)).history[0].exercises.reduce((n, e) => n + e.sets.length, 0)).toBe(2);
  await page.getByRole('button', { name: 'Manage routines', exact: true }).click();
  await page.getByRole('button', { name: 'Start routine Synthetic push day', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic push day', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  expect((await library(page)).active!.id).not.toBe(active.id);
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Discard workout', exact: true }).click();
  await page.getByRole('button', { name: 'Routines', exact: true }).click();
  await page.getByRole('button', { name: 'Edit routine Synthetic push day', exact: true }).click();
  await page.getByLabel('Routine name', { exact: true }).fill('R'.repeat(80));
  await page.getByLabel('Routine weight unit', { exact: true }).selectOption('lb');
  await page.getByLabel('Exercise 1 name', { exact: true }).fill('E'.repeat(80));
  await page.getByRole('button', { name: 'Remove routine exercise 2', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'R'.repeat(80), exact: true })).toBeVisible();
  const updated = (await library(page)).routines![0];
  expect(updated.unit).toBe('lb'); expect(updated.exercises).toHaveLength(1);
  expect((await library(page)).history[0].unit).toBe('kg');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: `Delete routine ${'R'.repeat(80)}`, exact: true }).click();
  expect((await library(page)).routines).toHaveLength(1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Delete routine ${'R'.repeat(80)}`, exact: true }).click();
  await expect(page.getByText('Save a routine to reuse your exercise plan without retyping it.', { exact: true })).toBeVisible();
  expect((await library(page)).history).toHaveLength(1);
});
test('native IndexedDB legacy records stay unchanged on load and survive the first v2 save', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  const legacy = { version: 1, revision: 7, active: { id: 'legacy-active', name: 'Legacy active', unit: 'lb', startedAt: 1,
    finishedAt: null, exercises: [] }, history: [{ id: 'legacy-history', name: 'Legacy finished', unit: 'kg', startedAt: 1, finishedAt: 2,
    exercises: [{ id: 'legacy-e', name: 'Bench press', sets: [{ id: 'legacy-s', reps: 5, weight: 20 }] }] }] };
  await library(page, legacy); await page.reload();
  await expect(page.getByRole('button', { name: 'Resume workout', exact: true })).toBeEnabled();
  expect(await library(page)).toEqual(legacy);
  await draft(page, 'Migration routine'); await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Migration routine', exact: true })).toBeVisible();
  const upgraded = await library(page);
  expect(upgraded.version).toBe(4); expect(upgraded.revision).toBe(8);
  expect(upgraded.active).toEqual(legacy.active); expect(upgraded.history).toEqual(legacy.history);
  await expect(page.getByRole('button', { name: 'Start routine Migration routine', exact: true })).toBeDisabled();
  await page.reload(); await page.getByRole('button', { name: 'View workout history', exact: true }).click();
  await page.getByRole('button', { name: /Legacy finished/ }).click();
  await expect(page.getByRole('cell', { name: '20 kg', exact: true })).toBeVisible();
});
test('a stale routine editor cannot overwrite another tab after conflict and reload', async ({ page, context }) => {
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  await draft(page); await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic push day', exact: true })).toBeVisible();
  const other = await context.newPage(); await other.goto('/');
  await other.getByRole('button', { name: 'Manage routines', exact: true }).click();
  await other.getByRole('button', { name: 'Edit routine Synthetic push day', exact: true }).click();
  await other.getByLabel('Routine name', { exact: true }).fill('Stale edit');
  await page.getByRole('button', { name: 'Edit routine Synthetic push day', exact: true }).click();
  await page.getByLabel('Routine name', { exact: true }).fill('First tab edit');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'First tab edit', exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('another tab');
  await other.getByRole('button', { name: 'Reload saved workouts', exact: true }).click();
  await other.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('Reopen this routine');
  await expect(other.getByLabel('Routine name', { exact: true })).toHaveValue('Stale edit');
  expect((await library(page)).routines![0].name).toBe('First tab edit');
  other.once('dialog', dialog => { expect(dialog.message()).toBe('Discard unsaved changes?'); void dialog.accept(); });
  await other.getByRole('button', { name: 'Cancel routine edit', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'First tab edit', exact: true })).toBeVisible();
  await other.close();
});
