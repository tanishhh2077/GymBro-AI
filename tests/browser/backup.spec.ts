import type { Page } from '@playwright/test';
import type { WorkoutData } from '../../src/types/workout';
import { test, expect } from './app';

function data(): WorkoutData {
  return { version: 2, revision: 0, active: null,
    history: [{ id: 'done', name: 'Synthetic upper', unit: 'kg', startedAt: 1, finishedAt: 2,
      exercises: [{ id: 'e', name: 'Bench press', targetReps: 8, sets: [{ id: 's', reps: 5, weight: 22.125 }] }] }],
    routines: [{ id: 'r', name: 'Synthetic plan', unit: 'lb', exercises: [{ id: 're', name: 'Row', targetSets: 3 }] }] };
}
function backup(value = data()) {
  return Buffer.from(JSON.stringify({ format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 1000, data: value }));
}
async function seed(page: Page, value: WorkoutData) {
  await page.evaluate(async incoming => {
    const path = '/src/store/workoutRepository.ts';
    const { createWorkoutRepository } = await import(path) as typeof import('../../src/store/workoutRepository');
    const repository = createWorkoutRepository(indexedDB);
    const current = await repository.load();
    await repository.save(current.revision, { ...incoming, revision: current.revision });
  }, value);
  await page.reload();
}
async function openBackup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export backup', exact: true })).toBeEnabled();
}
async function choose(page: Page, buffer = backup(), name = 'synthetic-backup.json') {
  await page.getByLabel('Choose backup JSON file', { exact: true }).setInputFiles({ name, mimeType: 'application/json', buffer });
}

test('downloads saved records and restores the actual file into an empty library', async ({ page }) => {
  await openBackup(page); await seed(page, data());
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  expect(JSON.parse(bytes.toString()).data.history[0].exercises[0].sets[0].weight).toBe(22.125);
  await download.delete();
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('gymbro-workouts');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Synthetic database deletion was blocked'));
  }));
  await page.reload();
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await choose(page, bytes, download.suggestedFilename());
  await expect(page.getByRole('heading', { name: 'Restore preview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore additions', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Backup additions saved' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'View progress', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Heaviest logged set', exact: true })).toContainText('22.125 kg × 5 reps');
  await page.getByRole('button', { name: 'Routines', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic plan', exact: true })).toBeVisible();
});

test('malformed and conflicting backups preserve the existing library', async ({ page }) => {
  await openBackup(page); await seed(page, data());
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  await choose(page, Buffer.from('{'));
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
  const changed = data();
  await choose(page, backup({ ...changed, history: [{ ...changed.history[0], name: 'Conflicting version' }] }));
  await expect(page.getByRole('alert')).toContainText('conflict');
  await expect(page.getByRole('button', { name: 'Restore additions', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await page.getByRole('button', { name: 'View workout history', exact: true }).click();
  await expect(page.getByRole('button', { name: /Synthetic upper/ })).toBeVisible();
});

test('same-revision reload invalidates the preview and long filenames fit phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBackup(page);
  await choose(page, backup(), '界'.repeat(150) + '.json');
  await expect(page.getByRole('heading', { name: 'Restore preview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    await workoutStore.getState().load();
  });
  await expect(page.getByRole('heading', { name: 'Restore preview', exact: true })).toHaveCount(0);
  await choose(page);
  await expect(page.getByRole('button', { name: 'Restore additions', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancel preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Restore preview', exact: true })).toHaveCount(0);
});
