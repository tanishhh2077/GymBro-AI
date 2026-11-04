// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBenchFixture } from './benchFixture';

// Arbitrary bytes exercise setup validation only; these are never decoded or
// represented as a real bench recording, licensed fixture, or inference result.
const bytes = 'fixture-loader-unit-test-bytes';
let directory: string;
let manifestPath: string;
let videoPath: string;
const valid = () => ({
  id: 'unit-test-only', sha256: createHash('sha256').update(bytes).digest('hex'),
  bytes: Buffer.byteLength(bytes), container: 'mp4', codec: 'h264',
  durationSeconds: 5, width: 320, height: 180, orientation: 'landscape',
  source: 'Unit-test placeholder, not accepted footage',
  permission: 'Unit-test bytes authored internally', redistribution: 'external-only',
  referenceTimesSeconds: [1, 2, 3],
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'gymbro-fixture-unit-'));
  manifestPath = join(directory, 'manifest.json');
  videoPath = join(directory, 'video.mp4');
  await writeFile(videoPath, bytes);
  await writeFile(manifestPath, JSON.stringify(valid()));
});
afterEach(async () => {
  // Remove only the flat files created by this test, then its empty temp folder.
  for (const name of await readdir(directory)) await unlink(join(directory, name));
  await rmdir(directory);
});

describe('bench fixture gate', () => {
  it('returns verified setup data without modifying media or the manifest', async () => {
    expect(await loadBenchFixture(manifestPath, videoPath)).toEqual({ manifest: valid(), videoPath });
    expect(await readFile(videoPath, 'utf8')).toBe(bytes);
  });
  it('requires the explicitly supplied external media path', async () => {
    await expect(loadBenchFixture(manifestPath, '')).rejects.toThrow(/GYMBRO_E2E_VIDEO/);
  });
  it('explains a missing manifest', async () => {
    await expect(loadBenchFixture(join(directory, 'missing.json'), videoPath)).rejects.toThrow(/manifest.*README/i);
  });
  it('explains malformed JSON', async () => {
    await writeFile(manifestPath, '{broken');
    await expect(loadBenchFixture(manifestPath, videoPath)).rejects.toThrow(/manifest/i);
  });
  it.each([
    ['permission', ''], ['source', ''], ['sha256', 'wrong'], ['bytes', 0],
    ['durationSeconds', 61], ['width', 1921], ['orientation', 'portrait'],
    ['codec', 'hevc'], ['referenceTimesSeconds', [0, 1, 6]],
    ['referenceTimesSeconds', [1, 1, 2]], ['referenceTimesSeconds', [1, 2]],
  ])('rejects invalid %s (%j)', async (field, value) => {
    await writeFile(manifestPath, JSON.stringify({ ...valid(), [field]: value }));
    await expect(loadBenchFixture(manifestPath, videoPath)).rejects.toThrow(/invalid manifest/i);
  });
  it('rejects altered bytes even if the length is unchanged', async () => {
    await writeFile(videoPath, bytes.toUpperCase());
    await expect(loadBenchFixture(manifestPath, videoPath)).rejects.toThrow(/SHA-256/);
  });
  it('rejects a changed byte length', async () => {
    await writeFile(videoPath, bytes + 'more');
    await expect(loadBenchFixture(manifestPath, videoPath)).rejects.toThrow(/byte size/);
  });
  it('explains unreadable external media', async () => {
    await expect(loadBenchFixture(manifestPath, join(directory, 'missing.mp4'))).rejects.toThrow(/read.*video/i);
  });
});
