import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { transformWithEsbuild, type Plugin } from "vite";

// Large vendor files are cached on first use instead of at install, so the
// first visit does not download the pose model before anyone needs it.
const RUNTIME_DIRECTORIES = ["models/", "wasm/"];
export const SERVICE_WORKER_FILE = "sw.js";
const CORE_PATH = fileURLToPath(new URL("./src/pwa/serviceWorkerCore.ts", import.meta.url));

export interface ServiceWorkerBuildConfig {
  version: string;
  runtimeVersion: string;
  precache: string[];
}

function listFiles(directory: string): string[] {
  const files: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(relative(directory, path).split(sep).join("/"));
    }
  };
  walk(directory);
  return files.sort();
}

const isRuntimeFile = (path: string) => RUNTIME_DIRECTORIES.some((prefix) => path.startsWith(prefix));

/** Paths the worker installs; "" stands for the start page (index.html). */
export function selectPrecache(builtFiles: readonly string[]): string[] {
  return builtFiles
    .filter((path) => path !== SERVICE_WORKER_FILE && !path.endsWith(".map") && !isRuntimeFile(path))
    .map((path) => (path === "index.html" ? "" : path))
    .sort();
}

function hashEntries(entries: Iterable<[string, string | Uint8Array]>): string {
  const hash = createHash("sha256");
  for (const [name, content] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(name).update("\0").update(content).update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

const BOOTSTRAP = "GymBroServiceWorker.startServiceWorker(self, GYMBRO_SW_CONFIG);\n";

async function compileWorkerCore(): Promise<string> {
  const core = await transformWithEsbuild(readFileSync(CORE_PATH, "utf8"), CORE_PATH, {
    format: "iife", globalName: "GymBroServiceWorker", target: "es2020", loader: "ts",
  });
  return core.code;
}

/**
 * The shell cache name. It covers the worker's own code as well as the built
 * files, so a deploy that changes only the worker still gets a fresh cache
 * instead of sharing (and risking) the active worker's cache.
 */
export function shellVersion(files: ReadonlyMap<string, string | Uint8Array>, workerCode: string): string {
  return hashEntries([...files, ["\0service-worker", workerCode + BOOTSTRAP]]);
}

export async function buildServiceWorkerSource(
  config: ServiceWorkerBuildConfig,
  workerCode?: string,
): Promise<string> {
  const code = workerCode ?? await compileWorkerCore();
  // The verifier reads this single line to check the list against dist/.
  return `${code}\nconst GYMBRO_SW_CONFIG = ${JSON.stringify(config)};\n${BOOTSTRAP}`;
}

export function serviceWorkerPlugin(): Plugin {
  let publicDir = "";
  return {
    name: "gymbro-service-worker",
    apply: "build",
    // Vite's HTML plugin emits index.html during generateBundle; run after it.
    enforce: "post",
    configResolved(resolved) { publicDir = resolved.publicDir; },
    async generateBundle(_options, bundle) {
      const contents = new Map<string, string | Uint8Array>();
      for (const output of Object.values(bundle)) {
        contents.set(output.fileName, output.type === "chunk" ? output.code : output.source);
      }
      const runtime = new Map<string, Uint8Array>();
      for (const path of publicDir ? listFiles(publicDir) : []) {
        const bytes = readFileSync(join(publicDir, path));
        if (isRuntimeFile(path)) runtime.set(path, bytes);
        else contents.set(path, bytes);
      }
      if (!contents.has("index.html")) this.error("index.html is not in the bundle; the offline start page would be missing.");
      if (contents.has(SERVICE_WORKER_FILE)) this.error(`${SERVICE_WORKER_FILE} is generated; remove the copy in public/.`);
      const workerCode = await compileWorkerCore();
      const source = await buildServiceWorkerSource({
        version: shellVersion(contents, workerCode),
        runtimeVersion: hashEntries(runtime),
        precache: selectPrecache([...contents.keys()]),
      }, workerCode);
      this.emitFile({ type: "asset", fileName: SERVICE_WORKER_FILE, source });
    },
  };
}
