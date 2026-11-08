// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { buildServiceWorkerSource, selectPrecache, shellVersion } from "../../vite.serviceWorker";

describe("service worker build", () => {
  it("gives a new shell cache version when only the worker's own code changes", () => {
    const files = new Map<string, string>([["index.html", "<html>"], ["assets/a.js", "a"]]);
    expect(shellVersion(files, "worker code v1")).toBe(shellVersion(new Map(files), "worker code v1"));
    expect(shellVersion(files, "worker code v2")).not.toBe(shellVersion(files, "worker code v1"));
    expect(shellVersion(new Map([...files, ["assets/a.js", "b"]]), "worker code v1"))
      .not.toBe(shellVersion(files, "worker code v1"));
  });

  it("precaches the start page, build assets and shell files but not the worker, maps or vendor runtime", () => {
    expect(selectPrecache([
      "index.html", "assets/index-a1.js", "assets/index-a1.js.map", "assets/index-b2.css",
      "manifest.webmanifest", "icons/icon-192.png", "sw.js",
      "models/pose_landmarker_full.task", "wasm/vision_wasm_internal.wasm",
    ])).toEqual(["", "assets/index-a1.js", "assets/index-b2.css", "icons/icon-192.png", "manifest.webmanifest"]);
  });

  it("produces deterministic shell versions regardless of map key insertion order", () => {
    const map1 = new Map<string, string>([["a.js", "1"], ["b.css", "2"], ["index.html", "3"]]);
    const map2 = new Map<string, string>([["index.html", "3"], ["b.css", "2"], ["a.js", "1"]]);
    expect(shellVersion(map1, "code")).toBe(shellVersion(map2, "code"));

    const binaryMap1 = new Map<string, Uint8Array>([["a.bin", new Uint8Array([1, 2, 3])]]);
    const binaryMap2 = new Map<string, Uint8Array>([["a.bin", new Uint8Array([1, 2, 4])]]);
    expect(shellVersion(binaryMap1, "code")).not.toBe(shellVersion(binaryMap2, "code"));
  });

  it("handles edge cases in precache selection including deep nesting, maps, and alternative html", () => {
    expect(selectPrecache([])).toEqual([]);
    expect(selectPrecache([
      "404.html",
      "index.html",
      "assets/sub/deep/chunk.js",
      "assets/sub/deep/chunk.js.map",
      "assets/sw.js",
      "sw-register.js",
      "sw.js",
      "models/sub/weights.bin",
      "wasm/sub/runtime.wasm",
    ])).toEqual(["", "404.html", "assets/sub/deep/chunk.js", "assets/sw.js", "sw-register.js"]);
  });

  it("emits a classic script that starts the worker with the embedded configuration", async () => {
    const config = { version: "v1", runtimeVersion: "r1", precache: ["", "assets/a.js"] };
    const source = await buildServiceWorkerSource(config);
    expect(source).not.toMatch(/^\s*(?:import|export)\b/m);
    const embedded = source.match(/^const GYMBRO_SW_CONFIG = (.*);$/m);
    expect(JSON.parse(embedded![1])).toEqual(config);

    const listeners: string[] = [];
    const self = {
      registration: { scope: "https://gym.example/", installing: null, waiting: null },
      caches: {}, fetch: vi.fn(), clients: { claim: vi.fn() }, skipWaiting: vi.fn(),
      addEventListener: (type: string) => { listeners.push(type); },
      setTimeout, clearTimeout,
    };
    runInNewContext(source, { self, URL, Response });
    expect(listeners.sort()).toEqual(["activate", "fetch", "install"]);
  });
});
