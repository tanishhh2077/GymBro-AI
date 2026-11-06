# Task 19 set-linked analysis implementation plan

> Inline execution, one writer, test-first, green step commits, fresh design and
> code reviewers. Design: [set-linked analysis](../specs/2026-11-05-set-linked-analysis-design.md).

**Constraints:** no workout-schema, persistence, dependency, model or native
change; analysis stays local and session-only; existing standalone flow and all
562 tests keep passing. Branch `feat/task19-set-linked-analysis` in sibling
worktree `GymBro AI-task19` from master `94068fc`; Task 8 and Task 4 untouched.

## Step 1: decision, design, plan, review

- [x] Worktree, locked install (485 packages), baseline 562 tests / 34 files,
  lint, build (435 modules) under Node 22.23.2.
- [x] D-039, design and plan; fresh read-only design review (ready with changes:
  2 Medium, 5 Low, all adopted; see the design-review record).

## Step 2: link contracts

**Create:** `src/core/setLinks.ts`, `src/core/setLinks.test.ts`.
**Modify:** `src/types/index.ts` (`SetLink`, `Clip.link`),
`src/store/useSessionStore.ts` (`startClip(file, link?)`, `detachLink(clipId)`)
and its tests. Signatures are in the design's Interfaces section.

- [x] RED tests for the name rule, resolution and store link ownership (missing
  module, no stored link, no `detachLink`); then the minimal code; 587 tests pass (22 core + 3 store new).

## Step 3: screens and browser flow

**Modify:** `src/App.tsx`, `src/components/AnalysisWorkspace.tsx`,
`WorkoutEditor.tsx`, `WorkoutHistory.tsx`; **create** `src/App.analysis-link.test.tsx`,
`tests/browser/set-analysis.spec.ts`; add this branch to the push lists in
`.github/workflows/browser-checks.yml` and `mobile-builds.yml`. App and
AnalysisWorkspace gain the `session` prop and the props listed in the design.

- [x] RED App tests for every design flow (9 cases; missing row actions); implement;
  Chromium case; 390/1280 inspection; 596 tests, all 23 browser cases, guarded
  sync; commit/push. Detach runs in App so a restore cannot relink a clip first.

## Step 4: review and integration

- [x] Fresh read-only code review (no Blocker/High/Medium; five Low, four fixed in
  `e50b144`, docs here); fixes in their own commit.
- [x] Final docs (HANDOFF, STATUS, indexes), fast-forward master, bring Task 8
  up to master, remove the clean worktree; retain branches.
