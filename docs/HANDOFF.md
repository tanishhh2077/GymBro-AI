# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Start here in Claude Code or Codex.

## Current task and next checkpoint

Task 6 builds both mobile prototypes, iPhone first, from Windows without a
MacBook (D-022). Steps 1–4 are complete. Branch: `feat/task6-mobile-app`;
implementation head `76dd71c`, based on reviewed master `f0e9118`. Check Git
for the final documentation commit. Task 6 has not been merged to master.

On 2026-11-04 the user answered "clear" to Step 5's whole-feature review and
reviewed-integration explanation. Step 5 is active; do not reopen its checkpoint.
Fresh whole-feature code review found no significant issues and independently
passed 33 focused tests/package checks. Documentation audit found two stale
current claims and a plan-index label; these are corrected. Integration and final
handoff are being finalized. A new product task still needs its teaching checkpoint.

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

[Cloud run 3](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41778715047),
at `76dd71c`, succeeded: shared checks, Android debug APK, iOS simulator build,
compiled-package comparisons, splash rejection and visible app startup.

- **320 tests / 13 files**, lint, build/config type-check and guarded sync pass
  locally and in shared Linux CI. Build transforms 409 modules; the existing
  Browserslist warning remains.
- Both compiled packages contain all 13 shared web files byte-for-byte, including
  the model and six runtime/loader files.
- Xcode **26.6 / 17F113**, macOS 26 ARM64, **iPhone 17 Pro / iOS 26.4 simulator**:
  first capture was blank, second showed the actual interface. The Vision
  text guard passed and the downloaded screenshot was manually inspected.
  Console reports WebView loaded; no matching fresh App crash report was found.
- Run 1's green launch produced a blank image; run 2 correctly failed on home
  screen captures. Foreground launch and bounded visible-text retries resolved
  the verification failure without app-code changes. Do not replace this gate
  with a fixed sleep or equate process launch with rendering. Detailed evidence
  and diagnostic-review disposition are in STATUS.
- Although Xcode signing was disabled, the ARM64 linker emitted an ad-hoc
  signature, with no Apple team/identity. This is a simulator build, **not an
  installable iPhone app or signed IPA**.

Downloaded artifacts and screenshot are retained in ignored
`build/artifacts/run-3/`: `GymBroAI-android-debug.apk`,
`GymBroAI-ios-simulator.zip`, `ios-simulator-startup.png`, plus outer ZIPs.
Both outer ZIP digests matched GitHub metadata. APK SHA-256:
`06f11dbc5b80a21a5f366db28983eb5033732a7deccdb0cfb6c55bec07b42e32`.
GitHub artifact IDs: Android `13297429135`, iOS `13298088997`; retention one day.
Never commit the downloads, screenshots, signing files or copied web assets.

Fresh read-only Codex whole-feature review of `f0e9118..eabf55e` found no
significant implementation findings. It independently passed 33 focused cases,
verified both packages' 13 files/configs and APK checksum, and inspected the
visible iOS image. A separate docs audit verified links/imports/guidance; two
stale font/compilation claims and a plan-index label are corrected. Models were
not exposed. No native execution or inference was performed by these reviewers.
Review is resolved; integration verification is pending. See STATUS for limits.

## Limits and continuity

Physical iPhone/Android installation, native file selection/background behavior,
native offline inference, bench accuracy and phone performance remain unverified.
No paid service, Apple enrollment/credentials or store release is authorized.

The next product task is to design the physical-device/video acceptance plan,
iPhone first: establish available phone/OS and Apple signing/build prerequisites,
use the Android test APK where a device is available, and define native MP4
import/inference/cancellation checks with permitted fixtures. This planning task
is not approved yet. Explain why startup alone cannot verify processing, ask
"Is this clear?", and wait before starting it. Keep paid enrollment, signing
credentials and release actions outside that checkpoint's scope.

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
Commit/push green steps; after approved Step 5 resolves fresh review, follow D-019
for fast-forward/push to master and retain the feature branch. No attribution
trailers, force pushes or history rewrites. GitHub's default branch is still
`feat/gymbro-video-landmarks`; manual-dispatch UI requires the workflow on that
default, while feature/master push triggers work. Do not change settings silently.
