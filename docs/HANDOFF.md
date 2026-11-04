# GymBro AI: current handoff

Updated 2026-11-03. Start here in Claude Code or Codex; no prior chat is needed.

## Current work and authorization

Task 6 is the mobile prototype, authorized by D-022: both platforms, iPhone
first, developed from Windows without a MacBook. Read root AGENTS.md, the
[mobile design](superpowers/specs/2026-11-03-mobile-prototype-design.md) and
[Task 6 plan](superpowers/plans/2026-11-03-mobile-prototype.md).

The user approved Step 2 with "ok cool", then answered "clear" directly to Step
3's background/layout/offline explanation. Step 3 is implemented and reviewed.
The user then answered "clear" to Step 4's explanation of GitHub cloud builds:
Android debug APK and an iOS simulator app on a cloud Mac. Step 4 is active.
Preserve the next teaching checkpoint for Step 5's whole-feature review/handoff;
do not treat this as permission for signing or store deployment.

Current branch: `feat/task6-mobile-app`, based on reviewed master `f0e9118`.
Capacitor 8.6.0, App 8.1.2 and assets 4.0.0 are pinned; Node 22+ is required.
Native iOS/SPM and Android project sources plus first-party dumbbell branding are
generated. `npm run mobile:sync` builds, updates and verifies both local copies;
`npm run mobile:verify` checks existing copies without mutation. Neither compiles
native binaries. Scoped AGENTS/CLAUDE/README files cover native projects,
branding, lifecycle and build scripts. No paid services, signing/enrollment, store
release or device-validation claims are authorized. Simulator output cannot be
installed on a physical iPhone. Real bench accuracy remains unverified.

## Branches and actual implementation

- Task 5's elbow measurements/timeline were independently reviewed and merged
  to master `f0e9118`; retain `feat/task5-elbow-measurements`. Its 287-test baseline
  and detailed browser/synthetic evidence are in STATUS. Raw observations,
  image-space estimates and technique findings remain separate.
- Tasks 1-3 are implemented/reviewed on master: bounded media engine, one local
  clip, lifecycle/selection errors, timestamped poses, player and overlay.
- Task 4 tooling is separately committed/pushed at `34538e4` on
  `feat/task4-browser-acceptance`. That branch has Playwright/Edge tooling, ten
  passing independent browser cases, a fixture gate and 254 passing total unit/
  component/fixture tests. It is not merged here. This checkout has no committed
  Playwright dependency/files; don't merge the incomplete task for its tooling.
- No suitable permitted side-view barbell bench recording has been established.
  The user cannot arrange one; do not ask them to record again. Search evidence
  is preserved on the Task 4 branch in `docs/FIXTURE_SEARCH.md`.
- Real bench identity, landmarks/anatomical accuracy, positive overlay alignment,
  60 s worst-case processing, rotated media and physical-phone performance remain
  unverified. Beginning Task 5 does not complete milestone-one acceptance.

## Verification and development

Use process-local Node 22.23.2 / npm 10.9.8; don't change global Node 20. Java 21
exists, but Android SDK/emulator and Xcode are unavailable locally. Step 1's clean
install/baseline was pushed as `75cda7d`; Step 2's native setup as `d2474ce`.
Both fresh read-only reviews found no significant issues (models not exposed).

Current tests: **320 in 13 files** (287 preceding + 10 lifecycle + 2 App
integration + 21 package guards). They pass; lint and guarded sync pass; build checks source and
mobile config, transforming 409 modules with the existing Browserslist warning.
Packaging checks 13 shared web files per native copy, the local model and six
runtime/loader files against the installed package. Exact empty Capacitor stubs
are permitted; stale/extra/forbidden files and remote resources/server overrides
are rejected. See STATUS for red/green and actual command evidence.

Native background events now pause videos and reset only unfinished processing
through the existing store; late listener handles are released. Completed clips
stay in memory and never auto-resume. Google Fonts were removed; system-font
fallbacks and safe-area CSS are active. Android's edge-to-edge code now compiles
in the cloud; device behavior is still unverified.

Edge 156.0.4314.58 production startup passed at 390x844, 844x390 and 1280x900:
injected inset padding correct, no horizontal overflow, external requests or
console/page errors. Empty-shell screenshots only; no human footage. These are
browser/CSS checks, not an actual notch, native background or offline-inference
test. Fresh read-only Codex Step 3 review (`mobile_behavior_review`, model not
exposed) found no significant issues and independently passed 100 focused tests
plus mobile verification. Whole-feature review remains Step 5.

Own dev server 5193 remains available. Preview 5194 was stopped and its port
verified free. Leave earlier server 5176 alone. Browser checks use
an isolated profile; never save private-video screenshots or traces. No physical
device or native real-video test has occurred.

Step 4: `.github/workflows/mobile-builds.yml` is authored and passed actionlint
1.7.12 (official release checksum verified). Fresh read-only Codex workflow
review found no material issues and independently passed package verification;
all 320 local tests/lint/build/guarded sync pass. Workflow commit `b126748` is
pushed; [run 1](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41774153219)
completed with green jobs. Shared checks, Android debug build, Xcode simulator
compilation/package verification and process launch passed. **The downloaded iOS
screenshot is blank**, so rendered-interface acceptance failed despite green CI.
Android artifact `13296546282` is downloaded in ignored `build/artifacts/run-1/`;
ZIP digest matches GitHub metadata; all 13 APK assets independently match local
dist. iOS artifact `13296457592` is also downloaded/hash-verified in that directory
with the simulator ZIP/blank startup PNG. No iOS rendered-UI claim yet.
Shared checks gate Ubuntu24.04
Android/Java21 and macOS26/Xcode simulator builds; native packages must contain
all shared assets. Only explicit prototype/screenshot artifacts, one-day retention,
read-only contents permission, no persisted Git credentials or npm caches.
Both native compilers succeeded; iOS UI startup is unresolved. A diagnostic fix
adds local macOS Vision text recognition (must reject the first-party splash),
bounded actual-screen retries, App console/system logs and selected runtime
reporting. Actionlint passes; Swift helper and readiness changes await macOS CI.
Diagnostic commit `99c7f21` is pushed; [run 2](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41776005380)
passed shared checks/both native compilers and compiled the Swift guard, but
failed the real UI gate: captures showed the simulator home screen, not the app.
Console capture contained only the launched PID, no Capacitor startup messages.
Cause remains unconfirmed. Revised diagnostics now wait for foreground launch,
read unbuffered stdout/stderr from simulator data/tmp, and inspect only fresh
matching App crash reports. Local syntax/checks and review precede another run.
No speculative app-code change. Do not advance Step 5 with unresolved blank UI.
Workflow README covers triggers and artifacts;
manual dispatch UI needs the workflow on the still-old default branch.

## Next product work

The elbow timeline is a completed bounded feature, not completion of M1. Mobile
packaging is now the next requested product increment. Repetition/phase timing
remains future work. Keep development and real bench calibration distinct; do not
fabricate thresholds or validated rep counts.
Task 4 remains available on its own branch and will need the updated master
merged before continuing its browser suite. Do not discard either branch.

One writer; use a fresh read-only reviewer after implementation. Either provider
may implement/review. Record the actual provider/model if exposed. No paid API
workaround for subscription limits. Shared guidance is AGENTS.md, imported by
adjacent CLAUDE.md; preserve all unrelated work and the original PRODUCT_BRIEF.

Use one feature branch per task and commit/push green steps. Before each commit,
run whole tests/lint/build and inspect staged paths. No attribution trailers,
force pushes or history rewrites. Do not merge incomplete Task 4 just to obtain
its tooling; Task 5 can advance independently from the reviewed app baseline.
