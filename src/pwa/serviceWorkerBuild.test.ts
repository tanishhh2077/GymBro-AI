// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { buildServiceWorkerSource, selectPrecache } from "../../vite.serviceWorker";

describe("service worker build", () => {
  it("precaches the start page, build assets and shell files but not the worker, maps or vendor runtime", () => {
    expect(selectPrecache([
      "index.html", "assets/index-a1.js", "assets/index-a1.js.map", "assets/index-b2.css",
      "manifest.webmanifest", "icons/icon-192.png", "sw.js",
      "models/pose_landmarker_full.task", "wasm/vision_wasm_internal.wasm",
    ])).toEqual(["", "assets/index-a1.js", "assets/index-b2.css", "icons/icon-192.png", "manifest.webmanifest"]);
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
