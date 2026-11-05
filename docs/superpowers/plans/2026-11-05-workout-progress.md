# Task17 Workout Progress Implementation Plan

> For agentic workers, use superpowers:executing-plans inline. Keep one writer and fresh read-only design and code reviewers. Track actual execution below.

**Goal**
Show completed-workout progress and traceable personal records from the local log.

**Architecture**
A pure aggregation function reads validated history into readonly progress groups.
A responsive SVG and accessible tables display those groups. Root App routes the
Home progress action and existing saved-workout links.

**Stack**
Existing React18,TypeScript,Zustand,Vite,Capacitor,IndexedDB,Vitest and Playwright.

**Specification**
[Workout progress design](../specs/2026-11-05-workout-progress-design.md).

## Global constraints

- D-037 selects this slice from the accepted personal-tracking roadmap.
- Group exact stored names and units. Source metrics from completed actual sets.
- Preserve numeric pairs/source IDs and zero values. Derive fresh data after edits.
- Heaviest ranks weight/reps, most-reps ranks reps/weight, ties use earliest date/source identity.
- Chart points are evenly spaced completed workouts in finish order. Tables show exact values.
- Existing storage validation supplies bounds and formats. Derived arrays own their sorting.
- Initial pagination20 rows per table. Group changes reset visible rows.
- Preserve phone-presence, private-video, Task4 and settings boundaries.
- Full tests/lint/build before green commits, fresh review before master integration, retain branches.
- Fix the earlier file-chooser incident only upon an observed repeat, following the user's condition.

## Review focus

- Equal exercise names with different units and similar names must keep distinct records.
- Duplicate entries and tied dates/loads/reps must retain a single correct source set and deterministic order.
- Targets and unfinished workouts must contribute only through eligible completed actual sets.
- Zero-only/single-point/extreme datasets must produce finite, visible charts and exact table values.
- Deletion/reload/group changes must recompute records, preserve timer state and reset table pagination.

## Step1 data contract and aggregation

Create src/types/progress.ts, src/core/workoutProgress.ts and its test file.
Consume readonly Workout history. Produce RecordedSet and ExerciseProgress
contracts exactly as the design through buildWorkoutProgress(history).

- [x] Create isolated branch from master11bb3e3, preserving original Task8 checkout.
- [x] Confirm process-local Node22.23.2, locked install,494-test/lint/build baseline and owned loopback health.
- [x] Record D-037 and obtain fresh read-only design review.
- [x] Write core regression tests, observe RED, implement aggregation, observe GREEN.
- [x] Update current docs and scoped guides, full checks, commit/push green foundation.

## Step2 Progress interface and browser verification

Create src/components/WorkoutProgress.tsx, src/components/WorkoutProgressChart.tsx,
src/App.progress.test.tsx and tests/browser/progress.spec.ts.
Modify App.tsx, WorkoutHome.tsx and feature workflow triggers.
WorkoutProgress consumes data, available, onHome, onWorkout and onHistory(id).
The chart consumes the selected group's chronological workout records and unit.

- [x] React tests RED through normal entry points, then implement selection/cards/chart/tables/source navigation.
- [x] Add synthetic real-browser flows, preserving the17 existing cases and guard rules.
- [x] Run full tests/lint/build/guarded sync/browser suite, inspect390/1280 UI, commit/push green implementation.

## Step3 review and integration

- [x] Fresh read-only whole-branch review against design/plan, resolve supported findings test-first.
- [x] Read actual hosted browser/native results and record the earlier incident's latest evidence.
- [ ] Final current docs, reviewed master fast-forward/push, original Task8 preserved-history merge and checks, retain branches and clean temporary worktree.

## Execution record

Codex implements inline. Runtime model identifier is unavailable. Managed
worktree attempts rejected stale liftform metadata, so the established Git
sibling fallback created GymBro AI-task17 from master `11bb3e3`. Metric
definitions, exact grouping and ordinal chart spacing are explicit builder choices.

Baseline passed 494 tests in 26 files, lint and build after a 482-package locked
install. Node 22.23.2 was confirmed. Owned loopback 4183 returned 200. Fresh
Goldfish review found no significant issues. Core tests observed 10 failures
against the empty implementation. Step1 then passed all 11 focused cases and
505 total tests in 27 files, lint and build. It is committed as `b8856df`.

Step2 observed six React failures for the missing Home entry. All six then passed
with 13 surrounding App cases. Full checks pass 511 tests in 28 files, lint and
guarded mobile sync. The build has 424 modules, CSS `index-C75j78x9`, JS
`index-t36OqT5D` and `web-Da5vG2kf`. All 19 Chromium 156.0.8078.4 cases pass in
2.9 minutes, including the earlier failing keyboard file-chooser case in 770 ms.
The earlier hosted cause remains unknown. Four synthetic previews were inspected
at 390/1280 px, including the zero-load marker, with no horizontal overflow.
Fresh code review found no significant issues and independently passed 86 tests
in 7 files. The dated review records its limits.

Step2 is committed and pushed as `22d694b`. Hosted browser `42125223775` and native
`42125223989` pass. Browser logs confirm all 19 cases, including the earlier
keyboard case in 1.3 seconds. Native logs confirm shared checks, Android and iOS
compilation, and visible Home/View progress on iPhone17 Pro/iOS26.4 simulator.
Concurrent master docs commit `b7e4b39` adds the user's
phone-responsiveness requirement. Step3 preserves that history through a merge
into the feature, retaining the compact handoff and the added requirement.
