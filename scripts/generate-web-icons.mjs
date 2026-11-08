// Draws resources/logo.svg into the web app's PNG icons without an image
// library. It supports only what that file uses: one background rect and one
// group of round-capped straight path strokes (M/L/H/V, absolute or relative).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { crc32, deflateSync, inflateSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
export const WEB_ICONS = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
];
const SAMPLES = 4;

function attribute(tag, name) {
  const value = tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  if (value === undefined) throw new Error(`logo.svg: missing ${name} on ${tag.slice(0, 40)}.`);
  return value;
}
function color(hex) {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) throw new Error(`logo.svg: unsupported colour ${hex}.`);
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
}

export function parseLogo(svg) {
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0] ?? "";
  const [minX, minY, width, height] = attribute(svgTag, "viewBox").split(/\s+/).map(Number);
  if (minX !== 0 || minY !== 0 || width !== height) throw new Error("logo.svg: viewBox must be a square at 0 0.");
  const rect = svg.match(/<rect\b[^>]*>/)?.[0];
  const group = svg.match(/<g\b[^>]*>/)?.[0];
  const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map((match) => attribute(match[0], "d"));
  if (!rect || !group || !paths.length) throw new Error("logo.svg: expected a rect and a group of paths.");
  if (attribute(group, "stroke-linecap") !== "round") throw new Error("logo.svg: only round caps are supported.");
  const transform = attribute(group, "transform").match(/^translate\(([-\d.]+)[ ,]+([-\d.]+)\) scale\(([-\d.]+)\)$/);
  if (!transform) throw new Error("logo.svg: only translate(x y) scale(s) transforms are supported.");
  const [tx, ty, scale] = transform.slice(1).map(Number);

  const segments = [];
  for (const d of paths) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];
    let x = 0; let y = 0; let command = "";
    for (let i = 0; i < tokens.length;) {
      if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
      const take = () => {
        const value = Number(tokens[i++]);
        if (!Number.isFinite(value)) throw new Error(`logo.svg: malformed path ${d}.`);
        return value;
      };
      const start = [x, y];
      switch (command) {
        case "M": x = take(); y = take(); command = "L"; continue;
        case "m": x += take(); y += take(); command = "l"; continue;
        case "L": x = take(); y = take(); break;
        case "l": x += take(); y += take(); break;
        case "H": x = take(); break;
        case "h": x += take(); break;
        case "V": y = take(); break;
        case "v": y += take(); break;
        default: throw new Error(`logo.svg: unsupported path command ${command || tokens[i]}.`);
      }
      segments.push([tx + start[0] * scale, ty + start[1] * scale, tx + x * scale, ty + y * scale]);
    }
  }
  return {
    size: width,
    background: color(attribute(rect, "fill")),
    stroke: color(attribute(group, "stroke")),
    radius: (Number(attribute(group, "stroke-width")) * scale) / 2,
    segments,
  };
}

function distanceToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1; const dy = y2 - y1;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Returns RGB bytes, row by row, with 4x4 supersampled edges. */
export function renderLogo(logo, size) {
  const pixels = Buffer.alloc(size * size * 3);
  const unit = logo.size / size;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      let covered = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = (column + (sx + 0.5) / SAMPLES) * unit;
          const py = (row + (sy + 0.5) / SAMPLES) * unit;
          if (logo.segments.some((segment) => distanceToSegment(px, py, segment) <= logo.radius)) covered++;
        }
      }
      const share = covered / (SAMPLES * SAMPLES);
      for (let channel = 0; channel < 3; channel++) {
        pixels[(row * size + column) * 3 + channel] =
          Math.round(logo.background[channel] * (1 - share) + logo.stroke[channel] * share);
      }
    }
  }
  return pixels;
}

function chunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng(size, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2; // 8-bit truecolour, no alpha: icons are opaque
  const rows = [];
  for (let row = 0; row < size; row++) {
    rows.push(Buffer.from([0]), rgb.subarray(row * size * 3, (row + 1) * size * 3));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Reads back only PNGs written by encodePng (RGB, filter 0). */
export function decodeOwnPng(png) {
  const width = png.readUInt32BE(16); const height = png.readUInt32BE(20);
  const data = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") data.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const rgb = Buffer.alloc(width * height * 3);
  for (let row = 0; row < height; row++) {
    const start = row * (width * 3 + 1);
    if (raw[start] !== 0) throw new Error("Unsupported PNG filter.");
    raw.copy(rgb, row * width * 3, start + 1, start + 1 + width * 3);
  }
  return { width, height, rgb };
}

export function generateWebIcons(rootDir = root) {
  const logo = parseLogo(readFileSync(resolve(rootDir, "resources/logo.svg"), "utf8"));
  for (const icon of WEB_ICONS) {
    const target = resolve(rootDir, icon.file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, encodePng(icon.size, renderLogo(logo, icon.size)));
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  generateWebIcons();
  console.log(`Wrote ${WEB_ICONS.map((icon) => icon.file).join(", ")}.`);
}
