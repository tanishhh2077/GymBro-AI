# GymBro AI: current handoff

Updated 2026-11-03. Start here in Claude Code or Codex; no prior chat is required.

## Current direction and working agreement

- GymBro AI: local analysis of one standardized side-view barbell bench-press video.
  First milestone: timestamped estimated body landmarks and synchronized playback.
  Rep counting, bar tracking, form verdicts, backend/storage, and mobile scaffolding
  are outside this milestone. Installed mobile is the later release direction.
- Before each meaningful step: explain what, why, and the obvious alternative;
  ask **"Is this clear?"** and stop until answered. Teach at first/second-year CS level.
- Be candid and evidence-based. Do not invent findings, confidence, test results,
  scientific validation, or agreement. Obtain a fresh critical review after code work.
- Any task, implementation or review, may run in Claude Code or Codex: the user
  picks whichever has more remaining usage ([D-016](DECISIONS.md#d-016-provider-neutral-documentation-first-continuity)).
  These Markdown files are the only handoff. Update every affected document
  before reporting a work chunk done, and record which tool and model did the work.
- Git ([D-018](DECISIONS.md#d-018-regular-commits-and-reviewed-merges-to-master),
  [D-019](DECISIONS.md#d-019-one-branch-per-feature-one-commit-per-step)): one
  branch per plan task (`feat/task<N>-<short-name>`, from `master`), one commit per
  plan step (failing tests travel with the step that makes them pass), push after
  each commit, fast-forward and push `master` after each reviewed task. Never
  force-push, reset, clean, or discard working files, and never add commit
  attribution trailers.

## Repository state

- Local folder: `D:\Programming\summer 2026 projects\GymBro AI`.
- Origin: `https://github.com/tanishhh2077/GymBro-AI.git`. Tasks 1–2 live on
  `feat/gymbro-video-landmarks` (they predate the one-branch-per-task rule).
  Tasks 1–3 are reviewed. The completion flow fast-forwards/pushes `master` to each
  reviewed feature tip. GitHub's default branch was last recorded as the older
  feature branch; its current setting was not rechecked in this step.
- Task 3 was developed on `feat/task3-overlay-playback`, created from `master`.
  Retain that branch. Check `git log`, `git status`, and `git branch -vv` for
  current local/remote pointers rather than assuming an older handoff hash.
- Layout, file responsibilities, and the engine lifecycle are in
  [ARCHITECTURE.md](ARCHITECTURE.md#repository-layout). `public/` deliberately holds
  no Markdown; its rules are in [root AGENTS.md](../AGENTS.md#static-files-in-public).
- A development server from an earlier session listens on `http://127.0.0.1:5176/`
  (seen 2026-11-03, started 2026-11-02); it was not started by this session, so
  leave it alone. Start your own on another port with `--strictPort`, and when you
  stop it, confirm the port is free: stopping the `npm run dev` wrapper on Windows
  can leave the `vite.js` node process running.

## Latest checks (2026-11-03, after Task 3 component wiring)

| Command / suite | Observed result |
| --- | --- |
| Whole `npm test` | **236 passed / 236**, exit 0 |
| `src/core/video.test.ts` | 58 passed |
| `src/core/PoseEngine.test.ts` | 55 passed |
| `src/core/clipPolicy.test.ts` | 22 passed (16 failed first against a placeholder) |
| `src/store/useSessionStore.test.ts` | 12 passed (all 12 failed first: API missing) |
| `src/components/ClipDropzone.test.tsx` | 11 passed (the first 9 failed first against the old component) |
| `src/components/poseDisplay.test.ts` | 56 passed; all 56 failed first against API-only placeholders |
| `src/components/SkeletonOverlay.test.tsx` | 10 passed; all 10 failed first against the old overlay |
| `src/components/VideoStage.test.tsx` | 12 passed; 10 failed first against the old player |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0; 400 modules; existing stale Browserslist warning |
| Real browser (Task 2 Step 7, historical) | Chromium `Chrome/156`; inputs, removal, reselection, and a synthetic no-pose clip on GPU behaved as designed |
| `npm ls @mediapipe/tasks-vision` | exit 0; 0.10.35, pinned exactly |

Mocks establish coordination, not real decoding, inference, or accuracy. Details,
including the review disposition, are in [STATUS.md](STATUS.md).

## Completed work and exact next task

- **Plan Task 1 is complete (Steps 1–8).** `src/core/video.ts` provides the
  bounded media helpers, `src/core/processingLimits.ts` holds `M1_LIMITS`, and
  `src/core/PoseEngine.ts` runs one bounded job at a time with a per-job detector,
  validated limits and metadata before model work, and copied, validated
  observations. Implemented by Claude Code (Opus 5.5). A fresh-context Claude
  subagent review found no significant findings; its five Low findings were fixed
  and 19 regression tests added. Six concerns that only a real browser can settle
  (U1–U6, notably whether a 60 s clip fits the 300 s budget) are listed in STATUS
  under "Engine review and fixes" for Task 4.
- [D-017](DECISIONS.md#d-017-repository-structure-fixes) structure fixes are done.
- **Task 2 parts 1–2 are done (Steps 1–5).** `src/core/clipPolicy.ts` provides
  `validateSelection`. The rewritten `src/store/useSessionStore.ts` admits one
  clip through it, gives each clip a fresh engine and job token, cancels on
  removal/reset, holds a `cancelling` state until cleanup, and revokes leased URLs
  once ([ARCHITECTURE.md](ARCHITECTURE.md#session-ownership)). The legacy metadata
  wait and the `getPoseEngine` singleton are gone.
- **Task 2 Step 6 is done.** The dropzone applies the selection check, rejects
  multi-file drops, shows a named alert, and is disabled while a clip is loaded or
  being released; the camera selector is gone. The page shows Bench Press / Side
  view, recording guidance, and honest scope copy; no-pose clips stay replayable
  with a notice; failures show kind-specific titles.
- **Task 2 Step 7 is done.** In a real Chromium browser, rejected inputs, an
  undecodable `.mp4`, removal with URL revocation, reselection, and a synthetic
  decodable clip (real GPU model start, real detection, no-pose result, playback)
  all behaved as designed; no request sent the video anywhere. Details in STATUS.
  No bench-press video has been processed yet.
- **Task 2 Step 8 is done, so Task 2 is complete.** A fresh-context review found
  no significant findings; its four Low code findings and three Low documentation
  findings were fixed (focus after removal, a "releasing" message, page-wide drop
  claiming, clearing `engineDelegate`). `master` is fast-forwarded to this work
  and pushed. Details in STATUS under "Task 2 review and fixes".
- **Task 3 Steps 1–2 are complete** on `feat/task3-overlay-playback`: Codex added
  tested `samplePose`, `isDrawableLandmark`, and `videoContentRect` helpers in
  `src/components/poseDisplay.ts`. They preserve raw input and unknown visibility,
  prevent missing-neighbor/large-gap carry-forward, and keep geometry in CSS pixels.
  A fresh-context Codex reviewer found no significant findings and ran all 56
  helper tests. Served model identifiers were not exposed for either session.
- **Task 3 Steps 3–4 are implemented** after the user's teaching checkpoint.
  The overlay consumes the helpers with actual video/contain geometry, DPR once,
  missing-data clearing, paused redraws, and playing-only animation ownership.
  Player controls follow seek events, show guarded play/restart errors, reset on
  source change, expose seek/speed accessibility state, and use a persistent no-pose
  live region and neutral sampling/detection labels. New component tests pass.
- **Task 3 Step 5 is verified.** On pushed component commit `62486db`, all checks
  passed again: 236 tests, lint without issues, production build (400 modules).
  No new dependency or real-browser/media check was needed for this step.
- **Task 3 Step 6 is complete, so Task 3 is reviewed.** A fresh read-only Codex
  review against base `03185f5` and M1-05/M1-06 returned **no significant findings**
  and independently passed **78/78** helper/overlay/player tests. No fixes or
  deferred code findings remain. The same-provider review's model identifier was
  unavailable; actual browser rendering and bench-press alignment are unverified.
- **Next: Task 4 Step 1, permitted fixture gate.** Its teaching checkpoint has
  **not** been approved. Explain real media versus simulated tests, ask
  **"Is this clear?"**, and wait before fixture/browser-test work. No permitted
  side-view bench recording is available. Do not relax the view requirement or
  fabricate inference/alignment results to unblock acceptance.
- The server started for this step on `127.0.0.1:5179` was stopped and its port
  verified free. The earlier `5176` listener was left untouched.
- GitHub's default branch may still need switching to `master` in Settings; this
  is the last recorded state, not a fresh remote-setting check.
- Task 4 prerequisite: no permitted side-view H.264 MP4 exists. Inspected Commons
  candidates are not side views; the user must choose an option (STATUS, "Fixture
  candidate research").

## Read context progressively

1. Root [AGENTS.md](../AGENTS.md), then relevant directory rules and READMEs.
2. [Current specification](../spec.md), [accepted decisions](DECISIONS.md), and the
   active plan's current task. Original [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) retains
   historical naming/squat scope; D-014 supersedes it with bench press.
3. [ARCHITECTURE.md](ARCHITECTURE.md) for layout and boundaries; [WORKFLOW.md](WORKFLOW.md)
   for review and handoff. Use [STATUS.md](STATUS.md) for detailed prior evidence.

The bench specification review is complete: [GOLDFISH_BENCH_REVIEW.md](GOLDFISH_BENCH_REVIEW.md).
The working plan has preexisting stale "pending" wording and lacks an earlier
intended-lifter substep. The current spec still requires useful observations of the
bench lifter, not a spotter. Preserve unrelated edits and resolve that narrative
before fixture acceptance; it does not block the display task. Do not redo completed
work based on old unchecked scratch briefs under ignored `.superpowers/`.

## First response in a new session

Confirm which instructions loaded, summarize the latest checks above, explain the
next task with its reason and alternative, ask **"Is this clear?"**, and wait. The
display task is complete and reviewed. Task 4 requires a new teaching checkpoint.
After an approved work chunk,
update this handoff, STATUS, ARCHITECTURE where facts changed, and plan progress.
