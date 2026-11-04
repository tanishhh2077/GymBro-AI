import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const appId = "com.gymbroai.app";
const platforms = [
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
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) fail(`Remote/external index resource: ${value}.`);
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
    compare(built, nativeFiles, `${platform.name} bundle`);
  }
  return { files: built.size, runtimeFiles: runtime.size };
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
