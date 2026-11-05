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

- D-036 selects this slice from the accepted personal-tracking roadmap.
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
- [x] Record D-036 and obtain fresh read-only design review.
- [x] Write core regression tests, observe RED, implement aggregation, observe GREEN.
- [x] Update current docs and scoped guides, full checks, commit/push green foundation.

## Step2 Progress interface and browser verification

Create src/components/WorkoutProgress.tsx, src/components/WorkoutProgressChart.tsx,
src/App.progress.test.tsx and tests/browser/progress.spec.ts.
Modify App.tsx, WorkoutHome.tsx and feature workflow triggers.
WorkoutProgress consumes data, available, onHome, onWorkout and onHistory(id).
The chart consumes the selected group's chronological workout records and unit.

- [ ] React tests RED through normal entry points, then implement selection/cards/chart/tables/source navigation.
- [ ] Add synthetic real-browser flows, preserving the17 existing cases and guard rules.
- [ ] Run full tests/lint/build/guarded sync/browser suite, inspect390/1280 UI, commit/push green implementation.

## Step3 review and integration

- [ ] Fresh read-only whole-branch review against design/plan, resolve supported findings test-first.
- [ ] Read actual hosted browser/native results and record the earlier incident's latest evidence.
- [ ] Final current docs, reviewed master fast-forward/push, original Task8 preserved-history merge and checks, retain branches and clean temporary worktree.

## Execution record

Codex implements inline with runtime model identifier unavailable. Existing
managed-worktree attempts in this conversation reject the stale liftform metadata.
The established Git sibling fallback creates GymBro AI-task17. Original Task8
remains at11bb3e3. The user directs further building while their manual rerun is
pending. Task17 metric definitions, exact grouping and ordinal chart spacing are
explicit builder choices. Baseline/design review and implementation are pending.

Baseline passed494tests/26files,lint/build after a482-package locked install,
with node-v22.23.2 confirmed. Owned loopback4183 returned200. Fresh Goldfish
review is ready with empty findings. Core tests observed10 failures against the
empty implementation before the aggregation code. Focused GREEN follows.

Step1 passes11 focused tests and505total tests/27files,lint/build. Fresh design
review is ready with empty findings. Core aggregation retains source pairs and
unit/name groups. Step2 creates the interface and real-browser evidence.
