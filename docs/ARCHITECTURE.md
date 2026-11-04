# System architecture

Status: observed implementation plus accepted direction; not a claim of completed MVP behavior. Updated 2026-11-03 for Task 6 native lifecycle and packaging checks.

## Existing implementation

The shared application is React/TypeScript/Vite. Capacitor 8.6.0 now wraps its
build in iOS/Android projects under D-022. Both native wrappers now compile in
cloud CI; run3 also verifies visible iPhone-simulator startup after earlier
blank/home-screen captures exposed weak test readiness. Neither is verified on
physical devices or native video inference.
There is no Python service, database,
account system or persistence layer.

Current data flow:

```text
Local file selection
  -> store admission: validateSelection (one .mp4, at most 100 MiB) and the one-clip/busy gate
  -> browser object URL, leased by the hidden decoder and each visible player
  -> hidden HTML video element owned by one store job (fresh engine, AbortController, job token)
  -> PoseEngine job: bounded metadata read, then duration/dimension validation before any model work
  -> per-job MediaPipe Pose Landmarker (GPU attempted, CPU fallback, one shared initialization budget)
  -> bounded seek to each sample time; detection only when the reported media time moves forward
  -> validated, copied normalized landmarks and inferred world landmarks at actual media time
  -> visible HTML video plus canvas skeleton overlay
```

"Upload" currently means choosing a local file. The inspected processing path
does not send that file to a server. External Google Fonts were removed in Task 6;
system fonts and the local model/runtime make startup self-contained. Browser
startup checks observed no external requests; this is not a general runtime
network/privacy audit or proof of offline inference on a phone.

## Repository layout

```text
AGENTS.md, CLAUDE.md   Shared agent rules; every CLAUDE.md contains only "@AGENTS.md"
README.md              Setup, commands, stack, privacy summary
spec.md                Current milestone contract and acceptance criteria
docs/                  Brief, decisions, handoff, status, architecture, workflow, reviews
docs/superpowers/plans/  Active implementation plan and its progress checkboxes
src/                   Application source (ownership table below)
public/                Files served unchanged: pose model and MediaPipe runtime; no Markdown
ios/, android/         Native Capacitor wrappers; scoped root guidance covers generated subdirectories
resources/             First-party vector branding source for native icons/splash screens
capacitor.config.ts    Native identity, local dist webDir and system-bar configuration
scripts/               Native bundle/model/runtime integrity guard and synthetic filesystem tests
.vscode/               Shared editor guidance only; other editor files are ignored
index.html, *.config.*, tsconfig*.json   Vite, Vitest, ESLint, Tailwind/PostCSS, TypeScript settings
tests/                 Planned in Task 4 for real-browser tests and fixtures; does not exist yet
```

Generated or local-only, and ignored by Git: `node_modules/`, `dist/` (build output), `.vitest/`, `*.tsbuildinfo`, and `.superpowers/` (scratch snapshots and logs from earlier sessions; history, not a source of truth).

Every authored directory except `public/` has an `AGENTS.md` (rules), a `CLAUDE.md` (imports those rules for Claude Code), and a `README.md` (what the directory holds). `public/` is the exception because Vite publishes every file in it; its rules are in the root [AGENTS.md](../AGENTS.md#static-files-in-public). Native top-level guidance covers generated platform subdirectories; do not add Markdown to copied web assets or resource catalogs.

TypeScript configuration: `npm run build` runs `tsc -b` against the root `tsconfig.json`, which checks `src/` with DOM types and the `@/` alias. It then checks `vite.config.ts` and `vitest.config.ts` through `tsconfig.node.json`, which loads Node types only, because those files run in Node when Vite or Vitest starts ([D-027](DECISIONS.md#d-027-type-check-the-build-configuration-files)). `scripts/build-config.test.mjs` fails if either file leaves that check. The unused template `tsconfig.app.json` was deleted.

The build additionally checks `capacitor.config.ts` through
`tsconfig.mobile.json`. `npm run mobile:sync` builds `dist/` and uses Capacitor to
copy/update both native projects and installed plugin references. Copied web
assets, runtime config, builds, caches, local SDK paths and signing files are
ignored. There is no remote development-server URL in the native configuration.
`mobile:sync` now verifies the native copies against `dist/`, local model and
installed MediaPipe runtime, allowing only Capacitor's two exact empty Cordova
compatibility stubs. It checks native bundle IDs/configs, local entrypoints and
obvious forbidden served files; it is not a general secret/network scanner.
Native cloud compilation and visible iOS startup passed in Step 4; its artifacts
are retained locally under ignored `build/artifacts/run-3/`. The macOS Vision
guard recognizes both brand/workflow labels, rejects the splash, and permits
bounded startup retries. It processes only the empty shell, not workout media.

`src/mobile/nativeLifecycle.ts` owns one native app-state listener per App mount,
including handles delivered after cleanup. Native background events pause attached
videos and call the existing store reset only while processing/cancelling. The
store still owns abort, decoder cleanup and delayed URL revocation. Completed
clips remain in memory; foreground events do not resume media or work. Browser
sessions register no native listener. Registration/removal failures are caught
and emit fixed diagnostics without video information; native behavior still needs
device verification. CSS consumes Capacitor's Android safe-area variables or iOS
environment values; MainActivity enables edge-to-edge rendering.

## Current ownership

| Area | Responsibility |
| --- | --- |
| `src/App.tsx` | Page composition: fixed Bench Press / Side view labels, recording guidance, honest scope copy, the dropzone (disabled while a clip is loaded or `processingState` is not `idle`, reading "Releasing the previous clip…" while a removed clip is still being released), and the clip list with a remove/cancel button that moves keyboard focus to the "Add your bench press video" heading |
| `src/components/ClipDropzone.tsx` | `onSelect`/`disabled`/`disabledMessage` props; runs `validateSelection` on chosen or dropped files (so multiple-file drops are rejected), hands one file to `onSelect`, and shows a rejection in a named `role="alert"`; a "Choose video" button is the keyboard path. While mounted it claims file drags anywhere on the page, so the browser never opens a dropped file and unloads the app |
| `src/store/useSessionStore.ts` | `createSessionStore` factory and the app's `useSessionStore`: at most one clip, admission via `validateSelection`, one owned job per clip, `processingState` (`idle`/`processing`/`cancelling`), leased object URLs (see "Session ownership" below), and an injected monotonic clock for the observed `processingMs` (D-026) |
| `src/core/PoseEngine.ts` | One processing job at a time: metadata validation before model work, bounded initialization, per-job detector, sampling, observation validation and copying, progress, coverage, and cleanup |
| `src/core/video.ts` | Bounded metadata reading, one-attempt unknown-duration recovery, and frame-ready seeking on a video element the caller owns |
| `src/core/processingLimits.ts` | `M1_LIMITS`: the spec's input bounds, sampling rate, and time budgets in one frozen object |
| `src/core/processingErrors.ts` | Shared `PoseEngineError` carrying a failure `kind` and processing `stage` |
| `src/core/clipPolicy.ts` | `validateSelection`: the admission check (exactly one non-empty `.mp4`, at most 100 MiB) run before any URL, decoding, or model work; called by the store's `startClip` |
| `src/core/*.test.ts` | Vitest contract tests using simulated media and a mocked MediaPipe SDK |
| `src/components/VideoStage.tsx` | Leased, contain-fit player keyed by clip/source identity; event-synchronized seeking, restart, speed state, guarded play failures, accessible controls, persistent no-pose live region, neutral sampled-detection labels, and an observed processing-time badge when `processingMs` is present |
| `src/components/SkeletonOverlay.tsx` | Uses `poseDisplay` at video time; follows the actual video box, projects into contain content, applies DPR once, clears unavailable data, redraws on paused media/layout events, and owns RAF only during playback |
| `src/components/poseDisplay.ts` | Pure display calculations: exact observations, bounded interpolation/endpoint holds, drawing eligibility, and centered CSS-pixel video content; used by the overlay without modifying raw observations |
| `src/core/landmarks.ts` | Landmark indices, the 33-landmark count, and skeleton topology |
| `src/core/math.ts` | Geometry/signal helpers; `elbowAngles.ts` uses `angleAt` on 2D image-pixel points, and the other helpers have no consumer yet |
| `src/core/exercises.ts` | Display names and accent for the one supported lift and view (Bench Press, Side); no taglines or measurement claims (D-028) |
| `src/types/index.ts` | Shared data shapes, failure kinds/stages; bench/side/upload only, no analysis or score types (D-028) |
| `public/models/`, `public/wasm/` | Bundled pose model and the MediaPipe runtime, byte-identical to the pinned `@mediapipe/tasks-vision` 0.10.35 package |

## Pose engine lifecycle

Task 5 adds `src/core/elbowAngles.ts` as a separate deterministic measurement
layer: versioned image-pixel angle estimates, per-side abstention, real media
times/observation indices, gap-separated lines and measured-sample navigation.
It does not use inferred model z/world coordinates; the legacy score/flag types were removed (D-028).
Its 40 geometry tests are synthetic; real bench/anatomical validity is unverified.
Task9's `src/core/elbowSummary.ts` aggregates that series into per-side sample
availability and earliest raw extrema. `ElbowSummaryPanel.tsx` links extremes to
the same player seek handler. Counts are not confidence or time coverage;
extremes can contain tracking errors and are not per-rep ROM. No smoothing,
new geometry, media ownership or detector behavior is introduced.
`src/components/ElbowTimeline.tsx` now consumes this series for completed clips,
following the player's media-time events and delegating raw-sample jumps to its
existing seek handler. Measurement failures leave video replay/removal usable.
The panel owns no media resources or timers. Its gap-separated SVG traces and
per-side unavailability do not certify a target person or anatomical accuracy.

- Before any work or timer starts, every limit must be a positive finite number and every timeout must fit a browser timer (at most 2,147,483,647 ms); otherwise the call fails with kind `validation`. An invalid value would otherwise disable a bound silently (`duration > NaN` is always false) or fire a timer at once.
- A `processVideo` call is one job. A second call while a job runs (or while `init()` runs) is rejected with kind `busy` and the message "The pose engine is busy with another operation". The job owns an internal `AbortController`; the caller's `signal`, `close()`, and the total deadline all stop it through that controller.
- Order: validate the sampling rate; read metadata (10 s budget) and reject duration over 60 s, long edge over 1920 px, or more than 2,073,600 px with kind `validation`, stage `metadata`; then initialize the model. No runtime or model is loaded for a rejected video.
- Initialization loads the runtime and tries GPU, then CPU, all within one 60 s deadline. The SDK calls cannot be cancelled, so a detector that arrives after cancellation or timeout is closed, and a late rejection is consumed without starting the CPU fallback.
- Each seek has a 10 s budget; the whole call has 300 s, counted from the call's start. Cancellation and deadlines cannot interrupt the synchronous `detectForVideo` call; they take effect when it returns.
- Each job creates its own detector and closes it on success, failure, timeout, and cancellation, so the old detector is closed before the next job creates a new one. Every job therefore pays model-loading time. `init()` optionally prepares one detector ahead of time that only the next job adopts; it is tested but has no current caller. Overlapping `init()` calls are rejected as `busy` rather than shared.
- `close()` is idempotent: it cancels a running job (whose cleanup closes its detector) and closes an unused prepared detector.

## Session ownership

- `startClip(file)` returns a `SelectionIssue` immediately or `null`. It rejects with `busy` while a clip is loaded (in any status) or while `processingState` is not `idle`, then applies `validateSelection` before creating any URL, video, or engine. To choose another clip, the user removes the current one first.
- Each admitted clip gets a fresh `PoseEngine`, `AbortController`, and job object; the job object is the ownership token. Every progress, result, error, and `engineDelegate` update checks that its job still owns the session, so late callbacks from a removed job change nothing.
- Outcomes: `ready` (at least one sampled frame had a pose), `no-pose` (completed, no pose detected; `pose` is kept, `error` is empty), or `error` with `errorKind` from the engine's failure kind.
- Removing a clip (or `reset()`) removes it from the store at once, clears `engineDelegate`, and aborts its job. `processingState` stays `cancelling`, blocking admission, until the job has settled (engine closed, hidden video detached) and every lease on the URL is released; then the URL is revoked exactly once.
- On screen, `App.tsx`'s `AnimatePresence` keeps the removed clip's `VideoStage` mounted, and so holding its lease, until the fade-out animation ends (about 0.3 s observed). Admission therefore reopens only after that animation; changing or removing the animation changes admission timing. In a hidden tab the animation pauses, so `cancelling` lasts until the tab is visible again.
- Leases: the hidden decoder holds one from admission until its job ends; each mounted `VideoStage` holds one through `retainClipMedia`, whose release function is idempotent. A lease on a live clip does not revoke its URL when released, so StrictMode's mount-unmount-mount cycle is safe.

## Data and time contracts

- `PoseFrame.time` is the `currentTime` read back from the browser after each seek, in seconds, rather than a computed value. It is usually the seek target; it is not a decoded frame's presentation timestamp. `index` is the order of retained samples, not a source-frame number.
- Sample requests are at `step / targetFps`. A sample is kept only when the reported position is later than the last kept one; repeated or backward positions are skipped without detection. A non-finite, negative, or beyond-duration position is a `video-load` error.
- The detector clock is separate from media time: integer milliseconds, strictly increasing, bumped by 1 ms when distinct media times round to the same millisecond. It restarts with each job's new detector.
- `PoseResult.fps` records the target sampling rate, not the video's original frame rate.
- Landmarks are copied out of the SDK result. Each pose must have exactly 33 landmarks with finite `x`, `y`, `z`; otherwise the job fails with kind `detect`. Finite off-image coordinates are kept unchanged. If a result omits visibility, the engine leaves it absent; however, the pinned MediaPipe 0.10.35 library itself replaces absent coordinates and visibility with 0 before returning results. A visibility of 0 can therefore mean "no value" as well as a real 0, so display code must not treat 0 as reliably known (Task 3).
- Normalized image coordinates are used for overlays. Inferred world landmarks are model estimates with different units and semantics; do not mix them silently.
- A missing pose is represented by `null`. Missing observations must not be silently converted into successful detections, zero angles, or scientifically supported interpolated evidence.
- Coverage summarizes pose detections over retained samples. It is not a calibrated confidence estimate or a technique score.

## Observed gaps and risks

The engine-level gaps found by earlier inspection (unbounded seek and initialization waits, no concurrency guard, shared detector timestamps, missing duration and dimension bounds) are addressed and covered by mocked contract tests. The 100 MiB file-size bound is enforced by `validateSelection` in the store's `startClip`. The earlier store gaps (an unbounded legacy metadata wait, no cancellation on removal, and a shared engine across clips) are replaced by the session ownership above and covered by mocked store tests. PC decoding/inference on no-person patterns is recorded in STATUS; real bench accuracy and physical-phone behavior remain unverified.

Still open, owned by later tasks:

- Coverage badges now explicitly say sampling target and percentage of sampled positions with a pose, using neutral styling. They do not describe source FPS or technique quality.
- The interface was checked in a real Chromium browser on 2026-11-03 (Task 2 Step 7, recorded in STATUS) with rejected inputs, an undecodable file, and a synthetic decodable clip without a person. No bench-press video has been processed, so overlay alignment and landmark quality remain unverified (Task 4).
- The overlay now preserves missing observations and bounded display gaps through `poseDisplay.ts`. Simulated component tests verify canvas calls and cleanup; real-media timing, anatomical alignment, and actual screen-reader announcements remain unverified (Task 4).
- The UI no longer offers other exercises or views, and its copy describes pose visualization only. Task 12 (D-028) deleted the unrendered `ExercisePicker.tsx` with its lift icons, `App.css` and the unreferenced Vite template assets in `src/assets/` and `public/`. Its Step 3 removed the squat/deadlift and front/45° metadata and the unused analysis types that implied analyzers, view-invariant biomechanics and numeric scores; `Exercise`, `CameraAngle` and `ClipSource` now hold only `bench`, `side` and `upload`. `math.ts` gap filling still has no consumer.

[STATUS.md](STATUS.md) tracks verification evidence for these items.

## Intended boundaries for the first milestone

- File eligibility/metadata validation runs before expensive processing.
- Session orchestration owns one active job, cancellation, stale-result protection, and media cleanup.
- Pose estimation produces observations and descriptive processing metadata. It does not produce bench-press judgments or bar-tracking output.
- Playback/overlay consumes video-relative observations and presents missing/uncertain data honestly.
- Future measurement functions consume explicit observations and output measurements with units and validity. A later findings layer attaches interpretations and supporting evidence.
- A small real-video verification path distinguishes actual inference and alignment from mocked orchestration tests.

Keep analysis logic independent of React. Reuse existing working boundaries instead of migrating stacks solely because a preferred technology was listed in the brief.

## Mobile direction and deferred services

The intended release is an installed mobile app. D-022 authorizes the iOS/Android
Capacitor prototype before full bench acceptance, prioritizing iPhone. Native
compilation and visible iPhone-simulator startup passed in run3; physical-phone
workflow and native video-inference checks remain future gates. Packaging does
not convert browser inference into a native MediaPipe implementation or establish
acceptable performance.

Record the tested device, OS, runtime, model, delegate, clip characteristics, processing time, failure/cancellation behavior, and available resource measurements. Do not choose the processing architecture from an App Store target alone. Prototype evidence determines whether local processing remains suitable or another implementation/service is justified.

Python/NumPy may support evaluation or a later analysis implementation. FastAPI and PostgreSQL remain possible later services for demonstrated needs such as saved sessions. Saving measurements and retaining/uploading raw videos are separate privacy decisions. Do not introduce accounts, object storage, queues, or distributed infrastructure into milestone one.

## Runtime reference sources

These sources establish available platform capabilities, not GymBro AI's measured performance or approval for distribution:

- [MediaPipe Pose Landmarker for iOS](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/ios): native support includes stored videos.
- [MediaPipe Pose Landmarker for Python](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python): a future evaluation/implementation option.
- [Capacitor documentation](https://capacitorjs.com/docs): packaging the existing web application and native device integration.
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality): distribution requires a useful, complete experience; a framework choice does not guarantee review outcomes.
