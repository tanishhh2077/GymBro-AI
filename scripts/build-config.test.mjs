// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tsc = fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url));

describe("build configuration type-check", () => {
  it("runs the Node configuration project before the Vite build", () => {
    const { build } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
    const steps = build.split("&&").map((step) => step.trim());
    const check = steps.indexOf("tsc --project tsconfig.node.json");
    expect(check).toBeGreaterThanOrEqual(0);
    expect(check).toBeLessThan(steps.indexOf("vite build"));
  });

  // The config files run in Node when Vite or Vitest starts, so a check that
  // loaded DOM or React globals could pass code that fails at startup.
  it("checks both Vite config files with Node types only", () => {
    const files = execFileSync(process.execPath, [tsc, "--project", "tsconfig.node.json", "--listFilesOnly"], {
      cwd: root, encoding: "utf8",
    }).split(/\r?\n/).map((file) => file.replaceAll("\\", "/"));
    const rootPath = root.replaceAll("\\", "/");
    for (const name of ["vite.config.ts", "vitest.config.ts"]) expect(files).toContain(`${rootPath}${name}`);
    expect(files.some((file) => file.includes("/@types/node/"))).toBe(true);
    expect(files.some((file) => file.includes("/@types/react/"))).toBe(false);
    expect(files.some((file) => file.endsWith("/lib.dom.d.ts"))).toBe(false);
  }, 30_000);
});
