// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyMobile } from "./verify-mobile.mjs";
import { removeNativeServiceWorker } from "./remove-native-service-worker.mjs";

const parent = fileURLToPath(new URL("../.superpowers/mobile-package-tests/", import.meta.url));
const copies = ["dist", "ios/App/App/public", "android/app/src/main/assets/public"];
let fixture;
function write(path, content) {
  const target = join(fixture, path);
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
}
function copyToBundles(path, content) { for (const dir of copies) write(`${dir}/${path}`, content); }
const shellFiles = ["", "assets/app.js", "assets/app.css", "manifest.webmanifest", "icons/icon-192.png"];
function writeWorker(precache = shellFiles) {
  write("dist/sw.js", `var core;\nconst GYMBRO_SW_CONFIG = ${JSON.stringify({ version: "v", runtimeVersion: "r", precache })};\n`);
}
function patchConfig(path, patch) {
  write(path, JSON.stringify({ ...JSON.parse(readFileSync(join(fixture, path), "utf8")), ...patch }));
}

beforeEach(() => {
  mkdirSync(parent, { recursive: true }); fixture = mkdtempSync(join(parent, "fixture-"));
  const config = JSON.stringify({ appId: "com.gymbroai.app", appName: "GymBro AI", webDir: "dist" });
  write("ios/App/App/capacitor.config.json", config);
  write("android/app/src/main/assets/capacitor.config.json", config);
  write("ios/App/App.xcodeproj/project.pbxproj", "PRODUCT_BUNDLE_IDENTIFIER = com.gymbroai.app;");
  write("android/app/build.gradle", 'android { defaultConfig { applicationId "com.gymbroai.app" } }');
  for (const dir of copies.slice(1)) {
    write(`${dir}/cordova.js`, ""); write(`${dir}/cordova_plugins.js`, "");
  }
  copyToBundles("index.html", '<html><head><link rel="stylesheet" href="/assets/app.css"><link rel="manifest" href="/manifest.webmanifest"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>');
  copyToBundles("assets/app.js", "export {};"); copyToBundles("assets/app.css", "body { color: white; }");
  copyToBundles("manifest.webmanifest", JSON.stringify({ icons: [{ src: "icons/icon-192.png" }] }));
  copyToBundles("icons/icon-192.png", "synthetic icon");
  writeWorker();
  // These bytes test packaging, not actual model or WASM validity.
  copyToBundles("models/pose_landmarker_full.task", "synthetic model");
  write("public/models/pose_landmarker_full.task", "synthetic model");
  for (const name of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) {
    write(`node_modules/@mediapipe/tasks-vision/wasm/${name}`, "synthetic runtime");
    write(`public/wasm/${name}`, "synthetic runtime"); copyToBundles(`wasm/${name}`, "synthetic runtime");
  }
});
afterEach(() => {
  const target = realpathSync(fixture);
  if (dirname(target) !== realpathSync(parent) || !basename(target).startsWith("fixture-")) {
    throw new Error("Refusing cleanup outside the created fixture directory.");
  }
  rmSync(target, { recursive: true });
});

describe("mobile package verification", () => {
  it("accepts complete local bundles with matching runtime and native identities", () => {
    expect(() => verifyMobile(fixture)).not.toThrow();
  });
  it("rejects a missing built index", () => {
    unlinkSync(join(fixture, "dist/index.html"));
    expect(() => verifyMobile(fixture)).toThrow(/index\.html/i);
  });
  it.each([
    { url: "http://192.0.2.1:5173" },
    { allowNavigation: ["*"] },
    { cleartext: true },
  ])("rejects shipped native server overrides: %j", server => {
    patchConfig("ios/App/App/capacitor.config.json", { server });
    expect(() => verifyMobile(fixture)).toThrow(/server/i);
  });
  it("rejects a copied config for another app", () => {
    patchConfig("android/app/src/main/assets/capacitor.config.json", { appId: "com.example.other" });
    expect(() => verifyMobile(fixture)).toThrow(/identity|appId/i);
  });
  it("rejects a different iOS native bundle identifier", () => {
    write("ios/App/App.xcodeproj/project.pbxproj", "PRODUCT_BUNDLE_IDENTIFIER = com.example.other;");
    expect(() => verifyMobile(fixture)).toThrow(/iOS.*identity/i);
  });
  it("rejects a different Android application identifier", () => {
    write("android/app/build.gradle", 'applicationId "com.example.other"');
    expect(() => verifyMobile(fixture)).toThrow(/Android.*identity/i);
  });
  it("rejects an old JavaScript bundle even when model files match", () => {
    write("android/app/src/main/assets/public/assets/app.js", "old code");
    expect(() => verifyMobile(fixture)).toThrow(/app\.js/i);
  });
  it("rejects a changed native model", () => {
    write("ios/App/App/public/models/pose_landmarker_full.task", "wrong model");
    expect(() => verifyMobile(fixture)).toThrow(/pose_landmarker_full\.task/i);
  });
  it("rejects a missing public runtime file", () => {
    unlinkSync(join(fixture, "public/wasm/vision_wasm_internal.wasm"));
    expect(() => verifyMobile(fixture)).toThrow(/runtime|wasm/i);
  });
  it("rejects runtime bytes that differ from the installed package, even if every copy agrees", () => {
    const path = "wasm/vision_wasm_internal.wasm";
    copyToBundles(path, "wrong runtime"); write(`public/${path}`, "wrong runtime");
    expect(() => verifyMobile(fixture)).toThrow(/runtime|wasm/i);
  });
  it("rejects an extra stale native file", () => {
    write("ios/App/App/public/old.js", "old code");
    expect(() => verifyMobile(fixture)).toThrow(/old\.js|unexpected/i);
  });
  it("rejects content in Capacitor's otherwise empty compatibility stubs", () => {
    write("ios/App/App/public/cordova.js", "unexpected plugin code");
    expect(() => verifyMobile(fixture)).toThrow(/cordova\.js/i);
  });
  it.each(["AGENTS.md", "private-bench.mp4", "signing.p12"])("rejects forbidden served files: %s", name => {
    copyToBundles(name, "synthetic forbidden data");
    expect(() => verifyMobile(fixture)).toThrow(/forbidden|not allowed/i);
  });
  it("rejects a remote script in the bundled index", () => {
    copyToBundles("index.html", '<script src="https://example.invalid/app.js"></script>');
    expect(() => verifyMobile(fixture)).toThrow(/remote|external/i);
  });
  it("rejects protocol-relative external font links", () => {
    copyToBundles("index.html", '<link rel="stylesheet" href="//fonts.example.invalid/font.css">');
    expect(() => verifyMobile(fixture)).toThrow(/remote|external/i);
  });
  it("rejects remote resources referenced by bundled CSS", () => {
    copyToBundles("assets/app.css", '@import "https://fonts.example.invalid/font.css";');
    expect(() => verifyMobile(fixture)).toThrow(/remote|external/i);
  });
  it("rejects missing local script references even when the trees match", () => {
    for (const dir of copies) unlinkSync(join(fixture, dir, "assets/app.js"));
    expect(() => verifyMobile(fixture)).toThrow(/app\.js/i);
  });
});

describe("web service worker packaging", () => {
  it("requires the built web bundle to contain the service worker", () => {
    unlinkSync(join(fixture, "dist/sw.js"));
    expect(() => verifyMobile(fixture)).toThrow(/sw\.js/i);
  });
  it("rejects a service worker copied into a native bundle", () => {
    write("android/app/src/main/assets/public/sw.js", readFileSync(join(fixture, "dist/sw.js")));
    expect(() => verifyMobile(fixture)).toThrow(/Android.*sw\.js/i);
  });
  it("removes copied service workers from both native bundles, and nothing else", () => {
    for (const dir of copies.slice(1)) write(`${dir}/sw.js`, readFileSync(join(fixture, "dist/sw.js")));
    removeNativeServiceWorker(fixture);
    expect(() => verifyMobile(fixture)).not.toThrow();
    expect(readFileSync(join(fixture, "dist/sw.js"), "utf8")).toMatch(/GYMBRO_SW_CONFIG/);
  });
  it("accepts native bundles that already lack the service worker when removing", () => {
    expect(() => removeNativeServiceWorker(fixture)).not.toThrow();
  });
  it("rejects a precache list that names a file missing from the build", () => {
    writeWorker([...shellFiles, "assets/old-123.js"]);
    expect(() => verifyMobile(fixture)).toThrow(/old-123\.js/);
  });
  it("rejects a built shell file the worker would not precache", () => {
    writeWorker(shellFiles.filter((path) => path !== "assets/app.css"));
    expect(() => verifyMobile(fixture)).toThrow(/app\.css/);
  });
  it.each(["models/pose_landmarker_full.task", "wasm/vision_wasm_internal.wasm", "sw.js"])(
    "rejects precaching %s",
    (path) => {
      writeWorker([...shellFiles, path]);
      expect(() => verifyMobile(fixture)).toThrow(/precache/i);
    },
  );
  it("rejects a service worker without a readable precache list", () => {
    write("dist/sw.js", "self.addEventListener('fetch', () => {});");
    expect(() => verifyMobile(fixture)).toThrow(/precache/i);
  });
  it("rejects a remote manifest icon", () => {
    copyToBundles("manifest.webmanifest", JSON.stringify({ icons: [{ src: "https://cdn.example.invalid/i.png" }] }));
    expect(() => verifyMobile(fixture)).toThrow(/remote|external/i);
  });
  it("rejects a manifest icon missing from the build", () => {
    copyToBundles("manifest.webmanifest", JSON.stringify({ icons: [{ src: "icons/missing.png" }] }));
    expect(() => verifyMobile(fixture)).toThrow(/missing\.png/);
  });
});