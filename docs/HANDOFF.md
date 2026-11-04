# GymBro AI: current handoff

Updated 2026-11-03. Start here in Claude Code or Codex; no prior chat is needed.

## Current work and authorization

Task 6 is the mobile prototype, authorized by D-022: both platforms, iPhone
first, developed from Windows without a MacBook. Read root AGENTS.md, the
[mobile design](superpowers/specs/2026-11-03-mobile-prototype-design.md) and
[Task 6 plan](superpowers/plans/2026-11-03-mobile-prototype.md).

The user approved Step 2 with "ok cool", then answered "clear" directly to Step
3's background/layout/offline explanation. Step 3 is implemented and reviewed.
Step 4 (cloud native builds) still needs its teaching checkpoint: explain what,
why and the alternative, ask "Is this clear?", then wait. Do not let earlier
larger-batch permission override the user's latest checkpoint workflow.

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
fallbacks and safe-area CSS are active. Android's edge-to-edge code is uncompiled.

Edge 156.0.4314.58 production startup passed at 390x844, 844x390 and 1280x900:
injected inset padding correct, no horizontal overflow, external requests or
console/page errors. Empty-shell screenshots only; no human footage. These are
browser/CSS checks, not an actual notch, native background or offline-inference
test. Fresh read-only Codex Step 3 review (`mobile_behavior_review`, model not
exposed) found no significant issues and independently passed 100 focused tests
plus mobile verification. Whole-feature review remains Step 5.

Own dev server 5193 remains available. Preview 5194 was stopped and its port
verified free. Leave earlier server 5176 alone. Browser checks use
an isolated profile; never save private-video screenshots or traces. No native
compilation, simulator run or physical-device test has occurred.

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
