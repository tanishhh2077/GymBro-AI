import { test, expect, sessionSnapshot } from './app';
import { loadBenchFixture } from '../fixtures/benchFixture';

test('processes permitted real bench footage through the actual model', async ({ page }, testInfo) => {
  // Fail as setup, without skip/fake observations, if licensed footage is absent.
  const { manifest, videoPath } = await loadBenchFixture();
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(videoPath);
  await expect.poll(async () => (await sessionSnapshot(page)).clips[0]?.status, { timeout: 310_000 }).toMatch(/^(ready|no-pose|error)$/);
  const clip = (await sessionSnapshot(page)).clips[0];
  expect(clip.status, 'A useful bench-lifter pose is required; investigate no-pose/error results').toBe('ready');
  const pose = clip.pose;
  expect(pose).toBeTruthy();
  if (!pose) throw new Error('Missing real pose result');
  expect(pose.width).toBe(manifest.width);
  expect(pose.height).toBe(manifest.height);
  expect(pose.duration).toBeCloseTo(manifest.durationSeconds, 2);
  expect(pose.frames.length).toBeGreaterThan(0);
  let previous = -1;
  let detected = 0;
  for (const [index, frame] of pose.frames.entries()) {
    expect(frame.index).toBe(index);
    expect(Number.isFinite(frame.time)).toBe(true);
    expect(frame.time).toBeGreaterThan(previous);
    expect(frame.time).toBeLessThanOrEqual(pose.duration);
    previous = frame.time;
    if (frame.landmarks) {
      detected++;
      expect(frame.landmarks).toHaveLength(33);
      if (frame.worldLandmarks) expect(frame.worldLandmarks).toHaveLength(33);
      for (const point of [...frame.landmarks, ...(frame.worldLandmarks ?? [])]) {
        expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true);
      }
    } else expect(frame.worldLandmarks).toBeNull();
  }
  expect(detected).toBeGreaterThan(0);
  expect(pose.coverage.totalFrames).toBe(pose.frames.length);
  expect(pose.coverage.framesWithPose).toBe(detected);
  expect(pose.coverage.detectionRate).toBe(detected / pose.frames.length);
  await expect(page.getByText('Sampling target:', { exact: false })).toBeVisible();
  await expect(page.getByText('form score', { exact: false })).toHaveCount(0);
  testInfo.annotations.push({ type: 'limitation', description: 'Numeric checks require separate manual confirmation that useful shoulder/elbow/wrist observations belong to the bench lifter.' });
});
