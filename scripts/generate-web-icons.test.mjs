// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WEB_ICONS, decodeOwnPng, encodePng, parseLogo, renderLogo } from "./generate-web-icons.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const logo = parseLogo(readFileSync(`${root}resources/logo.svg`, "utf8"));
const pixel = (rgb, size, x, y) => [...rgb.subarray((y * size + x) * 3, (y * size + x) * 3 + 3)];

describe("web icon generation", () => {
  it("reads the dumbbell strokes and colours from the shared logo", () => {
    expect(logo.background).toEqual([0x05, 0x07, 0x0d]);
    expect(logo.stroke).toEqual([0x4a, 0xde, 0x80]);
    expect(logo.segments).toHaveLength(5);
  });
  it("draws the mark in the middle and the dark background at the edges", () => {
    const rgb = renderLogo(logo, 64);
    expect(pixel(rgb, 64, 0, 0)).toEqual(logo.background);
    expect(pixel(rgb, 64, 32, 32)).toEqual(logo.stroke); // centre of the bar
  });
  it("rejects shapes it cannot draw instead of silently dropping them", () => {
    expect(() => parseLogo(readFileSync(`${root}resources/logo.svg`, "utf8").replace('d="M4', 'd="C4')))
      .toThrow(/unsupported path command/);
  });
  it("round-trips its own PNG encoding", () => {
    const rgb = renderLogo(logo, 16);
    expect(decodeOwnPng(encodePng(16, rgb))).toEqual({ width: 16, height: 16, rgb });
  });
  it.each(WEB_ICONS)("keeps the committed $file regenerated from the current logo", ({ file, size }) => {
    const png = readFileSync(`${root}${file}`);
    expect(statSync(`${root}${file}`).size).toBeLessThan(16 * 1024);
    expect(decodeOwnPng(png)).toEqual({ width: size, height: size, rgb: renderLogo(logo, size) });
  }, 30_000);
});
