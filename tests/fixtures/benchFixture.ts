import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { M1_LIMITS } from '../../src/core/processingLimits';

export interface BenchFixture {
  id: string;
  sha256: string;
  bytes: number;
  container: 'mp4';
  codec: 'h264';
  durationSeconds: number;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait' | 'square';
  source: string;
  permission: string;
  redistribution: 'external-only' | 'permitted';
  referenceTimesSeconds: [number, number, number];
}

const setupError = (reason: string) => new Error(`Bench fixture setup: ${reason}. See tests/fixtures/README.md.`);
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function isManifest(value: unknown): value is BenchFixture {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  if (!text(m.id) || !text(m.source) || !text(m.permission) ||
      !text(m.sha256) || !/^[a-f0-9]{64}$/.test(m.sha256) ||
      !positive(m.bytes) || !Number.isInteger(m.bytes) || m.bytes > M1_LIMITS.maxFileBytes ||
      m.container !== 'mp4' || m.codec !== 'h264' ||
      !positive(m.durationSeconds) || m.durationSeconds > M1_LIMITS.maxDurationSeconds ||
      !positive(m.width) || !Number.isInteger(m.width) ||
      !positive(m.height) || !Number.isInteger(m.height) ||
      Math.max(m.width, m.height) > M1_LIMITS.maxLongEdge || m.width * m.height > M1_LIMITS.maxPixels ||
      (m.redistribution !== 'external-only' && m.redistribution !== 'permitted')) return false;
  const orientation = m.width === m.height ? 'square' : m.width > m.height ? 'landscape' : 'portrait';
  if (m.orientation !== orientation) return false;
  const times = m.referenceTimesSeconds;
  const duration = m.durationSeconds;
  return Array.isArray(times) && times.length === 3 && new Set(times).size === 3 &&
    times.every((time) => typeof time === 'number' && Number.isFinite(time) && time >= 0 && time < duration);
}

/** Validates provenance fields and identity, not whether a person granted rights
 * or whether the file decodes. Human source review and browser checks still apply. */
export async function loadBenchFixture(
  manifestPath = fileURLToPath(new URL('./manifest.json', import.meta.url)),
  videoPath = process.env.GYMBRO_E2E_VIDEO,
): Promise<{ manifest: BenchFixture; videoPath: string }> {
  if (!videoPath?.trim()) throw setupError('set GYMBRO_E2E_VIDEO to a permitted external bench recording');
  let manifest: unknown;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch { throw setupError('missing or unreadable JSON manifest'); }
  if (!isManifest(manifest)) throw setupError('invalid manifest metadata, permission, or reference times');
  let mediaStat;
  try { mediaStat = await stat(videoPath); }
  catch { throw setupError('cannot read the video'); }
  if (!mediaStat.isFile()) throw setupError('cannot read the video as a regular file');
  if (mediaStat.size !== manifest.bytes) throw setupError('video byte size does not match the manifest');
  let media;
  try { media = await readFile(videoPath); }
  catch { throw setupError('cannot read the video'); }
  if (createHash('sha256').update(media).digest('hex') !== manifest.sha256) {
    throw setupError('video SHA-256 does not match the manifest');
  }
  return { manifest, videoPath };
}
