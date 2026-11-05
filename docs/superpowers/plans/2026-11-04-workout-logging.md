# Task 14 Local Workout Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. One writer and fresh read-only reviewers. Checkboxes track actual execution.

**Goal:** Ship a working local workout log/history alongside the existing video workflow.

**Architecture:** Plain validated workout records, IndexedDB transactional revision checks, a separate async Zustand store, provisional Home/log/history UI. The analysis store/media contract stays separate.

**Tech Stack:** existing React/TypeScript/Zustand/Vite/Capacitor, native IndexedDB; dev-only fake-indexeddb 6.2.7.

**Spec:** [workout logging design](../specs/2026-11-04-workout-logging-design.md).

## Global constraints

- One local active workout, no cloud/account/video persistence/live analysis/new AI lift.
- Schema v1; explicit lb/kg per workout; reps 1-1000, weight 0-10000, names 1-80.
- Limits 1000 history workouts, 100 exercises/workout, 100 sets/exercise, 1,000,000 JSON characters; no automatic deletion.
- IndexedDB `gymbro-workouts` / `library` / `current`; revision comparison and put in one readwrite transaction, commit before UI update; 10-second operation deadline.
- Existing visual tokens and system font are provisional; no paid service/device/settings/publication/human-media action.
- Full tests/lint/build before each green commit/push; fresh review before master integration; no attribution trailers.

## Review focus

- Corrupt/future-version data must not be overwritten with an empty library; test load/write rejection and recovery.
- Two tabs must not overwrite each other's revision; race two real repository saves and test the losing UI's reload path.
- Aborted/failed/quota/timed-out writes must not display success or clear input; exercise repository/store and browser-supported failure paths.
- Unit changes must not relabel old numbers; unit is fixed after workout creation, history asserts its original label after reload.
- Navigating away from analysis must retain clip/job identity and release player resources; extend real no-person/cancel cases without seeded poses.

## Step 1: source, design and clean setup

- [x] Create feature worktree from master `a524387`, clean locked install, 391-test baseline/lint/build. Leave phone checkout and existing servers intact.
- [x] Record Q1-Q7 and D-030, bounded design/plan and provisional defaults. Obtain fresh Goldfish/builder review and resolve supported issues.
- [x] Commit/push green plan with the state foundation. Resume MCQs at Q8 in about an hour via the one-time scheduled follow-up.

## Step 2: validated transactional workout state

**Create:** `src/types/workout.ts`, `src/core/workouts.ts`, `src/core/workouts.test.ts`, `src/store/workoutRepository.ts`, `src/store/workoutRepository.test.ts`, `src/store/useWorkoutStore.ts`, `src/store/useWorkoutStore.test.ts`.
**Modify:** package/lockfile, applicable source guides/READMEs.
**Interfaces:** contracts/repository/store factory and async actions specified in design. All actions return an explicit success/error result; no throwing unhandled UI promises.

- [x] Write schema/repository/store tests first; observe RED for invalid schema/set/date/IDs/media fields, read/write/revision/failure paths, draft lifecycle and state preservation.
- [x] Implement minimum contracts/validation, bounded repository and async store; add dev pin. Use the fake only at the missing browser API boundary, real modules otherwise.
- [x] Verify focused + whole tests/lint/build, document actual results and failures, commit/push green state foundation.

## Step 3: usable UI and browser proof

**Create:** `src/components/{AnalysisWorkspace,WorkoutHome,WorkoutEditor,WorkoutHistory}.tsx`, focused component tests, `tests/browser/workouts.spec.ts`.
**Modify:** `src/App.tsx`, App tests if necessary, browser helper/input/no-person specs and both workflow branch triggers; docs.

- [ ] Write failing UI/flow tests for Home actions, storage errors, valid/invalid sets and preservation on save failure, resume/finish/history and destructive confirmation.
- [ ] Implement Home/log/history and extract analysis view; maintain root native lifecycle and media ownership. Add no unimplemented controls or fake data.
- [ ] Add/execute actual Chromium logging/reload/edit/history, simultaneous-tab conflicts and navigation through no-person processing. Existing ten cases still run.
- [ ] Full tests/lint/build and guarded mobile sync/verify, local actionlint, visual inspection at desktop/390 width, commit/push to hosted workflows.
- [ ] Read actual hosted results, obtain fresh critical whole-branch review, fix supported defects with reproducing tests, update all current docs and integrate reviewed master per D-018.

## Execution record

- Native worktree tool still rejects renamed source because chat points at `liftform`; normal Git created temporary sibling `GymBro AI-task14` on `feat/task14-workout-logging`.
- Clean Node 22.23.2 install: 481 packages; 391 tests/18 files, lint and build passed before feature code. Global Node unchanged.
- Pre-flight: Step 2 document/repository/store interfaces are consumed by Step 3; workout IDs remain separate from bench-only analysis/media IDs. No conflict found.
- Scheduling: relative COUNT rules initially produced no future runs; a bounded one-time future occurrence was successfully created, automation id `resume-gymbro-ai-design-q-a`, about 23:28 Chicago. No repeated reminder was authorized.
- Fresh design review ready; guardrails on transaction completion/reload ordering incorporated. Core RED 27/29 rejected-data tests, repository RED 7/8, store RED 8/8 against no-op scaffolds; no failing state committed. Plan/setup and state foundation are folded into one green commit because test-first work began before the plan-only commit.
- Builder ruling: random IDs use crypto.getRandomValues instead of randomUUID so trusted HTTP LAN phone testing works; both are opaque identifiers, not user-facing choices. Storage errors require reload because a timeout cannot guarantee a write never committed.
