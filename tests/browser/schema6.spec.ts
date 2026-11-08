import { test, expect } from './app';

test('uses body log from Home and saves exercise notes through the workout editor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Body log', exact: true }).click();
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-11-07');
  await page.getByLabel('Weight unit', { exact: true }).selectOption('kg');
  await page.getByLabel('Body weight (kg)', { exact: true }).fill('80');
  await page.getByLabel('Waist', { exact: true }).fill('32');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Body log entry saved.' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Body log', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Body log entry for 2026-11-07' })).toContainText('80 kg');
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('Synthetic notes');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByText('Exercise note', { exact: true }).first().click();
  const note = page.getByRole('form', { name: 'Exercise note for Bench press', exact: true });
  await note.getByLabel('Exercise note', { exact: true }).fill('Synthetic seat setting 3');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(note.getByLabel('Exercise note', { exact: true })).toHaveValue('Synthetic seat setting 3');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(note.getByRole('status')).toHaveText('Note saved.');
  await page.reload();
  await page.getByRole('button', { name: 'Resume workout', exact: true }).click();
  await page.getByText('Exercise note', { exact: true }).first().click();
  await expect(page.getByRole('form', { name: 'Exercise note for Bench press' }).getByLabel('Exercise note', { exact: true })).toHaveValue('Synthetic seat setting 3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('imports, exports and reimports one routine through the normal Routines screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Routines', exact: true }).click();
  await page.getByRole('button', { name: 'Import routine file', exact: true }).click();
  const routine = { format: 'gymbro-ai-routine', version: 1, routine: { name: 'Synthetic shared pair', unit: 'kg', exercises: [
    { name: 'Row', targetSets: 3, superset: true }, { name: 'Press', targetReps: 8, superset: true },
  ] } };
  await page.getByLabel('Choose routine JSON file', { exact: true }).setInputFiles({ name: 'synthetic-routine.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(routine)) });
  await expect(page.getByRole('heading', { name: 'Routine preview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import this routine', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'imported successfully.' })).toBeVisible();
  await page.getByRole('button', { name: 'Share routine Synthetic shared pair', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export routine Synthetic shared pair', exact: true }).click();
  const download = await pending;
  const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks); await download.delete();
  const exported = JSON.parse(bytes.toString());
  expect(exported.version).toBe(2);
  expect(exported.routine.exercises.map((exercise: { superset: number }) => exercise.superset)).toEqual([1, 1]);
  await page.getByLabel('Choose routine JSON file', { exact: true }).setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: bytes });
  await page.getByRole('button', { name: 'Import this routine', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'imported successfully.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close routine sharing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic shared pair', exact: true })).toHaveCount(2);
});
