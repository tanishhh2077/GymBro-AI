import { fileURLToPath } from 'node:url';
import { test, expect, sessionSnapshot, expectNoPose, openAnalysis } from './app';
import { expectReadable } from './readability';

const noPerson = fileURLToPath(new URL('../fixtures/no-person.mp4', import.meta.url));

test('real no-person inference stays replayable, releases URLs, and permits a fresh job', async ({ page, browser }, testInfo) => {
  const assets = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/\/(models|wasm)\//.test(url.pathname)) assets.add(url.pathname);
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await openAnalysis(page);
  await page.locator('input[type=file]').setInputFiles(noPerson);
  await expect(page.getByRole('button', { name: 'Choose video' })).toBeDisabled();
  await expectReadable(page.getByText('no-person.mp4', { exact: true }).locator('..').getByText(/view$/));
  await expectNoPose(page);
  await expectReadable(page.getByRole('heading', { name: 'Left elbow', exact: true }));
  await expectReadable(page.getByRole('heading', { name: 'Right elbow', exact: true }));
  const first = (await sessionSnapshot(page)).clips[0];
  expect(first.status).toBe('no-pose');
  expect(first.pose?.frames.length).toBeGreaterThan(0);
  expect(first.pose?.frames.every((frame) => frame.landmarks === null && frame.worldLandmarks === null)).toBe(true);
  expect(first.pose?.coverage.framesWithPose).toBe(0);
  expect(first.pose?.coverage.detectionRate).toBe(0);
  expect(first.pose?.delegate).toMatch(/^(GPU|CPU)$/);
  expect(assets.has('/models/pose_landmarker_full.task')).toBe(true);
  expect([...assets].some((asset) => asset.endsWith('.wasm'))).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze video', exact: true }).click();
  await expectNoPose(page);
  expect((await sessionSnapshot(page)).clips[0].id).toBe(first.id);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate((v) => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole('slider', { name: 'Video position' }).fill('2');
  await expect.poll(() => page.locator('video').evaluate((v) => (v as HTMLVideoElement).currentTime)).toBeCloseTo(2, 1);
  await page.getByRole('button', { name: '0.5×', exact: true }).click();
  expect(await page.locator('video').evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(0.5);
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect.poll(() => page.locator('video').evaluate((v) => (v as HTMLVideoElement).currentTime)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Remove clip', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose video' })).toBeEnabled();
  await expect.poll(() => page.evaluate(async (url) => {
    try { await fetch(url); return false; } catch { return true; }
  }, first.url)).toBe(true);
  await page.locator('input[type=file]').setInputFiles(noPerson);
  await expectNoPose(page);
  expect((await sessionSnapshot(page)).clips[0].id).not.toBe(first.id);
  testInfo.annotations.push({ type: 'runtime', description: `${browser.version()}; ${first.pose?.delegate}; synthetic no-person H.264 only` });
  console.info('No-person runtime:', { browser: browser.version(), delegate: first.pose?.delegate, samples: first.pose?.frames.length });
});

test('cancels a real processing job and admits another after cleanup', async ({ page }) => {
  await openAnalysis(page);
  await page.locator('input[type=file]').setInputFiles(noPerson);
  await expect(page.getByRole('button', { name: 'Choose video' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel processing and remove clip' })).toBeVisible();
  const first = (await sessionSnapshot(page)).clips[0];
  expect(first.status).toBe('processing');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze video', exact: true }).click();
  expect((await sessionSnapshot(page)).clips[0].id).toBe(first.id);
  await page.getByRole('button', { name: 'Cancel processing and remove clip' }).click();
  await expect(page.getByRole('button', { name: 'Choose video' })).toBeEnabled({ timeout: 70_000 });
  await expect.poll(async () => (await sessionSnapshot(page)).processingState).toBe('idle');
  await page.locator('input[type=file]').setInputFiles(noPerson);
  await expectNoPose(page);
  const state = await sessionSnapshot(page);
  expect(state.clips).toHaveLength(1);
  expect(state.clips[0].id).not.toBe(first.id);
  expect(state.clips[0].status).toBe('no-pose');
});

test('decodes and processes a native portrait source without calling it rotated-source coverage', async ({ page }) => {
  await openAnalysis(page);
  await page.locator('input[type=file]').setInputFiles(fileURLToPath(new URL('../fixtures/no-person-portrait.mp4', import.meta.url)));
  await expectNoPose(page);
  const pose = (await sessionSnapshot(page)).clips[0].pose;
  expect([pose?.width, pose?.height]).toEqual([160, 240]);
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const geometry = await page.locator('video').evaluate((element) => {
      const video = element as HTMLVideoElement;
      const rect = video.getBoundingClientRect();
      return {
        width: video.videoWidth, height: video.videoHeight,
        fit: getComputedStyle(video).objectFit,
        boxWidth: rect.width, boxHeight: rect.height, right: rect.right,
      };
    });
    expect([geometry.width, geometry.height]).toEqual([160, 240]);
    expect(geometry.fit).toBe('contain');
    expect(geometry.boxWidth).toBeGreaterThan(0);
    expect(geometry.boxHeight).toBeGreaterThan(0);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  }
});
