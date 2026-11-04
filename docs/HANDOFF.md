# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Start here in Claude Code or Codex.

## Current task and next checkpoint

Task 7's **planning-only deliverable is complete**, authorized by the user's
latest "clear" on 2026-11-04. It was developed on `feat/task7-phone-test-plan`
from reviewed master
`e38cc4b`. The user has an **iPhone 12 Pro Max**, no Android phone access and no
Apple Developer Program membership. iOS version/temporary Mac access remain
unconfirmed. See D-023 and the [phone test plan](superpowers/plans/2026-11-04-phone-video-acceptance.md).
Fresh independent review found no significant issues; all 320 tests, lint/build
and documentation checks pass. Check Git for the final integrated document commit.

Proposed next execution step: prepare a free private-LAN Safari test from Windows,
with verified first-party non-human fixtures exported from Task4's exact commit.
This can test real phone decoding/model/player behavior without paid membership;
it cannot verify the installed native app. **Execution is not approved yet.**
Explain the local preview/fixture transfer, why it helps before native signing,
and why a paid build service is unnecessary for this first slice; ask
"Is this clear?" and wait before starting servers/exporting files/phone checks.
No product code, fixture export, LAN server or phone test has run in Task 7.

Task 6's bounded mobile prototype is complete, iPhone first, from Windows without
a MacBook (D-022). The reviewed feature was fast-forwarded/pushed to `master` at
`ed5f1b3` on 2026-11-04; `feat/task6-mobile-app` is retained. Implementation head
is `76dd71c`; later commits document evidence. Check Git for current tips.

On 2026-11-04 the user answered "clear" to Step 5's whole-feature review and
reviewed-integration explanation. Do not reopen its checkpoint.
Fresh whole-feature code review found no significant issues and independently
passed 33 focused tests/package checks. Documentation audit found two stale
current claims and a plan-index label; these are corrected. All five steps are
complete: local merged-tree checks and master cloud run4 pass. Task 7's planning
checkpoint is now approved; executing its proposed checks remains separate.

Read root AGENTS.md, the [mobile design](superpowers/specs/2026-11-03-mobile-prototype-design.md),
[plan](superpowers/plans/2026-11-03-mobile-prototype.md), and scoped guidance
before edits. Shared AGENTS.md files are imported by adjacent CLAUDE.md files.

## Implemented behavior

- Pinned Capacitor 8.6.0, App 8.1.2, assets tool 4.0.0; Node 22+ required.
  iOS/SPM and Android sources, GymBro AI identity `com.gymbroai.app`, version
  0.1.0, and first-party dumbbell icons/splashes are checked in.
- The shared React app retains one local side-view bench-press MP4, bounded pose
  processing, player/overlay and image-space elbow estimates. No backend,
  accounts, saved sessions, reps or technique verdicts.
- Native background events pause videos and reset unfinished processing through
  the existing store's abort/lease cleanup. Completed clips stay in memory;
  returning never auto-resumes. Late native listener handles are released.
- Device safe-area CSS and Android edge-to-edge are enabled. Fonts are local
  system fallbacks. No remote model/runtime or development-server URL.
- `mobile:sync` builds, copies/updates both platforms and verifies them;
  `mobile:verify` checks existing copies without mutation. Neither compiles
  native binaries. Guard rejects stale/missing/extra bundles, wrong identities,
  remote resources/server overrides and obvious forbidden served files.
  Runtime bytes match the installed MediaPipe package; only the two exact empty
  Capacitor compatibility stubs are exempted from dist/native tree matching.

## Verified results and artifacts

[Master cloud run4](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41794275180),
at `ed5f1b3`, succeeded, repeating run3: shared checks, Android debug APK, iOS
simulator build, compiled-package comparisons, splash rejection and visible app
startup.

- **320 tests / 13 files**, lint, build/config type-check and guarded sync pass
  locally and in shared Linux CI. Build transforms 409 modules; the existing
  Browserslist warning remains.
- Both compiled packages contain all 13 shared web files byte-for-byte, including
  the model and six runtime/loader files.
- Xcode **26.6 / 17F113**, macOS 26 ARM64, **iPhone 17 Pro / iOS 26.4 simulator**:
  the Vision text guard passed and the downloaded screenshot shows the actual
  interface, manually inspected after outer-artifact hash verification.
  Console reports WebView loaded; no matching fresh App crash report was found.
- Run 1's green launch produced a blank image; run 2 correctly failed on home
  screen captures. Foreground launch and bounded visible-text retries resolved
  the verification failure without app-code changes. Do not replace this gate
  with a fixed sleep or equate process launch with rendering. Detailed evidence
  and diagnostic-review disposition are in STATUS.
- Although Xcode signing was disabled, the ARM64 linker emitted an ad-hoc
  signature, with no Apple team/identity. This is a simulator build, **not an
  installable iPhone app or signed IPA**.

Latest downloaded artifacts and screenshot are retained in ignored
`build/artifacts/run-4/`: `GymBroAI-android-debug.apk`,
`GymBroAI-ios-simulator.zip`, `ios-simulator-startup.png`, plus outer ZIPs.
Both outer ZIP digests matched GitHub metadata. APK SHA-256:
`a8bdc00bd80188bbdeb8bd3a1b66ea108a8be6fec69d01b943abba38535a2918`.
GitHub artifact IDs: Android `13305216402`, iOS `13305681152`; retention one day.
The earlier accepted run3 downloads remain in `build/artifacts/run-3/`.
Never commit the downloads, screenshots, signing files or copied web assets.

Fresh read-only Codex whole-feature review of `f0e9118..eabf55e` found no
significant implementation findings. It independently passed 33 focused cases,
verified both packages' 13 files/configs and APK checksum, and inspected the
visible iOS image. A separate docs audit verified links/imports/guidance; two
stale font/compilation claims and a plan-index label are corrected. Review-model
identifiers were not exposed. No native execution or inference was performed by
these reviewers.
Review is resolved. Merged master passes the whole 320 tests, lint and guarded
sync/build. Master run4 independently passes all three cloud jobs; both downloaded
packages match all 13 shared files. See STATUS for detailed evidence and limits.

## Limits and continuity

Physical iPhone/Android installation, native file selection/background behavior,
native offline inference, bench accuracy and phone performance remain unverified.
No paid service, Apple enrollment/credentials or store release is authorized.

The phone test plan separates free Safari checks, conditional installed-native
checks and permitted bench evidence. Native installation needs a later available
Mac/approved signing route; the current simulator ZIP cannot install on the phone.
Android physical tests have no available device. Bench acceptance still needs
licensed footage. Keep those gates blocked rather than inferring passes.

Task 4 remains unmerged on `feat/task4-browser-acceptance` at `34538e4`.
Its permitted bench fixture is still missing; the user cannot record one, so do
not ask again. Do not merge that incomplete branch just to obtain its tooling.
Master's Task 5 measurements are limited image-space estimates, not completion
of milestone-one bench acceptance. Preserve both branches and PRODUCT_BRIEF.

Use process-local Node 22.23.2 / npm 10.9.8; preserve global Node 20.
Java 21 exists locally; Android SDK/emulator and Xcode do not. Own dev server
5193 remains available, preview 5194 was stopped/port free; leave older 5176 alone.
Browser checks use an isolated profile and only empty/non-human screenshots.

One writer. Before every commit run whole tests/lint/build and inspect staging.
Commit/push green steps; D-019's reviewed fast-forward/push is complete. Retain
the feature branch. No attribution trailers, force pushes or history rewrites.
GitHub's default branch is still
`feat/gymbro-video-landmarks`; manual-dispatch UI requires the workflow on that
default, while feature/master push triggers work. Do not change settings silently.
