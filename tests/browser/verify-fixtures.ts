import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independently recorded provenance/lengths are in tests/fixtures/README.md.
const patterns = [
  ['no-person.mp4', 4890, '1c2088bb6706fd6e4594d3951f8187a2c7cedacedf321628fce539193773b802'],
  ['no-person-portrait.mp4', 3216, '8d94beb8ecdf3cff4cb2375cd9487be645e83c5ecd871f2f2ded5d965355a3c6'],
  ['over-duration.mp4', 52626, 'd1ecf3e02ecb7eb5a2e17bdb4a604b0e478523dd477b73796f2b5cdd414c87ab'],
  ['over-long-edge.mp4', 2391, 'e09146f6d59f10eb4065e6c270b40f9a81ce5c4d92215953bff47cba6fbe9c00'],
  ['over-pixels.mp4', 2374, 'da10e4153dbc57d0bcb49607fa0b99c5c3b7b79586959ad4211f430e6a3adc7c'],
] as const;

export function verifyFixtures(directory = fileURLToPath(new URL('../fixtures', import.meta.url))): void {
  for (const [name, bytes, sha256] of patterns) {
    try {
      const path = join(directory, name);
      const info = lstatSync(path);
      if (!info.isFile() || info.size !== bytes) throw new Error('Invalid file');
      if (createHash('sha256').update(readFileSync(path)).digest('hex') !== sha256) {
        throw new Error('Invalid checksum');
      }
    } catch {
      throw new Error(`Synthetic fixture preflight failed: ${name}. Restore the documented project pattern; see tests/fixtures/README.md.`);
    }
  }
}

export default function setup(): void { verifyFixtures(); }
