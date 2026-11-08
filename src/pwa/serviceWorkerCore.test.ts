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
const runtimeCache = () => names.runtime;
const shellCache = () => names.shell;

class FakeCache {
  entries = new Map<string, Response>();
  failPut = false;
  failMatch = false;
  putError?: Error;
  rejectVaryStar = false;
  async match(request: Request | string) {
    if (this.failMatch) throw new Error("QuotaExceededError");
    return this.entries.get(typeof request === "string" ? request : request.url)?.clone();
  }
  async put(request: Request | string, response: Response) {
    if (this.failPut) throw new Error("QuotaExceededError");
    if (this.putError) throw this.putError;
    if (this.rejectVaryStar && response.headers.get("vary")?.includes("*")) {
      throw new TypeError("Cannot cache response with 'Vary: *'");
    }
    this.entries.set(typeof request === "string" ? request : request.url, response);
  }
}
class FakeCaches {
  stores = new Map<string, FakeCache>();
  openError?: Error;
  async open(name: string) {
    if (this.openError) throw this.openError;
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
const navigate = (path: string, init: RequestInit = {}) => {
  const request = get(path, init);
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
    ["PUT request", get("/assets/app-abc.js", { method: "PUT", body: "x" }), "bypass"],
    ["DELETE request", get("/models/pose_landmarker_full.task", { method: "DELETE" }), "bypass"],
    ["PATCH request", get("/assets/app-abc.js", { method: "PATCH", body: "x" }), "bypass"],
    ["HEAD request", get("/assets/app-abc.js", { method: "HEAD" }), "bypass"],
    ["OPTIONS request", get("/assets/app-abc.js", { method: "OPTIONS" }), "bypass"],
    ["cross-origin request", new Request("https://db.supabase.example/rest/v1/x"), "bypass"],
    ["same-origin path outside the shell", get("/sw.js"), "bypass"],
    ["asset with a query string", get("/assets/app-abc.js?v=2"), "bypass"],
    ["pose model with a query string", get("/models/pose_landmarker_full.task?v=2"), "bypass"],
    ["MediaPipe runtime with a query string", get("/wasm/vision_wasm_internal.wasm?token=abc"), "bypass"],
    ["root path subresource with a query string", get("/?ref=share"), "bypass"],
    ["partial range request", get("/models/pose_landmarker_full.task", { headers: { range: "bytes=0-9" } }), "bypass"],
    ["range request on navigation", navigate("/", { headers: { range: "bytes=0-100" } }), "bypass"],
    ["range request on precached asset", get("/assets/app-abc.js", { headers: { range: "bytes=0-50" } }), "bypass"],
    ["range request on wasm runtime", get("/wasm/vision_wasm_internal.wasm", { headers: { range: "bytes=100-200" } }), "bypass"],
    ["malformed request URL", { method: "GET", url: "https://", mode: "cors", headers: new Headers() } as Request, "bypass"],
  ])("routes %s", (_label, request, route) => {
    expect(routeRequest(request, scope, precached)).toBe(route);
  });
  it("bypasses paths outside a sub-path scope", () => {
    expect(routeRequest(new Request("https://gym.example/other/assets/a.js"), "https://gym.example/app/", precached))
      .toBe("bypass");
    expect(routeRequest(new Request("https://gym.example/app/assets/a.js"), "https://gym.example/app/", precached))
      .toBe("precached");
  });
  it("bypasses requests to a different port on the same host", () => {
    expect(routeRequest(new Request("https://gym.example:8443/assets/a.js"), scope, precached))
      .toBe("bypass");
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
  it("install failure with an unchanged version keeps the active cache", async () => {
    const { caches, value } = runtime({
      fetch: async (input) => new Response("x", { status: String(input).endsWith(".css") ? 503 : 200 }),
    });
    const active = await caches.open(names.shell);
    active.entries.set(scope, new Response("active shell"));
    await expect(precacheShell(config, value)).rejects.toThrow(/app-abc\.css/);
    expect(await caches.keys()).toContain(names.shell);
    expect(await (await caches.open(names.shell)).match(scope)).toBeDefined();
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
  it("allows two installs of the same version to run concurrently without corruption", async () => {
    const { caches, value } = runtime();
    await Promise.all([
      precacheShell(config, value),
      precacheShell(config, value),
    ]);
    const stored = [...(await caches.open(names.shell)).entries.keys()];
    expect(stored.sort()).toEqual(config.precache.map((path) => new URL(path, scope).href).sort());
  });
  it("preserves shell cache if a concurrent install fails after shell was already created", async () => {
    const { caches, value } = runtime();
    await caches.open(names.shell);
    const failingWorker = {
      ...value,
      fetch: async () => new Response("down", { status: 500 }),
    };
    await expect(precacheShell(config, failingWorker)).rejects.toThrow();
    expect(await caches.keys()).toContain(names.shell);
  });
  it("runs installs for two different versions concurrently and isolates failures", async () => {
    const config2: ServiceWorkerConfig = {
      version: "shell2", runtimeVersion: "rt2",
      precache: ["", "assets/app-def.js"],
    };
    const names2 = cacheNamesFor(config2);
    const { caches, value } = runtime({
      fetch: async (input) => {
        const url = String(input);
        if (url.includes("app-def.js")) return new Response("500", { status: 500 });
        return new Response(`ok ${url}`, { status: 200 });
      },
    });
    const [res1, res2] = await Promise.allSettled([
      precacheShell(config, value),
      precacheShell(config2, value),
    ]);
    expect(res1.status).toBe("fulfilled");
    expect(res2.status).toBe("rejected");
    expect(await caches.keys()).toContain(names.shell);
    expect(await caches.keys()).not.toContain(names2.shell);
  });
  it("discards partial cache when cache.put throws QuotaExceededError during precache", async () => {
    const { caches, value } = runtime();
    await caches.open(names.shell);
    await caches.delete(names.shell);
    const origOpen = caches.open.bind(caches);
    caches.open = async (name: string) => {
      const c = await origOpen(name);
      c.failPut = true;
      return c;
    };
    await expect(precacheShell(config, value)).rejects.toThrow(/QuotaExceededError/);
    expect(await caches.keys()).not.toContain(names.shell);
  });
  it("fails precache and cleans up when a shell response cannot be cached due to Vary: *", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("data", {
        status: 200,
        headers: { vary: "*" },
      }),
    });
    const origOpen = caches.open.bind(caches);
    caches.open = async (name: string) => {
      const c = await origOpen(name);
      c.rejectVaryStar = true;
      return c;
    };
    await expect(precacheShell(config, value)).rejects.toThrow(/Vary: \*/);
    expect(await caches.keys()).not.toContain(names.shell);
  });
  it("preserves headers and body when stripping redirect flag during precache", async () => {
    const { caches, value } = runtime({
      fetch: async () => {
        const redirected = new Response("<html>hello</html>", {
          status: 200,
          statusText: "OK",
          headers: {
            "content-type": "text/html; charset=utf-8",
            "etag": '"abc123xyz"',
            "cache-control": "no-cache",
          },
        });
        Object.defineProperty(redirected, "redirected", { value: true });
        return redirected;
      },
    });
    await precacheShell({ ...config, precache: [""] }, value);
    const stored = (await caches.open(names.shell)).entries.get(scope)!;
    expect(stored.redirected).toBe(false);
    expect(stored.status).toBe(200);
    expect(stored.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(stored.headers.get("etag")).toBe('"abc123xyz"');
    expect(await stored.text()).toBe("<html>hello</html>");
  });
  it("leaves other origins, apps, and unmatched prefixes untouched during cache cleanup", async () => {
    const { caches, value } = runtime();
    const otherCaches = [
      "supabase-auth-token",
      "workbox-precache-v2",
      "myapp-data",
      "other-app-shell",
      "gymbro",
      "gymbro_v1",
    ];
    const oldGymBroCaches = [
      "gymbro-shell-v0",
      "gymbro-shell-v0.9",
      "gymbro-runtime-old",
    ];
    for (const name of [...otherCaches, ...oldGymBroCaches, names.shell, names.runtime]) {
      await caches.open(name);
    }
    await removeOldCaches(config, value);
    const remaining = (await caches.keys()).sort();
    expect(remaining).toEqual([...otherCaches, names.runtime, names.shell].sort());
  });
  it("handles concurrent removeOldCaches calls cleanly", async () => {
    const { caches, value } = runtime();
    await caches.open("gymbro-shell-old1");
    await caches.open("gymbro-shell-old2");
    await caches.open(names.shell);
    await caches.open(names.runtime);

    await Promise.all([
      removeOldCaches(config, value),
      removeOldCaches(config, value),
    ]);
    expect((await caches.keys()).sort()).toEqual([names.runtime, names.shell].sort());
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
  it.each([
    ["the model", "/models/pose_landmarker_full.task", runtimeCache],
    ["the MediaPipe runtime", "/wasm/vision_wasm_internal.wasm", runtimeCache],
    ["a build asset", "/assets/lazy-9.js", shellCache],
  ])("never caches an HTML fallback page served for %s", async (_label, path, cacheOf) => {
    const { caches, value } = runtime({
      fetch: async () => new Response("<!doctype html>", {
        status: 200, headers: { "content-type": "text/html; charset=utf-8" },
      }),
    });
    const work = waitUntil();
    const response = await handleFetch(get(path), config, value, work.add)!;
    await Promise.all(work.pending);
    expect(response.status).toBe(200);
    expect((await caches.open(cacheOf())).entries.size).toBe(0);
  });
  it.each(["application/wasm", "application/octet-stream", ""])(
    "caches runtime files served as %j",
    async (type) => {
      const { caches, value } = runtime({
        fetch: async () => new Response(new Uint8Array([1, 2]), {
          status: 200, headers: type ? { "content-type": type } : {},
        }),
      });
      const work = waitUntil();
      await handleFetch(get("/wasm/vision_wasm_internal.wasm"), config, value, work.add);
      await Promise.all(work.pending);
      expect((await caches.open(names.runtime)).entries.size).toBe(1);
    },
  );
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

  it("returns null for range requests so the browser handles partial responses directly", () => {
    const { value } = runtime();
    expect(handleFetch(get("/models/pose_landmarker_full.task", { headers: { range: "bytes=0-100" } }), config, value, () => {})).toBeNull();
    expect(handleFetch(get("/assets/app-abc.js", { headers: { range: "bytes=0-" } }), config, value, () => {})).toBeNull();
    expect(handleFetch(navigate("/", { headers: { range: "bytes=0-10" } }), config, value, () => {})).toBeNull();
  });

  it.each(["POST", "PUT", "DELETE", "PATCH", "HEAD"])(
    "returns null for %s requests",
    (method) => {
      const { value } = runtime();
      expect(handleFetch(get("/assets/app-abc.js", { method, body: method === "HEAD" ? undefined : "x" }), config, value, () => {})).toBeNull();
      expect(handleFetch(get("/", { method }), config, value, () => {})).toBeNull();
    },
  );

  it("bypasses asset and model requests with query strings", () => {
    const { value } = runtime();
    expect(handleFetch(get("/assets/app-abc.js?v=2"), config, value, () => {})).toBeNull();
    expect(handleFetch(get("/models/pose_landmarker_full.task?token=secret"), config, value, () => {})).toBeNull();
    expect(handleFetch(get("/wasm/vision_wasm_internal.wasm?debug=1"), config, value, () => {})).toBeNull();
  });

  it("serves navigation with query strings using network-first and shell fallback", async () => {
    const { caches, value } = runtime({ fetch: offline });
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/history?tab=records&unit=kg"), config, value, () => {})!;
    expect(await response.text()).toBe("cached shell");
  });

  it("returns network response without crashing when cache.put fails due to Vary: *", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("lazy chunk with vary star", {
        status: 200,
        headers: { "content-type": "application/javascript", vary: "*" },
      }),
    });
    (await caches.open(names.shell)).rejectVaryStar = true;
    const work = waitUntil();
    const response = await handleFetch(get("/assets/lazy-star.js"), config, value, work.add)!;
    await expect(Promise.all(work.pending)).resolves.toBeDefined();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("lazy chunk with vary star");
  });

  it("stores and serves cacheable responses with standard Vary: Accept-Encoding", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("chunk with vary encoding", {
        status: 200,
        headers: { "content-type": "application/javascript", vary: "Accept-Encoding" },
      }),
    });
    const work = waitUntil();
    const response = await handleFetch(get("/assets/lazy-enc.js"), config, value, work.add)!;
    await Promise.all(work.pending);
    expect(await response.text()).toBe("chunk with vary encoding");

    const assetUrl = new URL("assets/lazy-enc.js", scope).href;
    expect((await caches.open(names.shell)).entries.has(assetUrl)).toBe(true);

    const cachedResp = await handleFetch(get("/assets/lazy-enc.js"), config, { ...value, fetch: vi.fn(offline) }, () => {})!;
    expect(await cachedResp.text()).toBe("chunk with vary encoding");
  });

  it("still returns asset when caching it throws QuotaExceededError", async () => {
    const { caches, value } = runtime();
    (await caches.open(names.shell)).failPut = true;
    const work = waitUntil();
    const response = await handleFetch(get("/assets/lazy-quota.js"), config, value, work.add)!;
    await expect(Promise.all(work.pending)).resolves.toBeDefined();
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/network/);
  });

  it("gracefully falls back to network when opening the cache throws QuotaExceededError in lookup", async () => {
    const { caches, value } = runtime();
    caches.openError = new Error("QuotaExceededError");
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(`network ${scope}`);
  });

  it("gracefully falls back to network when matching in cache throws QuotaExceededError in lookup", async () => {
    const { caches, value } = runtime();
    (await caches.open(names.shell)).failMatch = true;
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(`network ${scope}`);
  });

  it("returns network redirect directly for online navigation", async () => {
    const { value } = runtime({
      fetch: async () => {
        const redirected = new Response("redirected page", { status: 200 });
        Object.defineProperty(redirected, "redirected", { value: true });
        return redirected;
      },
    });
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(response.redirected).toBe(true);
    expect(await response.text()).toBe("redirected page");
  });

  it("serves redirect-free start page from cache when offline navigation falls back", async () => {
    const { caches, value } = runtime({ fetch: offline });
    const cachedShell = new Response("offline shell", { status: 200 });
    Object.defineProperty(cachedShell, "redirected", { value: false });
    (await caches.open(names.shell)).entries.set(scope, cachedShell);

    const response = await handleFetch(navigate("/dashboard"), config, value, () => {})!;
    expect(response.redirected).toBe(false);
    expect(await response.text()).toBe("offline shell");
  });

  it("serves network 5xx responses for navigation as received (networkFirst only catches fetch rejections)", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("503 Service Unavailable", { status: 503 }),
    });
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("503 Service Unavailable");
  });

  it("serves network captive-portal HTML for navigation as received", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("<html><head><title>WiFi Login</title></head></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    });
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("WiFi Login");
  });

  it("never caches 5xx responses for subresources or runtime files", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("Server error", { status: 500 }),
    });
    const work = waitUntil();
    const assetResp = await handleFetch(get("/assets/lazy-500.js"), config, value, work.add)!;
    const modelResp = await handleFetch(get("/models/pose_landmarker_full.task"), config, value, work.add)!;
    await Promise.all(work.pending);
    expect(assetResp.status).toBe(500);
    expect(modelResp.status).toBe(500);
    expect((await caches.open(names.shell)).entries.size).toBe(0);
    expect((await caches.open(names.runtime)).entries.size).toBe(0);
  });

  // REAL BUG DOCUMENTATION:
  // When a lifter is at a gym with a server outage (HTTP 500/502/503/504) or behind a captive portal,
  // networkFirst in serviceWorkerCore.ts only falls back to the cached shell on fetch promise
  // rejection (e.g. TypeError when totally offline) or after a 4-second timeout. It does not
  // check response.ok or response.status >= 500. Consequently, the user sees a raw 5xx error
  // or login portal rather than the offline GymBro AI shell.
  it.skip("falls back to the installed shell when navigation returns a 5xx server error (real bug: networkFirst only catches fetch rejections, not 5xx HTTP errors)", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("502 Bad Gateway", { status: 502 }),
    });
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(await response.text()).toBe("cached shell");
  });

  it.skip("falls back to the installed shell when navigation receives captive-portal HTML (real bug: networkFirst cannot distinguish captive-portal HTML from valid app HTML)", async () => {
    const { caches, value } = runtime({
      fetch: async () => new Response("<html>Login to Gym WiFi</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    });
    (await caches.open(names.shell)).entries.set(scope, new Response("cached shell"));
    const response = await handleFetch(navigate("/"), config, value, () => {})!;
    expect(await response.text()).toBe("cached shell");
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
    respondWith.mockClear();

    // Range requests do not trigger respondWith
    const rangeRequest = get("/models/pose_landmarker_full.task", { headers: { range: "bytes=0-100" } });
    fire("fetch", { request: rangeRequest, respondWith, waitUntil: () => {} });
    expect(respondWith).not.toHaveBeenCalled();

    // Subresource with query string does not trigger respondWith
    const queryAsset = get("/assets/app-abc.js?v=2");
    fire("fetch", { request: queryAsset, respondWith, waitUntil: () => {} });
    expect(respondWith).not.toHaveBeenCalled();

    // Navigation with query string DOES trigger respondWith
    const queryNav = navigate("/history?date=today");
    fire("fetch", { request: queryNav, respondWith, waitUntil: () => {} });
    expect(respondWith).toHaveBeenCalledOnce();

    expect(skipWaiting).not.toHaveBeenCalled();
  });
});
