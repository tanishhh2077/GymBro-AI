# Legacy code and template asset cleanup implementation plan

> Use `superpowers:executing-plans` inline with one writer, test-first behavior,
> green step commits/pushes and a fresh final reviewer.

**Goal:** Remove unrendered legacy code, unused analysis types and Vite template
assets without changing what the app shows or does.
**Decision:** [D-028](../../DECISIONS.md#d-028-remove-unrendered-legacy-code-and-template-assets).
**Tech stack:** Existing React/TypeScript/Vite/Vitest, process-local Node 22.23.2
(`$env:NVM_HOME\v22.23.2`, confirmed with `node -v`).

## Design

Measured on master `eaf87e1` before any change:

- `ExercisePicker.tsx` has no importer; `EXERCISE_LIST` and `ANGLE_LIST` are used
  only by it. No source, HTML, CSS or script references `App.css`, `hero.png`,
  `react.svg`, `vite.svg`, `public/favicon.svg` or `public/icons.svg`.
- In `src/types/index.ts`, everything after `ClipStatus` (`RepPhase`,
  `MetricSample`, `FlagSeverity`, `FormFlag`, `Rep`, `ClipAnalysis`,
  `AngleCapabilities`, `MetricDisagreement`, `SessionReport`, `ExerciseAnalyzer`,
  `AnalyzerInput`) has no user outside that file. `ClipSource` and `WorldLandmark`
  stay: `Clip.source` and `PoseFrame.worldLandmarks` use them.
- The store fixes `exercise: "bench"` and creates clips with `source: "upload"`
  and `angle: "side"`. `App.tsx` shows `EXERCISES[exercise].name`, `ANGLES.side.name`
  and `ANGLES[clip.angle].name`; `VideoStage.tsx` uses `EXERCISES.bench.accent`.

Changes:

- Delete the unreferenced files listed in D-028.
- Delete the unused analysis types. Narrow `Exercise = "bench"`,
  `CameraAngle = "side"`, `ClipSource = "upload"`. Reduce `ExerciseMeta` to
  `id`/`name`/`accent` and `AngleMeta` to `id`/`name`, with one entry each
  ("Bench Press", `#f472b6`; "Side"). Rewrite the type comments that describe
  "three lifts we analyze" or "view-invariant angle math" so they state what the
  values are: `WorldLandmark` is the model's inferred hip-centred estimate, not a
  measurement.
- Alternative considered: keeping the wider unions "for later". The unions and
  taglines advertise squat/deadlift/front-view support the product does not have
  (D-014) and invite code that branches on values no clip can hold; a later
  exercise gets its own decision and contract.

## Global constraints

- No rendered-text, store, engine, model/runtime, dependency, lockfile or native
  configuration change. Existing component/App tests must pass unchanged.
- Work on `feat/task12-legacy-cleanup` from reviewed master `eaf87e1`.
  Task 8 (phone) and Task 4 (bench) stay open and unmerged.
- D-024 waives routine approval stops; phone/accounts/settings/spending/
  publication still stop.

## Review focus

1. Nothing deleted was used: build/type-check, tests and a repository-wide search
   for every deleted name and path.
2. The visible interface is unchanged: App/VideoStage tests that render "Bench
   Press", "Side" and the accent pass without edits; a desktop browser check
   compares the empty and loaded screens with master.
3. The built site and both native copies no longer contain the two template SVGs,
   and `mobile:verify` still passes.

## Step 1 — decision and plan

- [x] Record D-028 and this plan; update the docs/plans indexes, HANDOFF/STATUS.
- [x] Whole tests/lint/build. Commit/push as Task 12 Step 1.

## Step 2 — delete unreferenced files

**Delete:** `src/components/ExercisePicker.tsx`, `src/App.css`,
`src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`,
`public/favicon.svg`, `public/icons.svg`. **Modify:** `src/core/exercises.ts`
(drop `EXERCISE_LIST`, `ANGLE_LIST`) and the guides that list these files.

- [x] Delete (also `SquatIcon`/`DeadliftIcon`/`BenchIcon` in `src/components/icons.tsx`,
  used only by the picker); run build, tests, lint and `mobile:sync`; confirm `dist/` and both
  native copies have no `favicon.svg`/`icons.svg`. Update ARCHITECTURE and the
  component/asset/core guides; commit/push.

## Step 3 — narrow the contracts

**Modify:** `src/types/index.ts`, `src/core/exercises.ts`, new
`src/core/exercises.test.ts`, the type/core guides.

- [x] Write a failing test: `EXERCISES` has only `bench` with exactly
  `id`/`name`/`accent`, and `ANGLES` has only `side` with `id`/`name`. Observe it
  fail on the current metadata.
- [x] Narrow the metadata and unions, delete the unused analysis types, rewrite
  the misleading comments; observe the test pass and the existing suites pass
  unchanged. Run full checks and `mobile:sync`; update guides; commit/push.

## Step 4 — browser check, fresh review and integration

- [ ] Desktop browser: empty and no-person-loaded screens look the same as
  master's (names, view label, accent, badges); no new console errors.
- [ ] Fresh read-only review of D-028, this plan and the diff; fix supported
  findings in their own commit.
- [ ] Record the review, fast-forward master, push, and merge master into Task 8.
