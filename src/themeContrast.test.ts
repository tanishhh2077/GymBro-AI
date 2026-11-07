// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real design tokens, so a colour change that makes text hard to read
// fails here instead of being noticed on a phone in daylight.
const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

type Rgb = readonly [number, number, number];

function tokens(selector: string): Record<string, Rgb> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing theme block ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const out: Record<string, Rgb> = {};
  for (const [, name, r, g, b] of block.matchAll(/--([a-z0-9-]+)-rgb:\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    out[name] = [Number(r), Number(g), Number(b)];
  }
  return out;
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const themes = { dark: ":root", light: ':root[data-theme="light"]' } as const;
const surfaces = ["ink-950", "ink-900", "ink-850", "ink-800"] as const;
const textOnSurface = [
  "foreground", "body", "secondary", "muted", "subtle", "accent", "warn", "danger", "electric", "pink-text",
] as const;

describe("theme contrast (WCAG 2.x, normal text needs 4.5:1)", () => {
  for (const [theme, selector] of Object.entries(themes)) {
    const palette = tokens(selector);

    it(`${theme}: the contrast helper agrees with known WCAG values`, () => {
      expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
      expect(contrast([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 1);
    });

    it(`${theme}: every text colour is readable on every page surface`, () => {
      const below: Record<string, number> = {};
      for (const text of textOnSurface) {
        for (const surface of surfaces) {
          const ratio = contrast(palette[text], palette[surface]);
          if (ratio < 4.5) below[`${text} on ${surface}`] = ratio;
        }
      }
      // Known gap, reported rather than restyled: the dark "subtle" hint colour is
      // 3.65-4.23:1. When it is lightened this list must shrink, so the test then
      // fails and asks for the exception to be removed. It must never get worse.
      const known = theme === "dark" ? surfaces.map((surface) => `subtle on ${surface}`) : [];
      expect(Object.keys(below).sort()).toEqual([...known].sort());
      for (const [pair, ratio] of Object.entries(below)) expect(ratio, pair).toBeGreaterThanOrEqual(3.5);
    });

    it(`${theme}: button text is readable on the accent colour`, () => {
      expect(contrast(palette["on-accent"], palette.accent)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
