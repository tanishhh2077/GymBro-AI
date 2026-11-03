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
- Git ([D-018](DECISIONS.md#d-018-regular-commits-and-reviewed-merges-to-master)):
  after each verified, documented chunk, commit its paths on the feature branch and
  push; after each reviewed plan task, fast-forward `master` and push it. Never
  force-push, reset, clean, or discard working files, and never add commit
  attribution trailers.

## Repository state

- Local folder: `D:\Programming\summer 2026 projects\GymBro AI`.
- Branch: `feat/gymbro-video-landmarks` (pushed to origin
  `https://github.com/tanishhh2077/GymBro-AI.git`). `master` holds only the
  original scaffold commit and is not yet on GitHub; it is first fast-forwarded
  when Task 2's review is resolved, so its code and documents always agree.
- Work through Task 2 Step 6 is committed on the feature branch in three grouped
  commits (documents; test tooling and Task 1; Task 2 Steps 1–6); see `git log`.
  Check `git status` for anything newer before starting.
- Layout, file responsibilities, and the engine lifecycle are in
  [ARCHITECTURE.md](ARCHITECTURE.md#repository-layout). `public/` deliberately holds
  no Markdown; its rules are in [root AGENTS.md](../AGENTS.md#static-files-in-public).
- A development server was observed earlier on `http://127.0.0.1:5176/`; verify it
  is still serving this project before using it. Do not kill unrelated servers.

## Latest checks (2026-11-03, after Task 2 Step 6)

| Command / suite | Observed result |
| --- | --- |
| Whole `npm test` | **156 passed / 156**, exit 0 |
| `src/core/video.test.ts` | 58 passed |
| `src/core/PoseEngine.test.ts` | 55 passed |
| `src/core/clipPolicy.test.ts` | 22 passed (16 failed first against a placeholder) |
| `src/store/useSessionStore.test.ts` | 12 passed (all 12 failed first: API missing) |
| `src/components/ClipDropzone.test.tsx` | 9 passed (all 9 failed first against the old component) |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0; 399 modules; stale Browserslist warning; 0 Markdown files in `dist/` |
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
  with a notice; failures show kind-specific titles. The rewired app has **not
  yet been checked in a browser**.
- **Next task: plan Task 2 Step 7 (verification with a manual browser check), then
  Step 8 (fresh review of all of Task 2).** The user approved the Task 2
  explanation on 2026-11-03 and asked to pause after each part, so **confirm with
  the user before starting**. The check list is in STATUS under "One next task".
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
before fixture acceptance; it does not block Task 2. Do not redo completed
work based on old unchecked scratch briefs under ignored `.superpowers/`.

## First response in a new session

Confirm which instructions loaded, summarize the latest checks above, explain the
next task with its reason and alternative, ask **"Is this clear?"**, and wait. The
Task 2 checkpoint above is already approved, but a new session should still state
what it is about to do and confirm before editing. After an approved work chunk,
update this handoff, STATUS, ARCHITECTURE where facts changed, and plan progress.
