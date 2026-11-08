// Routing and caching decisions for the web app's service worker.
// The build inlines this file into a classic worker script, so it must stay
// free of imports and must reach browser APIs only through WorkerRuntime.

export interface ServiceWorkerConfig {
  /** Content hash of this build's shell; a new value means a new shell cache. */
  version: string;
  /** Content hash of the pose model and MediaPipe runtime files. */
  runtimeVersion: string;
  /** Paths relative to the scope; "" is the app's start page. */
  precache: string[];
}

export type RequestRoute = "shell" | "precached" | "runtime" | "bypass";

export interface CacheLike {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}
export interface CacheStorageLike {
  open(name: string): Promise<CacheLike>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}
export interface WorkerRuntime {
  caches: CacheStorageLike;
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
  scopeUrl: string;
  /** True while a newer worker is installing or waiting to take over. */
  updatePending(): boolean;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(id: never): void;
}

const CACHE_PREFIX = "gymbro-";
// A gym's weak signal can leave a request hanging; past this delay an
// installed shell is more useful than a spinner.
const NAVIGATION_TIMEOUT_MS = 4_000;

export function cacheNamesFor(config: ServiceWorkerConfig) {
  return {
    shell: `${CACHE_PREFIX}shell-${config.version}`,
    runtime: `${CACHE_PREFIX}runtime-${config.runtimeVersion}`,
  };
}

export function routeRequest(
  request: Pick<Request, "method" | "url" | "mode" | "headers">,
  scopeUrl: string,
  precache: ReadonlySet<string>,
): RequestRoute {
  // Writes, partial reads and other origins (Supabase) always go to the network.
  if (request.method !== "GET" || request.headers.has("range")) return "bypass";
  const scope = new URL(scopeUrl);
  let url: URL;
  try { url = new URL(request.url); } catch { return "bypass"; }
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return "bypass";
  if (request.mode === "navigate") return "shell";
  // A query string could select a variant the cache key would not distinguish.
  if (url.search) return "bypass";
  const path = url.pathname.slice(scope.pathname.length);
  if (path.startsWith("models/") || path.startsWith("wasm/")) return "runtime";
  if (path.startsWith("assets/") || precache.has(path)) return "precached";
  return "bypass";
}

// Safari refuses to answer a navigation with a response that records a
// redirect, which hosts with "pretty URL" redirects can produce.
async function withoutRedirect(response: Response): Promise<Response> {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status, statusText: response.statusText, headers: response.headers,
  });
}

export async function precacheShell(config: ServiceWorkerConfig, runtime: WorkerRuntime): Promise<void> {
  const { shell } = cacheNamesFor(config);
  // A cache with this name may belong to the active worker (same build
  // content); a failed install must never delete what that worker serves.
  const createdHere = !(await runtime.caches.keys()).includes(shell);
  const cache = await runtime.caches.open(shell);
  try {
    await Promise.all(config.precache.map(async (path) => {
      const url = new URL(path, runtime.scopeUrl).href;
      // Revalidate so an old HTTP-cached start page cannot pair with new assets.
      const response = await runtime.fetch(url, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Could not cache ${url}: HTTP ${response.status}.`);
      await cache.put(url, await withoutRedirect(response));
    }));
  } catch (error) {
    // A half-filled new shell must not survive; the previous worker stays in charge.
    if (createdHere) await runtime.caches.delete(shell);
    throw error;
  }
}

export async function removeOldCaches(config: ServiceWorkerConfig, runtime: WorkerRuntime): Promise<void> {
  const current = Object.values(cacheNamesFor(config));
  const names = await runtime.caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX) && !current.includes(name))
    .map((name) => runtime.caches.delete(name)));
}

async function lookup(runtime: WorkerRuntime, cacheName: string, request: Request | string) {
  try { return await (await runtime.caches.open(cacheName)).match(request); }
  catch { return undefined; }
}

function networkFirst(
  request: Request,
  runtime: WorkerRuntime,
  fallback: () => Promise<Response | undefined>,
  timeoutMs?: number,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: unknown;
    const finish = (response: Response) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) runtime.clearTimeout(timer as never);
      resolve(response);
    };
    const tryFallback = async (error?: unknown) => {
      const cached = await fallback();
      if (settled) return;
      if (cached) finish(cached);
      // With no copy to offer after a timeout, keep waiting for the network.
      else if (error !== undefined) { settled = true; reject(error); }
    };
    runtime.fetch(request).then(finish, (error: unknown) => { void tryFallback(error ?? new Error("Network error")); });
    if (timeoutMs !== undefined) timer = runtime.setTimeout(() => { void tryFallback(); }, timeoutMs);
  });
}

async function cacheFirst(
  request: Request,
  runtime: WorkerRuntime,
  cacheName: string,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Response> {
  const cached = await lookup(runtime, cacheName, request);
  if (cached) return cached;
  const response = await runtime.fetch(request);
  if (response.status === 200) {
    const copy = response.clone();
    // A failed store (for example over quota) must not fail the page's request.
    waitUntil(runtime.caches.open(cacheName).then((cache) => cache.put(request, copy)).catch(() => undefined));
  }
  return response;
}

/** Returns null when the browser should handle the request without the worker. */
export function handleFetch(
  request: Request,
  config: ServiceWorkerConfig,
  runtime: WorkerRuntime,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Response> | null {
  const names = cacheNamesFor(config);
  switch (routeRequest(request, runtime.scopeUrl, new Set(config.precache))) {
    case "shell":
      // The network wins so a new deploy is seen at once; the cached start page
      // is only replaced by the next worker's install, keeping it paired with
      // the assets that worker cached.
      return networkFirst(request, runtime,
        () => lookup(runtime, names.shell, new URL("", runtime.scopeUrl).href), NAVIGATION_TIMEOUT_MS);
    case "precached":
      return cacheFirst(request, runtime, names.shell, waitUntil);
    case "runtime":
      // Model and runtime URLs carry no version. While a newer build waits, a
      // page may be running that build's code, so prefer the server's files
      // and leave this worker's copies untouched for its own offline pages.
      if (runtime.updatePending()) {
        return networkFirst(request, runtime, () => lookup(runtime, names.runtime, request));
      }
      return cacheFirst(request, runtime, names.runtime, waitUntil);
    default:
      return null;
  }
}

interface ExtendableEventLike { waitUntil(promise: Promise<unknown>): void }
interface FetchEventLike extends ExtendableEventLike {
  request: Request;
  respondWith(response: Promise<Response>): void;
}
export interface WorkerScopeLike {
  registration: { scope: string; installing: unknown; waiting: unknown };
  caches: CacheStorageLike;
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, listener: (event: never) => void): void;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(id: never): void;
}

export function startServiceWorker(scope: WorkerScopeLike, config: ServiceWorkerConfig): void {
  const runtime: WorkerRuntime = {
    caches: scope.caches,
    // Worker globals must be called on the global object.
    fetch: (input, init) => scope.fetch(input, init),
    scopeUrl: scope.registration.scope,
    updatePending: () => Boolean(scope.registration.installing || scope.registration.waiting),
    setTimeout: (callback, ms) => scope.setTimeout(callback, ms),
    clearTimeout: (id) => scope.clearTimeout(id),
  };
  // No skipWaiting: a new worker activates only after every window of the old
  // version closes, so an open page never loses the cached files it relies on.
  scope.addEventListener("install", (event: ExtendableEventLike) => {
    event.waitUntil(precacheShell(config, runtime));
  });
  // Claim takes control of the first visit's page so the model it downloads
  // is cached; on later updates no old page remains when this runs.
  scope.addEventListener("activate", (event: ExtendableEventLike) => {
    event.waitUntil(removeOldCaches(config, runtime).then(() => scope.clients.claim()));
  });
  scope.addEventListener("fetch", (event: FetchEventLike) => {
    const response = handleFetch(event.request, config, runtime, (promise) => event.waitUntil(promise));
    if (response) event.respondWith(response);
  });
}
