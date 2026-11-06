# Task 20 faster start: design and plan

> Inline execution, one writer, test-first, green step commits, one fresh
> read-only review of this design and the code (as Task 11 did for a small change).

**Decision:** [D-040](../../DECISIONS.md#d-040-load-video-analysis-code-on-demand).
**Goal:** Home, workout, history, routines, progress and backup screens start
without downloading or parsing video-analysis code.

## Measurement before the change (master `f0aa388`)

`npm run build`: one entry chunk `index-*.js` of 507.15 kB (159.09 kB gzip) and
Vite's over-500 kB warning. A source-map attribution of that chunk: react-dom
128 kB, `@mediapipe/tasks-vision` 124 kB, framer-motion 107 kB (+ motion-dom 4.5),
app components 69 kB, core 23 kB. MediaPipe is reached only from
`PoseEngine`; framer-motion only from `AnalysisWorkspace` and `VideoStage`. The
chart library is not in the entry chunk.

## Design

- **A. MediaPipe on first use.** `PoseEngine.createDetector` imports
  `@mediapipe/tasks-vision` dynamically, inside the existing bounded,
  abandon-aware initialization; only types are imported statically. A failed
  library load becomes the existing typed `init` error ("Failed to load the
  pose-estimation library"), so the clip fails with the same recovery path as a
  WASM or model failure. Runtime files stay local (`/wasm`, `/models`).
- **B. Analysis screen on demand.** App loads `AnalysisWorkspace` (with
  `VideoStage`, overlay, elbow panels and framer-motion) through `React.lazy`
  when Analyze opens. While it loads, a polite status reads "Opening video
  analysis…". If the chunk cannot load, an error boundary shows "Video analysis
  could not be opened. Reload the app to try again." with a Reload button; the
  rest of the app keeps working. App's session, link and pending-link state stay
  in App, so nothing about Task 19 changes.
- Native builds serve chunks from the local bundle, so no network is involved;
  the mobile verifier already compares every built file.
- Not done: no prefetching, manual chunk tuning, dependency removal or library
  replacement. react-dom stays in the entry chunk.

## Acceptance

- Entry chunk without the analysis code and below Vite's 500 kB warning; exact
  sizes recorded before and after. Behavior, tests and browser suite unchanged.

## Step 1: decision and plan

- [x] Worktree from master `f0aa388`; locked install (485 packages); baseline 597
  tests, lint, build (507.15 kB entry) under Node 22.23.2.
- [x] D-040 and this plan; commit.

## Step 2: on-demand loading

**Create:** `src/core/PoseEngine.lazy.test.ts`, `src/App.lazy.test.tsx`.
**Modify:** `src/core/PoseEngine.ts`, `src/App.tsx`, App tests that open Analyze.

- [x] RED: MediaPipe is not loaded before a detector is created, and a failed
  load is an `init` error; App does not load the analysis module before Analyze
  opens, shows the loading status, and shows the boundary message (other screens
  still work) when the module fails. Implement; full checks; browser suite;
  sizes; commit/push; hosted runs.
  Result: entry 507.15 kB → 233.58 kB (gzip 159.09 → 72.79 kB); on-demand
  `AnalysisWorkspace` 147.71 kB and `vision_bundle` 136.71 kB; no size warning.
  A production-preview check saw no on-demand chunk at Home, only the screen
  chunk on opening Analyze, and MediaPipe once a clip was processed.

## Step 3: review and integration

- [ ] Fresh read-only review of D-040, this plan and the diff; fixes in their own
  commit; docs (HANDOFF, STATUS, AGENTS baseline); fast-forward master and Task 8;
  remove the clean worktree.
