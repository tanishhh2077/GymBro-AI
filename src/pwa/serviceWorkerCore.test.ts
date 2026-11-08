// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  cacheNamesFor, handleFetch, precacheShell, removeOldCaches, routeRequest, startServiceWorker,
  type ServiceWorkerConfig, type WorkerRuntime,
} from "./serviceWorkerCore";

const scope = "https://gym.example/";
const config: ServiceWorkerConfig = {
  version: "shell1", runtimeVersion: "rt1",
  precache: ["", "assets/app-abc.js", "assets/app-abc.css", "manifest.webmanifest", "icons/icon-192.png"],
};
const names = cacheNamesFor(config);

class FakeCache {
  entries = new Map<string, Response>();
  failPut = false;
  async match(request: Request | string) {
    return this.entries.get(typeof request === "string" ? request : request.url)?.clone();
  }
  async put(request: Request | string, response: Response) {
    if (this.failPut) throw new Error("QuotaExceededError");
    this.entries.set(typeof request === "string" ? request : request.url, response);
  }
}
class FakeCaches {
  stores = new Map<string, FakeCache>();
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name)!;
  }
  async keys() { return [...this.stores.keys()]; }
  async delete(name: string) { return this.stores.delete(name); }
}

function runtime(overrides: Partial<WorkerRuntime> = {}) {
  const caches = new FakeCaches();
  const fetch = vi.fn<WorkerRuntime["fetch"]>(async (input) => {
    const url = typeof input === "string" ? input : input.url;
    return new Response(`network ${url}`, { status: 200 });
  });
  const value: WorkerRuntime = {
    caches, fetch, scopeUrl: scope, updatePending: () => false,
    setTimeout: (callback, ms) => setTimeout(callback, ms), clearTimeout: (id) => clearTimeout(id),
    ...overrides,
  };
  return { caches, fetch, value };
}
const get = (path: string, init: RequestInit = {}) => new Request(new URL(path, scope), init);
const navigate = (path: string) => {
  const request = get(path);
  // Request constructors reject mode "navigate"; only browsers create such requests.
  Object.defineProperty(request, "mode", { value: "navigate" });
  return request;
};
const offline = async (): Promise<Response> => { throw new TypeError("Failed to fetch"); };
const waitUntil = () => {
  const pending: Promise<unknown>[] = [];
  return { pending, add: (promise: Promise<unknown>) => { pending.push(promise); } };
};

describe("routeRequest", () => {
  const precached = new Set(config.precache);
  it.each([
    ["navigation to the app", navigate("/"), "shell"],
    ["navigation to a deep link", navigate("/history?x=1"), "shell"],
    ["fingerprinted build asset", get("/assets/lazy-123.js"), "precached"],
    ["listed icon", get("/icons/icon-192.png"), "precached"],
    ["pose model", get("/models/pose_landmarker_full.task"), "runtime"],
    ["MediaPipe runtime", get("/wasm/vision_wasm_internal.wasm"), "runtime"],
    ["POST request", get("/assets/app-abc.js", { method: "POST", body: "x" }), "bypass"],
    ["cross-origin request", new Request("https://db.supabase.example/rest/v1/x"), "bypass"],
    ["same-origin path outside the shell", get("/sw.js"), "bypass"],
    ["asset with a query string", get("/assets/app-abc.js?v=2"), "bypass"],
    ["partial range request", get("/models/pose_landmarker_full.task", { headers: { range: "bytes=0-9" } }), "bypass"],
  ])("routes %s", (_label, request, route) => {
    expect(routeRequest(request, scope, precached)).toBe(route);
  });
  it("bypasses paths outside a sub-path scope", () => {
    expect(routeRequest(new Request("https://gym.example/other/assets/a.js"), "https://gym.example/app/", precached))
      .toBe("bypass");
    expect(routeRequest(new Request("https://gym.example/app/assets/a.js"), "https://gym.example/app/", precached))
      .toBe("precached");
  });
});

describe("install and activate", () => {
  it("precaches every listed shell file with revalidation and never the model or runtime", async () => {
    const { caches, fetch, value } = runtime();
    await precacheShell(config, value);
    const stored = [...(await caches.open(names.shell)).entries.keys()];
    expect(stored.sort()).toEqual(config.precache.map((path) => new URL(path, scope).href).sort());
    expect(fetch).toHaveBeenCalledTimes(config.precache.length);
    for (const call of fetch.mock.calls) {
      expect(call[1]?.cache).toBe("no-cache");
      expect(String(call[0])).not.toMatch(/models|wasm/);
    }
  });
  it("fails installation and discards the partial cache when one shell file is missing", async () => {
    const { caches, value } = runtime({
      fetch: async (input) => new Response("x", { status: String(input).endsWith(".css") ? 404 : 200 }),
    });
    await expect(precacheShell(config, value)).rejects.toThrow(/app-abc\.css/);
    expect(await caches.keys()).not.toContain(names.shell);
  });
  it("stores a redirected shell response without its redirect flag", async () => {
    const { caches, value } = runtime({
      fetch: async () => {
        const redirected = new Response("<html>", { status: 200 });
        Object.defineProperty(redirected, "redirected", { value: true });
        return redirected;
      },
    });
    await precacheShell({ ...config, precache: [""] }, value);
    const stored = (await caches.open(names.shell)).entries.get(scope)!;
    expect(stored.redirected).toBe(false);
    expect(await stored.text()).toBe("<html>");
  });
  it("deletes only older GymBro caches on activation", async () => {
    const { caches, value } = runtime();
    for (const name of [names.shell, names.runtime, "gymbro-shell-old", "gymbro-runtime-old", "other-app"]) {
      await caches.open(name);
    }
    await removeOldCaches(config, value);
    expect((await caches.keys()).sort()).toEqual([names.runtime, names.shell, "other-app"].sort());
  });
});

describe("handleFetch", () => {
  it("does not answer bypassed requests", () => {
    const { value } = runtime();
    expect(handleFetch(get("/x", { method: "POST", body: "a" }), config, value, () => {})).toBeNull();
    expect(handleFetch(new Request("https://cdn.example/x.js"), config, value, () => {})).toBeNull();
  });

  it("serves navigation from the network first and keeps the installed shell unchanged", async () => {
    const { caches, value } = runtime();
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(await response.text()).toBe(`network ${scope}`);
    expect(await (await caches.open(names.shell)).entries.get(scope)!.clone().text()).toBe("cached shell");
  });
  it("falls back to the installed shell for any navigation when offline", async () => {
    const { caches, value } = runtime({ fetch: offline });
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/history"), config, value, () => {})!;
    expect(await response.text()).toBe("cached shell");
  });
  it("passes the network error through when offline with no installed shell", async () => {
    const { value } = runtime({ fetch: offline });
    await expect(handleFetch(navigate("/"), config, value, () => {})!).rejects.toThrow(/fetch/);
  });
  it("serves the installed shell when the network hangs past the navigation timeout", async () => {
    vi.useFakeTimers();
    try {
      const { caches, value } = runtime({ fetch: () => new Promise<Response>(() => {}) });
      (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
      const pending = handleFetch(navigate("/"), config, value, () => {})!;
      await vi.advanceTimersByTimeAsync(5_000);
      expect(await (await pending).text()).toBe("cached shell");
    } finally { vi.useRealTimers(); }
  });
  it("keeps waiting for a slow network when no shell is installed", async () => {
    vi.useFakeTimers();
    try {
      let release!: (response: Response) => void;
      const { value } = runtime({ fetch: () => new Promise<Response>((resolve) => { release = resolve; }) });
      const pending = handleFetch(navigate("/"), config, value, () => {})!;
      await vi.advanceTimersByTimeAsync(10_000);
      release(new Response("late network"));
      expect(await (await pending).text()).toBe("late network");
    } finally { vi.useRealTimers(); }
  });

  it("serves cached build assets without the network and caches new successful ones", async () => {
    const { caches, fetch, value } = runtime();
    const asset = new URL("assets/app-abc.js", scope).href;
    (await caches.open(names.shell)).entries.set(asset, new Response("cached js"));
    expect(await (await handleFetch(get(asset), config, value, () => {})!).text()).toBe("cached js");
    expect(fetch).not.toHaveBeenCalled();

    const work = waitUntil();
    const lazy = new URL("assets/lazy-9.js", scope).href;
    expect(await (await handleFetch(get(lazy), config, value, work.add)!).text()).toBe(`network ${lazy}`);
    await Promise.all(work.pending);
    expect((await caches.open(names.shell)).entries.has(lazy)).toBe(true);
  });
  it("does not cache failed asset responses", async () => {
    const { caches, value } = runtime({ fetch: async () => new Response("missing", { status: 404 }) });
    const work = waitUntil();
    const response = await handleFetch(get("/assets/gone.js"), config, value, work.add)!;
    await Promise.all(work.pending);
    expect(response.status).toBe(404);
    expect((await caches.open(names.shell)).entries.size).toBe(0);
  });

  it("caches the model on first successful fetch and serves it offline afterwards", async () => {
    const { caches, value } = runtime();
    const model = get("/models/pose_landmarker_full.task");
    const work = waitUntil();
    await handleFetch(model, config, value, work.add);
    await Promise.all(work.pending);
    expect((await caches.open(names.runtime)).entries.has(model.url)).toBe(true);

    const offlineFetch = vi.fn(offline);
    const again = await handleFetch(get("/models/pose_landmarker_full.task"), config,
      { ...value, fetch: offlineFetch }, () => {})!;
    expect(await again.text()).toBe(`network ${model.url}`);
    expect(offlineFetch).not.toHaveBeenCalled();
  });
  it("still returns the model when storing it fails, for example over quota", async () => {
    const { caches, value } = runtime();
    (await caches.open(names.runtime)).failPut = true;
    const work = waitUntil();
    const response = await handleFetch(get("/wasm/vision_wasm_internal.wasm"), config, value, work.add)!;
    await expect(Promise.all(work.pending)).resolves.toBeDefined();
    expect(response.status).toBe(200);
  });
  it("uses the network first for runtime files while a newer worker is waiting, without caching", async () => {
    const { caches, value } = runtime({ updatePending: () => true });
    const wasm = new URL("wasm/vision_wasm_internal.wasm", scope).href;
    (await caches.open(names.runtime)).entries.set(wasm, new Response("old runtime"));
    const work = waitUntil();
    const response = await handleFetch(get(wasm), config, value, work.add)!;
    await Promise.all(work.pending);
    expect(await response.text()).toBe(`network ${wasm}`);
    expect(await (await caches.open(names.runtime)).entries.get(wasm)!.clone().text()).toBe("old runtime");

    const offlineResponse = await handleFetch(get(wasm), config, { ...value, fetch: offline }, () => {})!;
    expect(await offlineResponse.text()).toBe("old runtime");
  });
});

describe("startServiceWorker", () => {
  it("wires install, activate and fetch events without skipping the waiting phase", async () => {
    const listeners = new Map<string, (event: never) => void>();
    const { caches, fetch } = runtime();
    const claim = vi.fn(async () => {});
    const skipWaiting = vi.fn(async () => {});
    startServiceWorker({
      registration: { scope, installing: null, waiting: null },
      caches, fetch, clients: { claim }, skipWaiting,
      addEventListener: (type: string, listener: (event: never) => void) => { listeners.set(type, listener); },
      setTimeout, clearTimeout,
    }, config);
    expect([...listeners.keys()].sort()).toEqual(["activate", "fetch", "install"]);
    const fire = (type: string, event: unknown) => listeners.get(type)!(event as never);

    const installWork: Promise<unknown>[] = [];
    fire("install", { waitUntil: (promise: Promise<unknown>) => installWork.push(promise) });
    await Promise.all(installWork);
    expect((await caches.open(names.shell)).entries.size).toBe(config.precache.length);

    const activateWork: Promise<unknown>[] = [];
    fire("activate", { waitUntil: (promise: Promise<unknown>) => activateWork.push(promise) });
    await Promise.all(activateWork);
    expect(claim).toHaveBeenCalledOnce();

    const respondWith = vi.fn();
    fire("fetch", { request: get("/x", { method: "POST", body: "a" }), respondWith, waitUntil: () => {} });
    expect(respondWith).not.toHaveBeenCalled();
    fire("fetch", { request: get("/assets/app-abc.js"), respondWith, waitUntil: () => {} });
    expect(respondWith).toHaveBeenCalledOnce();
    expect(skipWaiting).not.toHaveBeenCalled();
  });
});
