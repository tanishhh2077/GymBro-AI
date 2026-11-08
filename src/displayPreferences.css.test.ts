// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

it('scales the root font size for the Large and Larger text sizes', () => {
  expect(css).toMatch(/html\[data-text-size="large"\]\s*\{\s*font-size:\s*112\.5%/);
  expect(css).toMatch(/html\[data-text-size="larger"\]\s*\{\s*font-size:\s*125%/);
});
it('removes animation and transition time when the system asks for reduced motion', () => {
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  expect(block).toContain('animation-duration: 0.01ms !important');
  expect(block).toContain('transition-duration: 0.01ms !important');
});
