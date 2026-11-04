# Mobile prototype implementation plan

> Use `superpowers:executing-plans` inline; tests before behavior, one writer,
> fresh independent design and code review, green step commits and pushes.

**Goal:** Produce iOS/Android native prototypes and verifiable build artifacts.
**Architecture:** Capacitor packages the existing local React pipeline; native
lifecycle events bridge to current media/store cleanup. No backend or new analyzer.
**Stack:** Node 22.23.2, Capacitor 8.6.0, App plugin 8.1.2, assets generator 4.0.0,
Swift Package Manager/Xcode on macOS CI, Java 21/Android Gradle on Linux CI.
**Spec:** [mobile design](../specs/2026-11-03-mobile-prototype-design.md).

## Task 6 steps

- [x] Step 1: Confirm environment/platform preference, document D-022, review the
  design, verify current Node-22 tests/lint/build and dev serving; commit/push.
- [x] Step 2: Pin Capacitor dependencies, Node engine and build scripts. Configure
  local dist/ identity, generate iOS/Android shells and branded assets, scoped
  guidance and ignores. Verify build/sync and type-check config; commit/push.
- [x] Step 3: Test-first native background/listener ownership and packaging guard;
  implement cleanup integration and readable safe-area/offline shell. Run whole
  tests/lint/build, native asset checks, document actual results; commit/push.
- [ ] Step 4: Add reviewed cloud builds for Android APK and unsigned iOS simulator
  app, using standard public-repo runners, minimal permissions, no signing/store
  deployment. Run/inspect builds; fix actual failures and record logs/artifacts.
- [ ] Step 5: Obtain fresh whole-feature code review, resolve supported issues,
  verify web/native build boundaries, update complete handoff and next signing/
  device steps. Commit/push and integrate only if bounded requirements pass.

## File boundaries and risk cases

Step 1 evidence: Node 22.23.2 / npm 10.9.8 selected per process; clean lockfile
install succeeds; working-tree and fresh-source 287 tests/lint/build pass;
own dev port 5193 returns HTTP 200. Fresh Codex design review found no significant
issues. No native packages or project sources generated. The user confirmed the
packaging explanation and then approved Step 2 via "ok cool" at its checkpoint.

Step 2 evidence: dependencies/config/native sources and branded assets generated;
287 tests, lint and build/mobile config check pass; both projects sync. All seven
model/runtime files match each native copy by SHA-256; local configs/indexes and
ignores checked. Existing locked package entries unchanged. Fresh read-only Codex
setup review found no significant issues and independently checked asset hashes.
No native compilation or device test performed. Step 3's checkpoint was then
approved with "clear".

Step 3 evidence: 320 tests/13 files, lint, build/config check (409 modules), both
native syncs and package guard pass. Lifecycle (10), App integration (2) and
packaging cases (21) were observed failing before implementation/fixes. Exact
empty CLI compatibility stubs are permitted; no other extra files are exempted.
Real Edge empty-shell checks pass in portrait/landscape/desktop with injected
insets, no overflow/external requests/errors; screenshots inspected. Fresh Codex
review found no significant issues and independently passed 100 focused cases
plus package verification. Preview 5194 stopped/port free. Native compilation,
actual device lifecycle/insets/offline inference remain unrun; Step 4 awaits
its teaching checkpoint.

`capacitor.config.ts`, `.nvmrc`, package/lock and mobile TS configuration;
generated/configured `ios/`, `android/`, `resources/` with scoped guidance;
`src/mobile/` lifecycle module/tests, App hookup, CSS safe areas and local-font
HTML; `scripts/` packaging verifier/tests; `.github/workflows/` native builds.
Update affected root/source/native/docs READMEs and shared instructions.

Review: remote/dev URL accidentally shipped; stale/missing model/WASM copies;
background work and late async listener disposal; notch/landscape layouts;
unavailable Mac/SDK/signing and false claims of iPhone readiness. No private
media in artifacts, native public copies, committed secrets or unsupported camera.
