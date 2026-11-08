// Capacitor copies all of dist/ into the native apps. The native app serves
// that local copy itself, so the web service worker is removed there: even if
// registration were ever attempted natively, it would find no worker script.
import { rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NATIVE_EXCLUDED, platforms } from "./verify-mobile.mjs";

export function removeNativeServiceWorker(rootDir = process.cwd()) {
  const root = resolve(rootDir);
  for (const platform of platforms) {
    for (const path of NATIVE_EXCLUDED) rmSync(join(root, platform.assets, path), { force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  removeNativeServiceWorker();
  console.log(`Removed ${NATIVE_EXCLUDED.join(", ")} from the native web copies.`);
}
