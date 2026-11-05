// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFixtures } from './verify-fixtures';

const source = fileURLToPath(new URL('../fixtures', import.meta.url));
let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'gymbro-patterns-'));
  cpSync(source, directory, { recursive: true });
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('fixed non-human fixture preflight', () => {
  it('accepts all five unchanged project patterns', () => {
    expect(() => verifyFixtures(directory)).not.toThrow();
  });
  it('resolves default inputs relative to the module, not the process directory', () => {
    expect(() => verifyFixtures()).not.toThrow();
  });
  it('rejects a missing required pattern', () => {
    unlinkSync(join(directory, 'no-person.mp4'));
    expect(() => verifyFixtures(directory)).toThrow(/no-person\.mp4/);
  });
  it('rejects replaced bytes even when the length matches', () => {
    const path = join(directory, 'no-person.mp4');
    const bytes = readFileSync(path);
    bytes[bytes.length - 1] ^= 1;
    writeFileSync(path, bytes);
    expect(() => verifyFixtures(directory)).toThrow(/no-person\.mp4/);
  });
  it('rejects an altered length before accepting a pattern', () => {
    // Deliberately invalid test bytes, not a video fixture.
    writeFileSync(join(directory, 'no-person.mp4'), 'not a movie');
    expect(() => verifyFixtures(directory)).toThrow(/no-person\.mp4/);
  });
  it('rejects a directory in place of a regular file', () => {
    const path = join(directory, 'no-person.mp4');
    unlinkSync(path);
    mkdirSync(path);
    expect(() => verifyFixtures(directory)).toThrow(/no-person\.mp4/);
  });
});
