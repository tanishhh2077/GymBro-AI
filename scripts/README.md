# Packaging tools

`workout-backup-native.test.mjs` checks pinned export plugins, the embedded iOS
filesystem privacy declaration and the app's Android public-storage permissions.

`verify-mobile.mjs` checks both native copies after build/sync: local entrypoints,
matching complete web bundles, expected app identities and byte-identical local
model/runtime assets. It also rejects served Markdown, obvious video/signing files
and remote entrypoint/font resources. This is not a general secret scanner.

The web build also contains the installable app's service worker `dist/sw.js`.
The verifier requires it, checks that its embedded precache list names exactly
the built shell files (never `sw.js`, `models/` or `wasm/`), and checks that
manifest icons are local, existing files. The native apps serve their own copy,
so `remove-native-service-worker.mjs` deletes `sw.js` from both native copies
and the verifier fails if one is present. Plain `npx cap sync` copies `sw.js`
back and verification then fails; use `npm run mobile:sync`.

`generate-web-icons.mjs` (`npm run web:icons`) redraws the web app icons in
`public/icons/` from `resources/logo.svg` without an image library; its test
fails when the committed icons no longer match the logo.

Run `npm run mobile:sync` to build, update native copies, remove the web-only
worker and verify them, or `npm run mobile:verify` to check existing copies
without modifying them.
`npm test` includes synthetic filesystem failure cases from this directory.
`build-config.test.mjs` checks that `npm run build` type-checks `vite.config.ts`
and `vitest.config.ts` through `tsconfig.node.json` with Node types only.
Native compilation, real offline inference and phone performance remain separate.

`check-simulator-screen.swift` is a macOS-only CI smoke check using Apple's local
Vision text recognition. It requires the visible GymBro AI/bench-press interface,
so a blank screen or splash cannot pass merely because the process launched.
It requires both the GymBro brand fragment and bench-press label, tolerating
OCR's observed I/l confusion in the name. The workflow checks its negative path
against the first-party splash image, then
retries actual empty-shell captures with a bound. It never inspects workout media
or calls a paid service. macOS compilation, splash rejection and actual native
startup detection passed in run3; that screenshot was manually inspected. A
visible empty shell does not verify file selection or pose analysis.
