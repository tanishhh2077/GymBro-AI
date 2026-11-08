# GymBro AI

**GymBro AI — Your second set of eyes.**

Workout History supports name/exercise search and inclusive completion-date
filters. Progress offers All time and rolling calendar-month ranges. The active
workout includes an optional inventory-aware plate calculator with editable bar
weight and plate-pair counts. Calculator inputs stay in the current screen.

GymBro AI is being developed as an evidence-backed strength-training video
analysis product, now expanding into personal workout tracking under D-030.
The Home screen gives equal entry to a manual workout log and **one uploaded
side-view barbell bench-press video** for analysis.

The workout log supports per-workout lb/kg, manual exercises/sets/reps/weights,
editing, reload/resume, finished history and explicit deletion. Sets have
Regular/Warm-up labels. Finish opens an elapsed-time, count
and entered-load-volume summary, also available from History. Personal records
use Regular sets. Exercise-specific rest defaults are remembered on the device,
separately for guest and account libraries. Workout records live in
local IndexedDB. Clearing app/browser data removes them. Task25 adds optional
Supabase email-code accounts and explicit manual workout/routine sync after
[service setup](supabase/README.md). An active workout also has a manual rest timer with duration
choices, pause/resume/reset and in-app completion. It stays across screen changes
but resets on reload/restart; no background alert. Saved routines support create,
edit, delete, exercise order and optional set/rep targets. Each routine starts a
fresh workout with no completed sets; editing a routine keeps existing workouts
unchanged. Routines use the same local library, including safe reads of earlier
workout records. Home's View progress opens exercise/unit-specific personal records,
heaviest-load charts and source-linked workout tables. Records use completed
actual sets and update after deletion. A logged bench-press set can open video
analysis and return to that set; the link lasts for the session only and is never
saved. Live analysis remains future work. Accepted Q&A selects
guest access with optional workout-record sync only, excluding videos. Each
account has a separate local library, with explicit guest-copy and conflict
choices. Cloud configuration and real email/device checks are pending. See
[PRODUCT_DIRECTION](docs/PRODUCT_DIRECTION.md).

Home's **Backup and restore** exports saved workouts, routines and the active
workout as a JSON file. Choose a backup to preview additions, then confirm.
Restore skips identical IDs and rejects conflicting versions. Browser export
requests a download. Installed-app export opens the native share sheet and keeps
an OS-managed cache copy available to receiving apps. Physical-phone file flows
still need testing.

The existing browser prototype contains local video selection, MediaPipe pose
estimation, and a skeleton overlay with playback controls. Repetition detection,
depth/tempo findings, persisted AI sessions, and comparisons are not yet
implemented. Real-video acceptance and mobile performance remain to be verified.
The player now includes estimated left/right 2D elbow-angle traces, explicit
unavailable reasons, observation timestamps, and sample navigation. A clip summary
adds per-elbow measurable-sample counts and jumps to lowest/highest observed
angles. Counts describe available samples; extrema can include tracking errors.
These are
image-space measurements, not validated bench biomechanics or technique findings.
The analysis view offers only one side-view bench-press MP4, with recording
guidance and no analysis exercise or camera-angle choices. Manual logging names
do not imply AI support for those lifts. Unused legacy
multi-lift code and score-bearing report types were removed in Task 12.

Processing currently happens on-device using WebAssembly/WebGL. Choosing a local
video does not upload it to a server. An installed mobile app is the intended
release direction. Task 6 now adds Capacitor iOS/Android project sources and
branding, with iPhone first. Android and iOS simulator compilation pass in cloud
CI; [run 5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
also verifies the visible iPhone-simulator interface. Physical-device video
handling is unverified. Optional account services need the setup above. See [iOS](ios/README.md),
[Android](android/README.md) and the [mobile plan](docs/superpowers/plans/2026-11-03-mobile-prototype.md).

## Project context and development

- [Current handoff](docs/HANDOFF.md): start here in Claude Code or Codex; includes the exact test baseline and next task.
- [AGENTS.md](AGENTS.md): working agreements and directory guidance.
- [Original product brief](docs/PRODUCT_BRIEF.md): preserved user requirements.
- [Accepted decisions](docs/DECISIONS.md): later clarifications and deferred work.
- [Current status](docs/STATUS.md): implementation facts, verification limits, and next task.
- [Architecture](docs/ARCHITECTURE.md): existing data flow and intended boundaries.
- [Workflow](docs/WORKFLOW.md): Elephant-Goldfish specification review and critical code review.
- [First-milestone specification](spec.md): proposed scope and acceptance criteria; not implementation approval.
- [Implementation plan](docs/superpowers/plans/2026-11-02-video-landmarks.md): four proposed deliverables, file/interface boundaries, tests, and the real-video acceptance prerequisite.

## Continue in a new session

Work continues in Claude Code or Codex, whichever has more remaining usage; the
Markdown documents are the only handoff, so no chat history or plugin is needed.
`AGENTS.md` holds the shared rules. Codex reads it directly; in Claude Code each
maintained directory's `CLAUDE.md` imports the adjacent rules with `@AGENTS.md`.
Folder READMEs explain responsibilities without duplicating the project context.

Paste this as the first message in either tool:

```text
Read AGENTS.md and docs/HANDOFF.md, then the relevant project instructions.
Explain the next step, why it exists and its alternative, then proceed with
authorized PC work under D-024. Coordinate phone/account/settings actions.
Preserve all existing modified and untracked work.
```

In Claude Code, `/context` lists the loaded instruction files. Instruction-loading
reference: [Claude Code memory documentation](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools).

## Stack

- **Vite + React + TypeScript**
- **@mediapipe/tasks-vision** `PoseLandmarker` — produces normalized landmarks
  for the overlay and inferred world landmarks. These are estimates, not
  measured ground-truth biomechanics. GPU initialization with CPU fallback.
- **Tailwind CSS + Framer Motion** for the animated, dark athletic-tech UI
- **Recharts** for metric visualizations
- **Zustand** for state

## Architecture

The repository layout, per-file responsibilities, and the pose engine's lifecycle
and time contracts are maintained in one place:
[ARCHITECTURE.md](docs/ARCHITECTURE.md#repository-layout). In short, `src/core/`
holds media and pose processing, `src/components/` the React interface,
`src/store/` session state, and `src/types/` shared data contracts.

The pose engine and geometry helpers are separate from React. `src/types/index.ts`
holds only the contracts the app uses; the legacy analyzer, multi-angle report
and score types were removed (D-028). Evidence-backed findings will need their
own designed contract.

## Getting started

Use **Node 22+** (`.nvmrc` pins 22.23.2), required by the pinned Capacitor CLI
and `package.json` engines. On Windows with nvm, select it for the current
session: `$env:PATH = "$env:NVM_HOME\v22.23.2;$env:PATH"`. On macOS/Linux with
nvm, run `nvm use`. Confirm with `node -v` (must print `v22.23.2`).

```bash
npm ci --no-audit --no-fund
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

To verify the project locally:

```bash
npm test -- --maxWorkers=4
npm run lint
npm run build
```

The `--maxWorkers=4` flag limits Vitest worker concurrency to prevent jsdom
timeouts on multi-core systems. `npm run build` runs four TypeScript project
checks (`tsconfig.json`, `tsconfig.mobile.json`, `tsconfig.node.json`, and
`tsconfig.browser.json`) before the Vite production bundle. `npm run lint`
runs ESLint across the repository. The mobile setup also passes the shared
checks on Node 22.23.2. These checks do not establish successful real-video
inference or native compilation. See [current status](docs/STATUS.md).

### Native projects

```sh
npm run mobile:sync
```

This builds the shared app, copies it and the local model/WASM into both native
projects, and verifies bundle identity/integrity; it does not compile an APK or
iOS app. In a fresh clone or worktree, `npm run mobile:sync` must be run before
`npm run mobile:verify` so that the native assets and config are generated.
`npm run mobile:verify` checks existing copies without modifying them.
`npm run build` also type-checks `capacitor.config.ts`, and `vite.config.ts` and
`vitest.config.ts` with Node types only. Playwright's config and browser-test
sources have a separate type-check project with browser and Node types.
The Capacitor config has no
development-server URL.

- `npm run mobile:assets`: regenerate platform icons/splash from the first-party
  [vector source](resources/README.md).
- `npm run mobile:open:ios`: open Xcode on macOS; unavailable on Windows.
- `npm run mobile:open:android`: open an installed Android Studio.

Java 21/Android SDK and macOS/Xcode respectively are needed for native builds.
Cloud builds are verified in the [workflow](.github/workflows/README.md);
download test artifacts from run5 (one-day GitHub retention). Local copies are
retained in ignored `build/artifacts/run-5/`. iOS simulator output cannot run on a
physical iPhone; Apple signing/provisioning remains separate. Native app-state
events now pause attached videos and cancel unfinished processing; completed clips
stay in memory. The layout uses device safe areas, and fonts use local system
fallbacks. Browser tests verify layout/startup; native device behavior and offline
inference still need platform checks.

### Automated tests

The automated test suite currently passes **1,082 tests / 88 files**, lint and
guarded mobile sync. Manual-workout schema/repository/store and App-flow tests
supplement the media tests below. The browser suite additionally checks
synthetic logging, two-tab conflicts, and feature workflows; consult STATUS for
the latest full-browser/hosted/native results.

```bash
npm test -- --maxWorkers=4
```

Vitest runs `src/**/*.test.{ts,tsx}` once using jsdom's simulated browser
objects and the app's existing Vite settings, including the `@` source alias.
It also runs `scripts/**/*.test.mjs` in Node for synthetic packaging fixtures
and `tests/browser/**/*.test.ts` for fixed-pattern integrity checks. Always pass
`--maxWorkers=4` when running the full suite to prevent worker thread saturation
and jsdom timeouts on high-core machines. Task 13
adds 6 fixture-preflight cases to the previous 385 tests. Task 12 adds 2 lift/view metadata cases to Task 11's 383,
which added 2 build-configuration cases to Task 10's 381.
Task 10 added 11 store timing and 4 player badge cases to
Task 9's 366, which added 34 summary-contract, 9 summary-panel and 3 timeline
integration cases to the previous320. That baseline includes 10 native lifecycle,
2 App integration and 21 package guard cases plus the preceding287:
40 elbow-measurement, 9 timeline component,
58 media-helper cases, 55 pose-engine contract cases, 22
selection-check cases, 12 session-store cases, 11 dropzone component cases, and
56 pure display-calculation cases, 10 overlay cases, and 14 player cases.
See [current status](docs/STATUS.md) for exact results. The canvas uses bounded
display sampling and video-content geometry. Player tests cover seeks, playback
failures, source replacement, leases, and accessible control state. These simulated
checks do not establish actual browser alignment or bench-press landmark accuracy.
Metadata-helper tests cover already-available details, event-driven loading,
unknown-duration recovery, invalid loaded values, one deadline under repeated
events, cancellation, media errors, and listener cleanup on terminal paths.
Seek-helper tests also cover already-current frames, seek completion versus
frame readiness, browser-reported times, failures, and resource cleanup.
Unknown-duration tests cover a single recovery attempt, original-position
restoration, one shared deadline, cancellation, and cleanup. Success confirms
restoration has finished. Failure requests restoration best-effort and returns
promptly; the caller still owns the underlying video's teardown.
Engine tests cover metadata limits before model loading, one shared
initialization budget with GPU-to-CPU fallback, late-model disposal, busy
rejection, seek and total deadlines, cancellation, forward-only sample times, and
copied, validated landmarks. The engine uses the `src/core/video.ts` helpers.
Store tests drive the real engine with a mocked SDK and cover one-clip admission,
selection rejection before any URL is created, cancellation on removal/reset,
blocked admission until cleanup, ignored late callbacks, no-pose versus typed
failure, and URL leases revoked exactly once.
An empty suite exits 1 rather than appearing to pass.
jsdom does not decode real videos or establish MediaPipe inference accuracy.

For repeatable real-decoder/no-person browser checks:

```sh
npx playwright install chromium
npm run test:browser
```

This uses fixed first-party black patterns, the actual local model/runtime and
an owned loopback development server on port 4179 (ensure port 4179 is free
before starting). On Linux, install system browser dependencies with
`npx playwright install --with-deps chromium`. See
[browser setup and limits](tests/browser/README.md). No human footage or
captures enter this suite. Phone/native and real-bench acceptance remain
separate; check STATUS for actual results.

### Model & WASM assets

The MediaPipe pose model and vision WASM runtime are vendored under `public/`
so the app has **no runtime dependency on any third-party CDN**:

- `public/models/pose_landmarker_full.task`
- `public/wasm/*`

`@mediapipe/tasks-vision` is pinned to exactly **0.10.35**, and the six files in
`public/wasm/` are byte-identical to that package's `wasm/` folder (checked
2026-11-02). To upgrade, change the pinned version, reinstall, and refresh the
runtime copy in the same reviewed change:

```bash
# from the project root (bash / PowerShell)
cp node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/
# or Windows cmd:
# copy node_modules\@mediapipe\tasks-vision\wasm\* public\wasm\
```

Vite publishes everything in `public/` unchanged, so that folder holds no
Markdown; its rules are in [AGENTS.md](AGENTS.md#static-files-in-public).

## Privacy

The inspected processing path keeps selected videos on the device. When configured,
optional Supabase accounts send email authentication requests. Confirm sync
transfers validated manual workout records and routines to that account's database
row. Guest logging works without configuration. Sessions use the SDK's browser
storage, and account libraries remain cached locally after sign-out. Fonts, the
pose model and its runtime load locally. Hosted email delivery and physical-device
sync require separate verification. See [account setup](supabase/README.md).

## Build status

The first milestone is partly implemented in the prototype and has not yet
passed real-video acceptance. Documentation and specification review come first.

1. Establish a reproducible environment and verify one real bench-press clip with an
   aligned overlay, bounded failures, input validation, and appropriate tests.
2. Evaluate that workflow on a real phone using a small mobile prototype.
3. Build reliable bench-press repetition detection and evidence-backed measurements
   in separately specified, evaluated increments.
4. Add saved sessions and comparisons when their requirements are established.

Other lifts, additional views, and multi-camera fusion remain outside the initial
scope. No accuracy scores, benchmark results, or production-readiness claims have
been established.
