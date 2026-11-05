# Task16 Saved Routines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. One writer; fresh read-only design and whole-feature reviewers. Track actual progress below.

**Goal:** Reuse named exercise plans without treating targets or previous sets as completed work.

**Architecture:** Upgrade plain workout document to v2 on the next explicit save, retaining the current IndexedDB database/atomic revision repository. Routines and copied target metadata share strict validation; React adds a routine library/editor and root navigation.

**Tech Stack:** Existing React18/TypeScript/Zustand/IndexedDB/Vitest/Playwright/Capacitor; no dependencies.

**Spec:** [saved routines design](../specs/2026-11-05-saved-routines-design.md).

## Global constraints

- D-034 and the user's "Yes create all of that" approve the three proposed routine features. Bench-only AI/local data/no media uploads remain.
- Schema2, optional root routines, legacy strict v1 normalization changes ONLY version digit; no writes on load and no added defaults that push exact-cap data over1,000,000 chars.
- Routine names1-80, up to100 routines/100 ordered exercises each, optional targetSets1-100 and targetReps1-1000. Explicit lb/kg, no implicit conversion/target weights/ranges.
- Existing workout/history limits,10-second transaction budget, atomic revisions, final-size validation, save-before-state and recovery remain.
- New routine workout gets fresh IDs, copied order/unit/targets, zero actual sets; routine edits/deletions never rewrite snapshots. Active workout is protected.
- Update action takes editor's expectedRevision and refuses stale drafts after reload. No background overwrite/autoretry/pruning.
- No runtime dependency, service/native plugin/settings/phone action. Full checks before green step commits, no attribution trailers; retain Task8/Task4 branches.

## Review focus

- Valid v1 data at the exact size cap must remain readable; only successful explicit writes change stored schema.
- Failed upgrades/unknown data and stale concurrent tabs must preserve all workout and routine records.
- A reloaded stale whole-routine draft must not overwrite the freshly loaded routine; input remains recoverable.
- Starting twice must produce fresh empty-set workouts; editing/deleting/reordering the template must not rewrite active/history snapshots or units.
- Blank/invalid targets, duplicate names, reordered draft rows and80-char content must keep correct labels, validation and layout at390px.

## Step1: source, design, upgrade and store foundation

**Modify:** `src/types/workout.ts`, `src/core/workouts.ts`, `src/core/workouts.test.ts`, `src/store/useWorkoutStore.ts`; tests/scoped docs.
**Create:** `src/core/routines.test.ts`, `src/store/routines.test.ts`.
**Extend:** `src/store/workoutRepository.test.ts` with raw v1 read/write/cap/failure cases; repository interface stays unchanged.
**Interfaces:** RoutineInput/WorkoutRoutine and create/update/delete/start actions exactly as design; validateWorkoutData returns v2 from strict v1 or v2. Optional root routines means empty.

- [x] Create isolated branch from reviewed master7d97ac6; preserve original Task8 checkout.
- [x] Fresh locked install,458-test/lint/build baseline and owned loopback health before code.
- [x] Record D-034/design/plan; fresh read-only Goldfish design review and resolve supported findings.
- [x] Write failing schema/migration/repository/store tests including each relevant Review Focus, observe RED, implement minimal contracts/actions, GREEN.
- [x] Full tests/lint/build; update status/READMEs, commit/push green foundation.

## Step2: routine UI and browser proof

**Create:** `src/components/WorkoutRoutines.tsx`, `src/components/RoutineEditor.tsx`, `src/App.routines.test.tsx`, `tests/browser/routines.spec.ts`.
**Modify:** `src/App.tsx`, `WorkoutHome.tsx`, `WorkoutEditor.tsx`, browser/native workflow branch lists and applicable docs.
**Interfaces:** `WorkoutRoutines({store,onStarted,onResume})`; `RoutineEditor({store,routine?,expectedRevision,onClose})` receives routine/revision captured together when opening; root routes 'routines'; Home onRoutines; active workout displays target metadata separately.

- [x] Write React tests first for CRUD/reorder/targets/confirmations, failed and stale-editor saves; observe RED then implement UI.
- [x] Add actual Chromium synthetic routine flow, native-IDB v1 upgrade scenario and two-tab routine conflict. Preserve14 existing cases and network/capture guard.
- [x] Run focused/full tests,lint/build,guarded sync,full browser suite and390/1280 synthetic UI inspection; document exact results and commit/push green implementation.

## Step3: review, hosted verification and integration

- [x] Fresh read-only whole-feature reviewer against design/plan/base; no significant finding, no fix required; record limits.
- [x] Read actual hosted browser/native results, separately from local and physical-device evidence.
- [x] Complete current docs, reviewed fast-forward/push master.
- [ ] Bring master into the original Task8 checkout preserving histories and verify merged source/checks. Retain branches, close only owned servers and remove the clean temporary worktree after preserving previews. (Recorded on the Task8 branch.)

## Execution record

- Codex inline implementation, runtime model ID unavailable. Existing native managed-worktree path still refers to old liftform; Git sibling fallback follows prior isolated-task convention. Original checkout0895f32 remains untouched.
- Builder ruling: optional routines key preserves the exact legacy JSON size when normalizing1->2. No target weights/ranges or automatic completed sets; optional numeric targets are independent.
- Baseline/design review and all feature evidence pending at plan creation; no feature code written yet.
- Step1: baseline458tests/23files,lint/build and loopback4183 health200 pass after482-package locked install. Fresh Goldfish design ready with no findings.16 failures observed for unsupported v2/migration/actions; implementation now82/82 focused cases green. Full checks pending; test-only ES2022 hasOwn was replaced with ES2020-compatible existing prototype call after compiler caught it.
- Step1 complete:488tests/25files,lint/build green; no dependencies/repository interface/native changes. Routine and opening revision will be captured together in parent to avoid a snapshot/revision mismatch before editor mount; this refines, rather than changes, the stale-draft contract.
- Step2 in progress:6 UI tests RED->GREEN;494tests/26files,lint/build/guarded sync pass. Three actual browser routine cases pass after correcting a test-only reload-before-save race with visible saved-state waits. Full17 suite/fresh code review pending; synthetic390/1280 editor/library visual checks pass with no overflow.
- Step2 complete:17/17 actual Chromium cases pass3.5minutes, including all14 existing cases. Fresh read-only code reviewer independently77tests/8files and diff check pass; no significant findings, production unchanged afterward. Hosted/browser/native results follow the green UI commit.
- Hosted browser8/native15 both succeed on exact4c1b519, including shared494tests and visible simulator startup. Final local494tests/lint/build pass. User now requests Claude Code transfer after Codex limit; Codex stops after handoff. Only final Step3 documentation/integration/cleanup remains; do not rebuild the feature or repeat fresh reviews.
- Step 3 (Claude Code, Opus 5.5): the final local run of 494 tests in 26 files, lint and build (421 modules, reviewed bundle names) passes on the unchanged source; only Markdown follows `4c1b519`. The documents and indexes are complete, the previews are verified, and the preview script and progress ledger are copied to the original checkout's ignored paths. Master is fast-forwarded to this completion commit and pushed. The original Task 8 merge and the worktree removal follow on that branch.
