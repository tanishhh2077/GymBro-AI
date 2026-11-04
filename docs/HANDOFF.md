# GymBro AI: current handoff

Updated 2026-11-03. Start here in Claude Code or Codex; no prior chat is needed.

## Current work and authorization

Task 6 is the mobile prototype, authorized by D-022: both platforms, iPhone
first, developed from Windows without a MacBook. Read root AGENTS.md, the
[mobile design](superpowers/specs/2026-11-03-mobile-prototype-design.md) and
[Task 6 plan](superpowers/plans/2026-11-03-mobile-prototype.md).

The user confirmed the packaging explanation, then replied "ok cool" to Step 2's
dependency/native-generation understanding checkpoint. Step 2 is implemented
and reviewed. Before Step 3's behavior changes, explain their purpose and
alternative, ask "Is this clear?", and wait. Do not interpret earlier larger-batch
permission as overriding this latest explicit checkpoint workflow.

Current branch: `feat/task6-mobile-app`, based on reviewed master `f0e9118`.
Capacitor 8.6.0, App 8.1.2 and assets 4.0.0 are pinned; Node 22+ is required.
Native iOS/SPM and Android project sources plus first-party dumbbell branding are
generated. `npm run mobile:sync` builds and updates both local copies; it does
not compile native binaries. Scoped AGENTS/CLAUDE/README files cover both native
projects and branding sources. No paid services, signing/enrollment, store
release or device-validation claims are authorized. Simulator output cannot be
installed on a physical iPhone. Real bench accuracy remains unverified.

## Branches and actual implementation

- Task 5 was developed on `feat/task5-elbow-measurements`, based on reviewed
  local/remote `master` at `680201d`. Retain the feature branch and check Git refs
  for the current checkout/master tip. Design review returned "nothing important left". Core
  measurement functions and player timeline are implemented. Forty core tests
  failed first against stubs; nine panel and two player additions failed first
  before wiring. All 287 tests, lint and build pass. Fresh code review found no
  significant findings and independently passed 63 focused cases. The bounded
  feature is complete; D-019's completion flow fast-forwards/pushes master to this
  reviewed feature tip. It does not merge or complete Task 4.
- Tasks 1-3 are implemented/reviewed on master: bounded media engine, one local
  clip, lifecycle/selection errors, timestamped poses, player and overlay.
- Task 4 tooling is separately committed/pushed at `34538e4` on
  `feat/task4-browser-acceptance`. That branch has Playwright/Edge tooling, ten
  passing independent browser cases, a fixture gate and 254 passing total unit/
  component/fixture tests. It is not merged here; this checkout has the reviewed
  236-case baseline plus 51 Task 5 cases, with no Playwright files/dependency.
- No suitable permitted side-view barbell bench recording has been established.
  The user cannot arrange one; do not ask them to record again. Search evidence
  is preserved on the Task 4 branch in `docs/FIXTURE_SEARCH.md`.
- Real bench identity, landmarks/anatomical accuracy, positive overlay alignment,
  60 s worst-case processing, rotated media and physical-phone performance remain
  unverified. Beginning Task 5 does not complete milestone-one acceptance.

## Verification and development

Task 6 environment check: process-local Node 22.23.2 / npm 10.9.8; working-tree
287 tests in ten files, lint and build passed (403 modules). Own existing dev
server 5193 returned HTTP 200; its process uses Node 22.23.2. A separate ignored
`.superpowers/mobile-baseline-20261103` clean install succeeded with 338 packages;
its fresh-source tests (287), lint and build also passed. Fresh read-only Codex
design review found no significant issues (model not exposed); no native build
was run by the reviewer. Step 1 was committed/pushed as `75cda7d`.
Do not change the user's global Node 20 or disturb the older server 5176.
Java 21 is installed, but Android SDK/emulator and Xcode are unavailable locally.
No native compilation, simulator run or physical-device test has occurred.

Step 2 whole tests still pass (287); lint and build/mobile config type-check pass.
Both platform adds, asset generation and subsequent `mobile:sync` exit 0. SHA-256
checks match the local pose model and six WASM runtime/loader files in each native
copy. Both generated configs retain the local identity/webDir with no server
override; copied indexes exist and no Markdown is served. All preexisting locked
package entries are unchanged. Icons and iOS splash were visually inspected.
Native compilation is still unrun. Background handling, safe-area CSS, remote
font removal and packaging guard/tests remain Step 3. Fresh read-only Codex setup
review (`native_setup_review`, model not exposed) found no significant issues
and independently matched all seven assets in both copies. It checked native
references/config/ignores/branding but ran no native compilation. Whole-feature
review still belongs to Step 5.

Baseline after branch creation: `npm install --no-audit --no-fund` succeeded and
removed the three Task 4-only tooling packages. Original baseline: 236 cases.
Task 5 adds 40 core and 11 panel/player cases: **287 total**, ten files.
Lint and build exited 0; build transformed 403 modules with the existing stale
Browserslist warning. Own strict-port dev server 5191 returned HTTP 200 before
feature code. No new dependency was added.

The panel appears below the existing playback controls for completed results.
It shows independent image-space estimates, missing reasons, raw sample identity,
gap-separated traces, and previous/next measured-sample jumps. It owns no extra
media resources/timers. Geometry/component data are synthetic; anatomical/bench
accuracy is not established.

Real Edge 156.0.4314.58 / GPU no-person verification passed: unavailable values,
120 raw samples, paused seek identity, playback, removal and no new egress/errors.
Positive visual checks used an explicitly labeled synthetic component preview,
not seeded app state or inference. At 390x844 and 1280x900, sample navigation,
gap display and layout passed; saved/inspected images contain no human footage.

Own Task 5 server used `127.0.0.1:5191` with `--strictPort`, was stopped and its
port verified free. Earlier server 5176 belongs to an old session; leave it alone.
Stop only your own server. Automated browser checks need their own profile;
never save private-video screenshots/traces or upload user media.

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
