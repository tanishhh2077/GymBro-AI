import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const appId = "com.gymbroai.app";
const serviceWorker = "sw.js";
// The native app serves its own local copy; see remove-native-service-worker.mjs.
export const NATIVE_EXCLUDED = [serviceWorker];
const runtimeOnly = /^(?:models|wasm)\//;
const remote = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
export const platforms = [
  { name: "iOS", assets: "ios/App/App/public", config: "ios/App/App/capacitor.config.json" },
  { name: "Android", assets: "android/app/src/main/assets/public", config: "android/app/src/main/assets/capacitor.config.json" },
];
const forbidden = /\.(?:md|markdown|mp4|mov|webm|m4v|avi|jks|keystore|p12|pem|mobileprovision)$/i;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
function fail(message) {
  throw new Error(`${message} Correct the source/dependencies, then run npm run mobile:sync.`);
}
function read(root, path) {
  try { return readFileSync(join(root, path)); }
  catch { fail(`Missing or unreadable ${path}.`); }
}
function snapshot(root, directory) {
  const files = new Map();
  const walk = (relative = "") => {
    let entries;
    try { entries = readdirSync(join(root, directory, relative), { withFileTypes: true }); }
    catch { fail(`Missing or unreadable assets directory: ${directory}/${relative}.`); }
    for (const entry of entries) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) fail(`Symlink is not allowed in ${directory}/${path}.`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        if (forbidden.test(path)) fail(`Forbidden served file: ${directory}/${path}.`);
        files.set(path, digest(read(root, `${directory}/${path}`)));
      } else fail(`Unsupported asset: ${directory}/${path}.`);
    }
  };
  walk(); return files;
}
function compare(expected, actual, label) {
  for (const [path, hash] of expected) {
    if (!actual.has(path)) fail(`${label}: missing ${path}.`);
    if (actual.get(path) !== hash) fail(`${label}: stale or changed ${path}.`);
  }
  for (const path of actual.keys()) {
    if (!expected.has(path)) fail(`${label}: unexpected ${path}.`);
  }
}

// The installed web app starts offline only from what the worker precached, so
// its list must match the build exactly; large vendor files stay runtime-only.
function verifyWebInstall(root, built) {
  if (!built.has(serviceWorker)) fail(`Missing built service worker ${serviceWorker}.`);
  const embedded = read(root, `dist/${serviceWorker}`).toString().match(/^const GYMBRO_SW_CONFIG = (.*);$/m);
  let precache;
  try { precache = JSON.parse(embedded[1]).precache; } catch { precache = undefined; }
  if (!Array.isArray(precache) || precache.some(path => typeof path !== "string")) {
    fail(`Unreadable service worker precache list in ${serviceWorker}.`);
  }
  const listed = new Set(precache.map(path => (path === "" ? "index.html" : path)));
  for (const path of listed) {
    if (path === serviceWorker || runtimeOnly.test(path)) fail(`Service worker must not precache ${path}.`);
    if (!built.has(path)) fail(`Service worker precache names missing built file ${path}.`);
  }
  for (const path of built.keys()) {
    if (path === serviceWorker || runtimeOnly.test(path) || path.endsWith(".map")) continue;
    if (!listed.has(path)) fail(`Built file ${path} is missing from the service worker precache list.`);
  }
  const manifestPath = "manifest.webmanifest";
  if (!built.has(manifestPath)) return;
  let icons;
  try { icons = JSON.parse(read(root, `dist/${manifestPath}`).toString()).icons ?? []; }
  catch { fail(`Unreadable ${manifestPath}.`); }
  for (const icon of icons) {
    const src = String(icon?.src ?? "");
    if (remote.test(src)) fail(`Remote/external manifest icon: ${src}.`);
    const path = decodeURIComponent(new URL(src, `https://bundle.invalid/${manifestPath}`).pathname).slice(1);
    if (!built.has(path)) fail(`Missing manifest icon: ${path}.`);
  }
}

export function verifyMobile(rootDir = process.cwd()) {
  const root = resolve(rootDir);
  const built = snapshot(root, "dist");
  if (!built.has("index.html")) fail("Missing built index.html.");

  // These checks cover generated entrypoints, not arbitrary JavaScript behavior.
  // Runtime network/device verification remains a separate acceptance check.
  const html = read(root, "dist/index.html").toString();
  for (const tag of html.matchAll(/<(?:script|link|img|source|iframe|base)\b[^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const value = attribute[1];
      if (remote.test(value)) fail(`Remote/external index resource: ${value}.`);
      const path = decodeURIComponent(new URL(value, "https://bundle.invalid/").pathname).slice(1);
      if (!built.has(path)) fail(`Missing local index resource: ${path}.`);
    }
  }
  for (const path of built.keys()) {
    if (!path.endsWith(".css")) continue;
    const css = read(root, `dist/${path}`).toString();
    if (/(?:@import\s*(?:url\(\s*)?|url\(\s*)["']?(?:https?:)?\/\//i.test(css)) {
      fail(`Remote/external CSS resource in ${path}.`);
    }
  }
  verifyWebInstall(root, built);
  const nativeExpected = new Map([...built].filter(([path]) => !NATIVE_EXCLUDED.includes(path)));

  const runtime = snapshot(root, "node_modules/@mediapipe/tasks-vision/wasm");
  if (![...runtime.keys()].some(path => path.endsWith(".wasm"))) fail("Installed MediaPipe runtime is empty.");
  compare(runtime, snapshot(root, "public/wasm"), "MediaPipe public runtime");
  for (const [path, hash] of runtime) {
    if (built.get(`wasm/${path}`) !== hash) fail(`Built runtime mismatch: wasm/${path}.`);
  }
  const model = "models/pose_landmarker_full.task";
  if (built.get(model) !== digest(read(root, `public/${model}`))) fail(`Built model mismatch: ${model}.`);

  const iosProject = read(root, "ios/App/App.xcodeproj/project.pbxproj").toString();
  const bundleIds = [...iosProject.matchAll(/\bPRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";\s]+)"?\s*;/g)];
  if (!bundleIds.length || bundleIds.some(match => match[1] !== appId)) fail("iOS native identity mismatch.");
  const androidProject = read(root, "android/app/build.gradle").toString();
  const androidId = androidProject.match(/\bapplicationId\s*(?:=\s*)?["']([^"']+)["']/);
  if (androidId?.[1] !== appId) fail("Android native identity mismatch.");

  for (const platform of platforms) {
    const config = JSON.parse(read(root, platform.config).toString());
    if (config?.appId !== appId || config.appName !== "GymBro AI" || config.webDir !== "dist") {
      fail(`${platform.name} copied config identity/appId/webDir mismatch.`);
    }
    if ("server" in config) fail(`${platform.name} native server overrides are not allowed.`);
    const nativeFiles = snapshot(root, platform.assets);
    // With no Cordova plugins, the pinned CLI adds these two zero-byte stubs.
    // Permit only their exact empty contents, not an unchecked extra JS path.
    for (const stub of ["cordova.js", "cordova_plugins.js"]) {
      if (!nativeFiles.has(stub)) continue;
      if (nativeFiles.get(stub) !== digest(Buffer.alloc(0))) fail(`Unexpected content in ${platform.name} ${stub}.`);
      nativeFiles.delete(stub);
    }
    for (const path of NATIVE_EXCLUDED) {
      if (nativeFiles.has(path)) fail(`${platform.name} bundle must not contain the web-only ${path}.`);
    }
    compare(nativeExpected, nativeFiles, `${platform.name} bundle`);
  }
  return { files: nativeExpected.size, runtimeFiles: runtime.size };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = verifyMobile();
    console.log(`Verified iOS and Android: ${result.files} files each, local entrypoints, model and ${result.runtimeFiles} runtime files.`);
  } catch (error) {
    console.error(`Mobile verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
