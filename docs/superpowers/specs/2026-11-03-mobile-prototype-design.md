# GymBro AI native mobile prototype

Authorization: the user explicitly requested building the mobile app, then
specified both platforms, iPhone first, and no MacBook. This batch supersedes
the earlier deferral of native scaffolding; it does not authorize store release,
paid services, Apple enrollment, backend uploads, or claims of validated lifting.

## Deliverable and builder choices

- Reuse the existing React/TypeScript app through pinned Capacitor **8.6.0**.
  Builder-selected app identifier: `com.gymbroai.app`; display name GymBro AI.
  Keep one web codebase, existing one-MP4 limits, local model/runtime, player,
  overlay, elbow measurements and honest unavailable states.
- Check in iOS (Swift Package Manager) and Android platform projects, excluding
  copied web bundles, builds, caches, local SDK paths, signing material and videos.
- Require Node >=22; use already-installed **22.23.2** through a process-local
  PATH on this machine, without changing the user's global Node 20 selection.
- Bundle the existing built `dist/` as webDir, with no development-server URL,
  external navigation allowlist or cleartext override. Remove remote Google font
  loading and use the existing system-font fallbacks so startup is self-contained.
- Reuse the existing first-party dumbbell logo as a vector icon source; generate
  native icons/splashes with pinned `@capacitor/assets` **4.0.0**.
- Add safe-area layout for iPhone notches/home indicators and modern Android
  system bars, using Capacitor's bundled SystemBars support. Keep touch controls
  and existing accessibility semantics; no second UI framework or camera feature.
- Use pinned `@capacitor/app` **8.1.2** to pause videos and cancel in-flight
  processing when the native app goes to the background. Completed clips stay
  in memory; this is not saved-workout storage. Release listeners on cleanup,
  including handles returned after disposal. Web behavior must remain unchanged.

## Build and verification

- Add reproducible build/sync/asset-verification commands and native instructions
  for Claude Code or Codex. The verifier checks native app identity, no remote
  server overrides, bundled index, and exact local model/WASM copy integrity.
- macOS/Xcode cannot run on this Windows host. Add a GitHub Actions workflow for
  standard public-repository runners: Android debug APK on Linux, iOS simulator
  app on macOS 26. Public-repo standard runners were verified as free; no paid
  runner or signing secrets. Limit retention and job time; no store publication.
- Trigger on pushes to this mobile feature branch and manual dispatch. Build
  both platforms and preserve downloadable artifacts. Launch the iOS simulator
  app and capture only its empty app shell (no private/user footage) for startup
  inspection when feasible. Never upload personal videos, pose results or traces.
- iOS simulator artifacts are **not installable on an iPhone**. Physical-device,
  TestFlight or App Store delivery requires Apple signing/provisioning and a
  suitable macOS build path. Do not fake a signed IPA or call it phone-ready.
- Run existing tests/lint/build under Node 22, test native listener ownership and
  packaging failures, inspect cloud results, and obtain a fresh critical review.
  Separate successful web bundling, native compilation, simulator launch and
  actual phone/video inference. Report every unavailable check explicitly.

## References

[Capacitor requirements](https://capacitorjs.com/docs/getting-started/environment-setup),
[SPM](https://capacitorjs.com/docs/ios/spm),
[SystemBars](https://capacitorjs.com/docs/apis/system-bars),
[asset generator](https://github.com/ionic-team/capacitor-assets),
[public-runner billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
