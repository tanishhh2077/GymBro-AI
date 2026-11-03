# GymBro AI Video-to-Landmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this proposal task-by-task in the current teaching workflow. Use superpowers:subagent-driven-development only if a later user instruction selects it. Steps use checkboxes; none is complete merely because this plan exists.

**Goal:** Process one real side-view bench-press video locally and show estimated landmarks aligned with playback, with bounded input handling and honest failure/missing-data behavior.

**Architecture:** Reuse React, the pose engine, Zustand, and the existing player/overlay. Separate media waits, processing policy, session ownership, and display sampling so their failures can be tested without pretending that mocked inference establishes accuracy. The proposed ownership change is one detector per processing job, closed afterward; this avoids cross-clip tracker state, with initialization cost measured rather than assumed acceptable.

**Tech Stack:** Existing React/TypeScript/Vite/MediaPipe; proposed Vitest 4.1.12 + jsdom 29.1.1 for controlled tests, Playwright Test 1.64.1 + installed Microsoft Edge for real-media tests, and @types/node 20.19.43 for tooling/test support. No new backend, mobile framework, paid API, or production analysis library.

**Spec:** [Root milestone specification](../../../spec.md), interpreted with the [original brief](../../PRODUCT_BRIEF.md), [accepted decisions](../../DECISIONS.md), and [Goldfish review](../../GOLDFISH_REVIEW.md).

**Status:** Execution approved on 2026-11-02 by [D-013](../../DECISIONS.md#d-013-execute-the-reviewed-first-milestone-plan); [D-014](../../DECISIONS.md#d-014-first-supported-exercise-is-bench-press) changes the first exercise to bench press. A fresh review of that specification revision is pending. Checkboxes track actual work, not approval alone.

## Global constraints

- Product/brand: **GymBro AI**; package: `gym-bro-ai`; tagline: **Your second set of eyes.**
- One locally selected side-view barbell bench-press clip, one target lifter; frame the shoulders, elbows, wrists and bar movement. No other lift/view selection, automatic exercise/view certification, or implied bar tracking.
- No repetitions, phases, joint-angle/depth/tempo findings, numeric form scores, persistence, accounts, backend uploads, mobile scaffold, or training in this milestone.
- Preserve the original brief, historical review, unrelated uncommitted work, and existing model/runtime assets. No attribution trailers in commits.
- Before each meaningful implementation step, explain what/why/alternative, ask "Is this clear?", and wait. This document does not bypass those checkpoints.
- The existing development baseline passes lint/build on Node 20.20.2 / npm 10.8.2. Start the development server before feature code and rerun relevant checks after changes.
- Proposed pilot bounds copied from the spec: one clip/job; MP4 decodable by the browser, H.264 MP4 as the acceptance fixture; 100 MiB (104,857,600 bytes); finite positive duration up to 60 seconds; positive dimensions, long edge <=1920 and total pixels <=2,073,600; target sampling 30 observations/second.
- Proposed wait budgets: metadata 10,000 ms; model initialization 60,000 ms; each seek/frame-ready wait 10,000 ms; total processing 300,000 ms. They are failure bounds, not measured latency.
- Preserve detector configuration: one pose; detection/presence/tracking settings 0.5; no segmentation masks. Retain the existing display visibility floor 0.3 as a named heuristic, not calibrated correctness confidence.
- Overlay interpolation: adjacent detected samples only, separation <=2/targetFps; endpoint hold <=1/targetFps; never bridge a missing observation. Unknown visibility is not full confidence.
- The user accepted these specification-author bounds as **initial configurable pilot guardrails** with the plan. They are not validated scientific thresholds or measured performance requirements.
- Raw observations, display interpolation, measurements, and interpretations are distinct. Record video-time sample positions; do not claim exact source presentation timestamps, original FPS, or validated variable-frame-rate precision.
- No video/image/pose egress to new services. Keep private fixtures outside Git; no automatic screenshots, trace recordings, or video artifacts containing private footage.
- Proposed execution: coordinator implements in this session with a fresh critical reviewer after each task. Do not parallelize tasks sharing interfaces. If committing reviewed work, stage only its intended paths; never stage the whole preexisting working tree.

## Review focus

1. The first seek targets the already-current position zero: a drawable frame must resolve without waiting forever for a nonexistent `seeked` event. Task 1 tests it.
2. Decoder sampling repeats or moves backward: retained observations stay unique/ordered and use media time, not fabricated source timestamps. Task 1 tests it.
3. Remove/reset occurs during initialization and the user selects again: old callbacks cannot update a replacement, and cleanup must precede the next admitted job. Task 2 tests it.
4. A detection gap, unknown visibility, or a letterboxed/portrait resize occurs: no stale skeleton or incorrect projection should be displayed. Task 3 tests it.
5. An MP4 cannot decode, playback is rejected, or a permitted fixture is unavailable: provide actionable failure instead of hanging or reporting a mocked success. Tasks 2-4 test these paths.

## File map and dependency order

| Task | Files and responsibility |
| --- | --- |
| 1 | New `src/core/processingLimits.ts`, `processingErrors.ts`, `video.ts`, `video.test.ts`, `PoseEngine.test.ts`; modify `PoseEngine.ts` and `src/types/index.ts`; add `vitest.config.ts`, test script/dependencies and artifact ignores. Bounded extraction API and its test setup. |
| 2 | New `src/core/clipPolicy.ts`, `clipPolicy.test.ts`, `src/store/useSessionStore.test.ts`, `src/components/ClipDropzone.test.tsx`; modify store, App, ClipDropzone, VideoStage and shared types. Safe one-clip user workflow. |
| 3 | New `src/components/poseDisplay.ts`, `poseDisplay.test.ts`, `SkeletonOverlay.test.tsx`, `VideoStage.test.tsx`; modify overlay/player. Honest time sampling, projection and controls. |
| 4 | New `playwright.config.ts`, `tests/e2e/video-analysis.spec.ts`, `tests/e2e/input-validation.spec.ts`, `tests/fixtures/README.md`, and a permitted-fixture manifest; add scoped AGENTS files in `tests/`, `tests/e2e/`, `tests/fixtures/`. Real-browser verification and handoff. |

Tasks run 1 -> 2 -> 3 -> 4. Test files are colocated with the code they verify. Update README/root commands/status as functionality becomes real; do not announce future test scripts as available early. No source file is created as part of this planning step.

## Task 1: Bounded, testable pose extraction

**Files:** Create the Task 1 files above; modify `package.json`, `package-lock.json`, `.gitignore`, `README.md`, and root `AGENTS.md` only for the actual test commands. Reuse existing source/local instructions.

**Interfaces:**
- `processingLimits.ts`: export `ProcessingLimits` and `M1_LIMITS: Readonly<ProcessingLimits>` with exactly the proposed bounds/budgets above, named `maxFileBytes`, `maxDurationSeconds`, `maxLongEdge`, `maxPixels`, `targetFps`, `metadataTimeoutMs`, `initializationTimeoutMs`, `seekTimeoutMs`, `totalTimeoutMs`.
- `src/types/index.ts`: export `ProcessingStage = 'metadata' | 'initialization' | 'seek' | 'processing'` and `ProcessingFailureKind = 'init' | 'video-load' | 'no-duration' | 'aborted' | 'detect' | 'timeout' | 'busy' | 'validation'`.
- `processingErrors.ts`: export `PoseEngineError(message: string, kind: ProcessingFailureKind = 'detect', stage?: ProcessingStage)` as an Error subclass with readonly kind/stage fields. Re-export it from `PoseEngine.ts` to preserve the existing import path; avoid a video-helper/engine circular import.
- `video.ts`: export `VideoMetadata { duration: number; width: number; height: number }`, `MediaWaitOptions { signal?: AbortSignal; timeoutMs: number }`, `readVideoMetadata(video: HTMLVideoElement, options: MediaWaitOptions): Promise<VideoMetadata>`, and `seekToFrame(video: HTMLVideoElement, time: number, options: MediaWaitOptions): Promise<void>`.
- Preserve `PoseEngine.processVideo(video, options): Promise<PoseResult>` and existing options. Add optional `limits?: Readonly<ProcessingLimits>`. `init(options?: MediaWaitOptions): Promise<void>` supports the bounded initialization path; `close(): void` remains idempotent.

- [x] **Step 1 — Fold test setup into this deliverable.** After its teaching checkpoint, run `npm install --save-dev vitest@4.1.12 jsdom@29.1.1 @types/node@20.19.43 --no-audit --no-fund`, inspect the lock diff, and add `test: "vitest run"`. Create `vitest.config.ts` using `mergeConfig` with the existing Vite config, `environment: 'jsdom'`, and `include: ['src/**/*.test.{ts,tsx}']`; browser tests are excluded. Do not upgrade existing runtime packages or activate the unrelated configuration-type-check task. Add `.vitest/` to generated-artifact ignores.
- [x] **Step 2 — Write failing media-wait tests in `video.test.ts`.** Use fake timers and controlled HTML video properties/events; no fake test claims real decoding. Cover already-loaded metadata, never-loaded metadata, error, unknown/infinite duration, abort, same-position seek, late `seeked`, zero dimensions, and listener/timer cleanup. Attach rejection assertions before advancing fake timers.

```ts
const video = document.createElement('video');
Object.defineProperties(video, {
  currentTime: { value: 0, writable: true }, readyState: { value: 2 },
  videoWidth: { value: 320 }, videoHeight: { value: 240 },
});
await expect(seekToFrame(video, 0, { timeoutMs: 10_000 })).resolves.toBeUndefined();
// In a separate never-loaded test:
const outcome = expect(readVideoMetadata(document.createElement('video'), {
  timeoutMs: 10_000,
})).rejects.toMatchObject({ kind: 'timeout', stage: 'metadata' });
await vi.advanceTimersByTimeAsync(10_000);
await outcome;
```

- [x] **Step 3 — Verify the failure.** Run `npm test -- src/core/video.test.ts`. Expect failure from the missing helper or its demonstrated wait behavior, not a broken test environment. Then implement the helpers: immediate ready-state paths, finite metadata resolution, one deadline per whole metadata stage, actual drawable-frame checks, and cleanup on every terminal path. Seeking to zero must not depend on receiving another seek event.
- [x] **Step 4 — Write failing engine tests in `PoseEngine.test.ts`.** Mock MediaPipe initialization/output, not production analysis data. Name/assert cases: `rejects metadata bounds before initializing detector`; `shares one 60000ms budget across GPU/CPU initialization`; `aborts initialization and closes a late detector`; `times out seek and total processing`; `rejects concurrent processing on one engine`; `retains actual ordered unique sample times`; `snapshots returned landmarks rather than retaining mutable SDK arrays`; `keeps no-pose samples null`; `preserves unknown visibility`; `closes resources after success/failure/abort`. Boundary assertions include duration 60 accepted/>60 rejected, 1920x1080 and 1080x1920 accepted, over-long-edge/over-pixel/zero dimensions rejected.
- [x] **Step 5 — Verify failure, then implement the engine contract.** Run `npm test -- src/core/PoseEngine.test.ts` and observe the intended failures. Validate metadata before model initialization. Bound the full operation at 300,000 ms; retain GPU->CPU fallback inside the single initialization budget. Guard against overlapping calls and reset detector/tracker ownership between processing jobs. Close initialized resources in terminal cleanup; if an uncancellable SDK initialization resolves late, dispose of its detector instead of assigning it to a cancelled/closed owner. Consume late rejections as well. Do not claim to preempt a running synchronous `detectForVideo` call.
- [x] **Step 6 — Pin time and observation behavior.** Tests must feed repeated/backward/nonfinite media times. Retain a sample only after forward progress; reject invalid/out-of-range time, skip repeated/backward positions, and never invent stored video time. Keep detector sequencing separate when millisecond rounding needs adjustment. Return an explicit detection error for malformed/nonfinite required landmark coordinates rather than replacing them with zeros; legitimate no-detection output stays null. Copy retained coordinate objects. Finite out-of-image estimates must not be clamped into apparently valid raw observations.
- [x] **Step 7 — Verify the deliverable.** Run `npm test -- src/core/video.test.ts src/core/PoseEngine.test.ts`, `npm run lint`, and `npm run build`; expect exit 0. The old store's separate metadata wait is still replaced in Task 2, so do not claim the full app cancellation path is complete yet.
- [x] **Step 8 — Fresh review and handoff.** Review this task against M1-04/M1-07/M1-09/M1-12, resolve blocking findings, and record actual results/limits in STATUS. Mocked detector results prove lifecycle/contract behavior only. No real-video accuracy result is established.

## Task 2: One supported clip, safe ownership, truthful UI

**Files:** Create Task 2 files from the map; modify `src/store/useSessionStore.ts`, `src/App.tsx`, `src/components/ClipDropzone.tsx`, `VideoStage.tsx`, and `src/types/index.ts`.

**Interfaces:**
- `clipPolicy.ts`: export `FileInfo = Pick<File, 'name' | 'size' | 'type'>`, `SelectionIssue { code: 'file-count' | 'empty' | 'format' | 'size' | 'busy'; message: string }`, and `validateSelection(files: readonly FileInfo[], limits?: Readonly<ProcessingLimits>): SelectionIssue | null`.
- Selection accepts exactly one positive-size `.mp4` (case-insensitive) up to 104,857,600 bytes. Filename/MIME are hints, not codec proof; unknown MIME is not sufficient grounds to reject a decodable MP4. Task 1's decoded metadata/frame checks are authoritative before model work.
- Store exports the existing `useSessionStore` hook, with `exercise: 'bench'`, `clips: Clip[]` of length <=1, `processingState: 'idle' | 'processing' | 'cancelling'`, `engineDelegate: PoseDelegate | null`, `startClip(file: File): SelectionIssue | null`, `removeClip(id: string): void`, `reset(): void`, and `retainClipMedia(id: string): () => void`. `startClip` returns the admission result immediately; its private asynchronous job must catch and classify failures.
- `retainClipMedia` acquires a visible-consumer lease and returns its idempotent release. VideoStage receives it as required prop `retainMedia: (id: string) => () => void`, retains in its effect, and detaches/pauses its visible video before releasing on cleanup. The store retires removed media and revokes its URL only after decoder cleanup and all view leases finish. React StrictMode effect cleanup must not revoke a still-live clip; removing a clip before any view mounts must also release it safely.
- Add `'no-pose'` to `ClipStatus` and optional `Clip.errorKind?: ProcessingFailureKind`. No-pose output is a completed observation result with honest feedback, not a failed-form judgment.
- `ClipDropzone` props become `onSelect(file: File): SelectionIssue | null` and `disabled?: boolean`. Errors use an accessible alert. Remove the user-facing camera selector; App uses the fixed bench-press/side-view workflow.

- [x] **Step 1 — Write failing selection tests in `clipPolicy.test.ts`.** Test zero/multiple files, zero bytes, non-MP4, case-insensitive extension, opaque MIME, exact byte boundary, and one byte above it. Use lightweight FileInfo objects; do not allocate 100 MiB just to test the size boundary.

```ts
expect(validateSelection([])?.code).toBe('file-count');
expect(validateSelection([{ name: 'set.MP4', size: 104_857_600, type: '' }])).toBeNull();
expect(validateSelection([{ name: 'set.mp4', size: 104_857_601, type: 'video/mp4' }])?.code).toBe('size');
expect(validateSelection([{ name: 'set.webm', size: 10, type: 'video/webm' }])?.code).toBe('format');
```

- [x] **Step 2 — Observe failure, then implement selection policy.** Run `npm test -- src/core/clipPolicy.test.ts`. Implement the exact gate/messages without implying extension validates contents. Both the component and store use this gate; invalid selection must not allocate a URL, decode, or initialize a detector.
- [x] **Step 3 — Write failing store tests in `useSessionStore.test.ts`.** Control engine promises/progress and video/URL APIs. Assert rejection of a second clip/job; fixed bench/side/upload identity; metadata validation before model work via Task 1 integration; remove/reset abort; no old progress/result/delegate update after replacement; one actual detector disposal and URL revocation per owner; no next admission until cleanup; no-pose versus typed error behavior; successful cleanup after a failure permits a later clip. Include initialization-abort followed by late completion, retirement while a view lease remains, removal before any view mounts, and StrictMode-style retain/release/retain. Repeated calls to idempotent engine close are allowed; the detector must not be disposed twice.
- [x] **Step 4 — Observe failure, then implement job ownership.** Run the store test file first. Replace App's separate add/process calls with `startClip`. Use a fresh PoseEngine and AbortController per admitted job plus an operation token. Removing immediately clears its visible clip and aborts, but keeps admission blocked as `cancelling` until decoder cleanup and retired view leases settle. Cleanup includes installed late-initialization disposal guards; do not wait forever for an SDK promise that cannot be cancelled. Fresh per-job ownership prevents that promise from becoming a replacement job's tracker. Close ready resources, detach hidden video, and revoke only after all consumers release. Guard every state update, including `engineDelegate`, by ownership.
- [x] **Step 5 — Remove competing orchestration.** Delete the store's old `waitForMetadata` path; the bounded engine now owns decoding/readiness and metadata bounds. Remove the unused singleton accessor only after updating every consumer (`rg getPoseEngine src`). Preserve display URLs until their visible consumers unmount, then revoke. `reset` leaves the fixed exercise ready for the next admission.
- [x] **Step 6 — Test and implement the visible supported workflow.** Add `ClipDropzone.test.tsx` using ReactDOM `createRoot`/`act` in jsdom: invalid/multiple/drop input shows a named alert, disabled admission blocks keyboard/input/drop handlers, and valid input delegates exactly once. Update App to show Bench Press / Side View, upper-body framing guidance, and the existing bench accent without exercise/view choices. Remove coach-grade, bar-tracking and unimplemented measurement claims. Keep GymBro AI/tagline; don't remove future library/types merely because they are not exposed. Update VideoStage to distinguish no-pose feedback from processing failure and allow the valid original clip to be replayed without pretending pose availability certifies its quality.
- [x] **Step 7 — Verify.** Run `npm test -- src/core/clipPolicy.test.ts src/store/useSessionStore.test.ts src/components/ClipDropzone.test.tsx`, then all unit tests, lint, and build; expect exit 0. Manually verify the supported input instructions and remove/reselect flow with the dev server; report actual limitations until Task 4 real-media acceptance.
- [x] **Step 8 — Fresh review and handoff.** Review M1-02/M1-03/M1-08/M1-09/M1-10. Pay particular attention to teardown ordering and rejected/deferred callbacks; record results before starting overlay changes.

## Task 3: Honest overlay sampling and playback

**Files:** Create the Task 3 files in the map; modify `SkeletonOverlay.tsx` and `VideoStage.tsx`. No new charting or measurement layer.

**Interfaces:**
- `poseDisplay.ts`: export `DisplayPose { landmarks: NormalizedLandmark[]; sampleTime: number; interpolated: boolean }`, `samplePose(frames: readonly PoseFrame[], time: number, targetFps: number): DisplayPose | null`, `isDrawableLandmark(point: NormalizedLandmark | undefined, minVisibility: number): boolean`, `Rect { x: number; y: number; width: number; height: number }`, and `videoContentRect(sourceWidth: number, sourceHeight: number, boxWidth: number, boxHeight: number): Rect | null`.
- `samplePose` follows the spec's exact-null, adjacent-valid-only, <=2/fps gap and <=1/fps endpoint rules. `sampleTime` is the requested video time for interpolation, otherwise the retained sample's actual time. Interpolation visibility is the minimum of both known endpoint visibilities; unknown remains unknown. Its output is display-only and never written back as a raw observation.
- `isDrawableLandmark` rejects nonfinite/out-of-image x/y and unknown/nonfinite/below-floor visibility without modifying observations. Retain floor 0.3, explicitly heuristic.
- `videoContentRect` computes centered `object-fit: contain` content in CSS pixels; zero/nonfinite dimensions yield null. VideoStage pins that fit mode. Overlay canvas position follows the video element's box, not a padded/min-height parent; device-pixel ratio is applied exactly once.

- [x] **Step 1 — Write failing pure display tests.** In `poseDisplay.test.ts`, test exact missing sample, missing neighbor, gap beyond 2/30, just-within/at boundary, endpoint beyond 1/30, invalid targetFps, unknown visibility, NaN/out-of-image coordinates, and landscape/portrait letterboxing. Build explicit small PoseFrame arrays in this test file; no hidden fixture factory is required by the plan.

```ts
expect(isDrawableLandmark({ x: .5, y: .5, z: 0 }, .3)).toBe(false);
expect(isDrawableLandmark({ x: .5, y: .5, z: 0, visibility: .3 }, .3)).toBe(true);
expect(videoContentRect(1600, 900, 80, 140)).toEqual({ x: 0, y: 47.5, width: 80, height: 45 });
const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1 }));
const frames: PoseFrame[] = [
  { index: 0, time: 0, landmarks, worldLandmarks: null },
  { index: 1, time: .1, landmarks, worldLandmarks: null },
];
expect(samplePose(frames, .05, 30)).toBeNull(); // .1 > 2/30: no bridge.
```

- [x] **Step 2 — Observe failure, then implement the helpers.** Run `npm test -- src/components/poseDisplay.test.ts`. Use explicit video times and named tolerances; never infer source FPS or replace missing data with zeros/neighbor carry-forward.
- [ ] **Step 3 — Write failing integration-level display tests.** `SkeletonOverlay.test.tsx` captures canvas calls with controlled video/DOM rectangles: normalized (.25,.25) in the 80x140 example must draw at CSS (20,58.75), including DPR=2 without double scaling. Exact-null/gap/reset clears the canvas; paused seeking refreshes. `VideoStage.test.tsx` asserts accessible seek/removal controls, no-pose replay/feedback, and that a rejected play/restart promise shows actionable feedback without unhandled rejection. Use ReactDOM act, unmount cleanup, and a test-local React act environment flag; no extra component-test framework is required.
- [ ] **Step 4 — Observe failures, then wire the display.** Run those files first. Replace the existing neighbor-substitution sampler, apply real video-content geometry on resize/orientation/clip change, and cancel animation/listener ownership on unmount. Keep playback/scrub state synchronized after seeks, restart and speed changes. Label pose coverage as sampled detection, not a form score; if target FPS is shown, call it sampling rate. Do not add production debug controls for tests.
- [ ] **Step 5 — Verify.** Run all unit tests, lint, build. Expect exit 0 and no retained callback/timer leaks in controlled tests. The canvas call assertions are not proof of real pose accuracy or every browser layout; Task 4 checks actual media/rendering behavior.
- [ ] **Step 6 — Fresh review and handoff.** Review M1-05/M1-06 plus playback errors/accessibility. Verify all drawing assumptions and missing-data limits are explicit before real-video acceptance.

## Task 4: Permitted real-video acceptance

**Files:** Create Task 4 files from the map and scoped test guidance; modify package scripts/lockfile, `.gitignore`, README and STATUS. At this task run `npm install --save-dev @playwright/test@1.64.1 --no-audit --no-fund`. Add `test:e2e: "playwright test"`; ignore `test-results/` and `playwright-report/`.

**Interfaces and fixture gate:**
- `tests/fixtures/manifest.json` records fixture ID, SHA-256, container/codec, duration, dimensions/orientation, source/permission or license, redistribution status, and three manually inspected in-range `referenceTimesSeconds` where the lifter is visible. Do not invent these values or treat them as biomechanical ground truth.
- `GYMBRO_E2E_VIDEO` supplies a permitted fixture path; no tracked absolute personal path. Licensed public footage may be obtained and converted to H.264 MP4 with source/attribution/changes recorded. Require real side-view bench-press footage, ideally short enough for routine checks; inspect framing before accepting a candidate.
- `npm run test:e2e` must fail with a clear setup message if permission/provenance/path/hash is missing. Do not silently skip or substitute fake landmarks. Unit tests remain runnable without this fixture. Missing footage blocks acceptance, not writing or testing earlier implementation.
- `playwright.config.ts`: single worker, Chromium project with `channel: 'msedge'`, separate automated profile, `webServer.command: 'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort'`, matching URL/baseURL `http://127.0.0.1:4179`, `reuseExistingServer: false`, and default per-test timeout 360,000 ms. A test completing two full processing jobs gets 720,000 ms explicitly. Trace/video/screenshot capture is off. Fail clearly on a port conflict rather than attaching to another project. Use installed Edge for H.264 support and record its version; its presence on this machine has been checked, but no browser run has yet been performed.

- [ ] **Step 1 — Establish the fixture explicitly.** Ask the user for an available permitted recording at this task's understanding checkpoint. Inspect metadata/permission and compute its checksum; populate the manifest. Do not download personal gym footage or claim a model result before processing it. Record a blocked task if this prerequisite is unavailable.
- [ ] **Step 2 — Add browser setup and failing UI checks.** Create scoped AGENTS files, install the proposed Playwright package, configure the server/profile/privacy settings, and write `input-validation.spec.ts`. Cases: zero-byte or renamed invalid MP4, multiple selection, admission disabled while loaded/cleaning up, keyboard/removal controls, readable validation/decode failure. Reproduce a chosen failure before adjusting code; keep fixes in their owning earlier modules and rerun affected tests/review when required.
- [ ] **Step 3 — Write actual inference acceptance in `video-analysis.spec.ts`.** Select the fixture through the real UI; do not mock MediaPipe or asset requests. Wait for a terminal processing state within the pipeline/test budgets. Read existing Zustand state via a test-only dynamic import through the development server, not a production global/debug API. Assert actual nonempty pose observations, copied finite coordinates, ordered unique in-range times, truthful coverage, and no misleading measurement claims.
- [ ] **Step 4 — Verify actual synchronization.** At the manifest's three inspected times, seek backward/forward and while paused, restart, change speed, and resize landscape/portrait viewports. Assert the overlay's chosen sample agrees with media time and its canvas draws near the projected observed joints; read numeric canvas/DOM results locally rather than capturing private video artifacts. Log manual anatomical-alignment observations separately with timestamps; structural tests do not establish accuracy. Record the fixture's actual source orientation: resizing a viewport is not a test of rotated/portrait source metadata. Add a permitted alternate-orientation clip when available or mark it untested. A fixture not yielding useful poses requires investigation, not relaxed assertions or invented confidence.
- [ ] **Step 5 — Verify failures and local processing.** Run zero-pose controlled tests; include a permitted real no-person clip when available and label whether that real case was run. During the real fixture path inspect requests for user-media/pose transfer, unexpected origins, and write methods. Distinguish bundled asset/font requests from video transfer; block external fonts in the automated test if needed for repeatability. Exercise cancel/remove and repeated selection on actual media. State that this observes one workflow, not every possible privacy/security property.
- [ ] **Step 6 — Run final checks.** `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` must all exit 0 for full milestone acceptance. Confirm a fresh-copy `npm ci --no-audit --no-fund` supplies the final tools, then run the documented checks there with the same explicitly configured fixture/browser prerequisites. A missing fixture/browser or failed check is reported as incomplete; never label a mocked run as acceptance.
- [ ] **Step 7 — Review and hand off.** Obtain a fresh critical code review against the whole milestone and resolve acceptance-blocking findings. Record actual machine/browser/model/runtime/delegate, sampling settings, fixture identity, processing elapsed time, verification commands/results, checks not run, limitations and next action. No claimed accuracy/F1 benchmark. Do not start rep counting, persistence, backend work, or a phone scaffold in this task.

## Coverage and self-review

| Spec acceptance | Owning task |
| --- | --- |
| M1-01 reproducible tools | 1 setup; 4 fresh-copy acceptance |
| M1-02 supported workflow/copy | 2; 4 browser checks |
| M1-03 bounded input | 1 metadata; 2 selection; 4 real decode |
| M1-04 actual pose observations | 1 contract; 4 unmocked model |
| M1-05 time/projection alignment | 3; 4 actual rendering |
| M1-06 missingness/visibility | 3 |
| M1-07 settled failure paths | 1; 2 classification; 4 real failure |
| M1-08 removal/cancellation | 1 abort handling; 2 ownership; 4 real workflow |
| M1-09 detector isolation | 1 engine guard; 2 per-job ownership; 4 repeated use |
| M1-10 no-pose feedback | 2 state/UI; 4 controlled case and permitted real case when available |
| M1-11 local video processing | 4 observed request path |
| M1-12 honest handoff | every task; 4 final record |

Self-review performed at plan drafting: acceptance requirements map to owners; interfaces are defined before consumers; all five review-focus classes have explicit tests; test setup belongs to functional tasks; no application bodies or broad infrastructure are prescribed. All checkboxes remain unchecked. Dependencies, fixture, and feature work have not been installed/created/run by writing this plan.

## Compatibility references and implementation discretion

- Proposed versions were inspected through npm metadata on 2026-11-02, not installed. Vitest 4.1.12 accepts Vite 6 and Node 20; jsdom 29.1.1 accepts Node ^20.19.0. Current newer jsdom requires a different runtime. Recheck metadata before installation; a runtime upgrade or different runner is a visible plan revision, not an implicit dependency change.
- [Vitest 4 requirements](https://v4.vitest.dev/guide/migration.html#migrating-to-vitest-4-0) and [Playwright media codecs](https://playwright.dev/docs/browsers#media-codecs) support the proposed test approach. Compatibility is not a security or long-term support certification.
- Builders may choose private helper names, small fake-media implementations, exact phrasing of non-fixed error copy, and internal data structures. They may not change supported scope, public interfaces consumed by later tasks, privacy behavior, or proposed bounds without explaining the revision.
- The user approved execution before Task 1, then changed the first exercise to bench press. Review the amended specification without rewriting its historical review. Approval does not establish fixture suitability or that the milestone works.
