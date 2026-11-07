import { test, expect } from './app';

test.use({ timezoneId: 'America/Chicago' });

test('seven-day totals and actual CSV download preserve the synthetic library at phone width', async ({ page }) => {
  const now = Date.UTC(2026, 10, 6, 18);
  const week = 7 * 24 * 60 * 60 * 1000;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: now });
  await page.clock.setFixedTime(now);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeEnabled();
  const source = await page.evaluate(async ({ now, week }) => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    const record = (id: string, finishedAt: number, unit: 'kg' | 'lb') => ({
      id, name: `Synthetic ${id}`, unit, startedAt: finishedAt - 120000, finishedAt,
      exercises: [{ id: `e-${id}`, name: 'Row', sets: [{ id: `s-${id}`, reps: 5, weight: 0 }] }],
    });
    const recent = record('recent', now, 'kg');
    const state = workoutStore.getState();
    const result = await state.restoreBackup({ format: 'gymbro-ai-workout-backup', version: 1,
      exportedAt: now, data: { version: 3, revision: 0,
        active: { ...record('active', now, 'lb'), finishedAt: null }, history: [
          { ...recent, name: '=SUM("x,y")', exercises: [{ id: 'e-recent', name: '@Row', sets: [
            { id: 'warm', reps: 10, weight: 20, kind: 'warmup' }, { id: 'regular', reps: 3, weight: 22.125 },
          ] }] },
          record('old', now - week - 1, 'lb'), record('boundary', now - week, 'lb'), record('future', now + 1, 'kg'),
        ] } }, state.data.revision);
    if (!result.ok) throw new Error(result.message);
    return JSON.stringify(workoutStore.getState().data);
  }, { now, week });
  const summary = page.getByRole('region', { name: 'Last seven days', exact: true });
  await expect(summary.getByText('Completed workouts', { exact: true }).locator('..').locator('dd')).toHaveText('2');
  await expect(summary.getByText('Actual sets', { exact: true }).locator('..').locator('dd')).toHaveText('3');
  await expect(summary.getByText('Elapsed workout time', { exact: true }).locator('..').locator('dd')).toHaveText('4m 0s');
  await expect(summary.getByText('Entered-load volume (kg)', { exact: true }).locator('..').locator('dd')).toHaveText('266.375 kg');
  await expect(summary.getByText('Entered-load volume (lb)', { exact: true }).locator('..').locator('dd')).toHaveText('0 lb');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.clock.setFixedTime(now + week + 2);
  await expect(summary.getByText('Completed workouts', { exact: true }).locator('..').locator('dd')).toHaveText('2');
  await page.getByRole('button', { name: 'Backup and restore', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workout CSV', exact: true }).click();
  const download = await pending;
  try {
    expect(download.suggestedFilename()).toMatch(/^gymbro-ai-workouts-.*\.csv$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString('utf8');
    expect(text).toContain('workout_id,workout_name,started_at,finished_at,exercise_id,exercise_name,set_id,set_number,unit,reps,weight,kind,rpe,bodyweight\r\n');
    expect(text).toContain('recent,"\'=SUM(""x,y"")",');
    expect(text).toContain("e-recent,'@Row,regular,2,kg,3,22.125,regular,,no\r\n");
    expect(text).toContain("e-recent,'@Row,warm,1,kg,10,20,warmup,,no\r\n");
    expect(text).not.toContain('active');
    expect(text.indexOf('old,')).toBeLessThan(text.indexOf('boundary,'));
    expect(text.indexOf('boundary,')).toBeLessThan(text.indexOf('recent,'));
    expect(text.indexOf('recent,')).toBeLessThan(text.indexOf('future,'));
    expect(text.split('\r\n')).toHaveLength(7);
  } finally { await download.delete(); }
  await expect(page.getByRole('status').filter({ hasText: 'CSV download requested.' })).toBeVisible();
  expect(await page.evaluate(async () => {
    const path = '/src/store/useWorkoutStore.ts';
    const { workoutStore } = await import(path) as typeof import('../../src/store/useWorkoutStore');
    return JSON.stringify(workoutStore.getState().data);
  })).toBe(source);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await expect(summary).toContainText('No completed workouts in this seven-day window.');
});
