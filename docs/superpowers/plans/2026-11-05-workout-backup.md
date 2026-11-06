# Task18 Workout Backup Implementation Plan

> Execute inline with superpowers:executing-plans. Use fresh read-only design and
> whole-feature code reviewers. One writer. Record actual results in the ledger.

**Goal**
Export local workout/routine backups and restore validated additions atomically.

**Architecture**
Pure serialization/merge functions reuse strict library validation. A bounded
file reader supplies a revision-bound preview. The store commits through the
existing repository. Browser/native export adapters support a Home subview.

**Stack**
React18, TypeScript, Zustand, IndexedDB, Capacitor8, Vitest and Playwright.

**Spec**
[Workout backup design](../specs/2026-11-05-workout-backup-design.md).

## Global constraints

- Format gymbro-ai-workout-backup/version1. UTF-8 .json file, at most4MiB.
- Reuse strict v1/v2 validation, count/size bounds and atomic destination revisions.
- Additive merge only, identical IDs skipped, conflicting IDs or active workouts rejected.
- Preview captures its source revision. Never persist media, poses or timer state.
- Native export uses pinned filesystem8.1.5/share8.0.3 and cache-only file access.
- Fresh review and hosted gates before master integration. Preserve all branches.
- Phone/private-media work remains coordinated. Final current docs updated under D-036.

## Review focus

- Same IDs with reordered object keys must compare equally, while changed values or array order must conflict.
- Active/finished collisions, different active workouts and repeated imports must preserve saved data and timer identity.
- Preview/read races, reloads and concurrent tabs must never authorize a stale or partial restore.
- Unicode/legacy/exact-size/count bounds and malformed or media-bearing envelopes must round-trip or reject consistently.
- Download/share cancellation, failure and navigation must release owned handles while preserving files needed by recipients.

## Step1 backup core and atomic restore

Create src/core/workoutBackup.ts and workoutBackup.test.ts,
src/core/workoutBackupFile.ts and workoutBackupFile.test.ts,
src/store/backup.test.ts. Modify src/store/useWorkoutStore.ts.

Interfaces are createWorkoutBackup(data, exportedAt):string,
parseWorkoutBackup(text):WorkoutBackup, mergeWorkoutBackup(current, backup):BackupMerge,
readWorkoutBackup(file, signal):Promise<WorkoutBackup> and
store.restoreBackup(backup, expectedRevision):Promise<WorkoutResult>.
BackupMerge exposes data, addedWorkouts, addedRoutines, addedActive and duplicates.

- [x] Isolated branch, locked install, Node 22.23.2, full baseline and loopback health.
- [x] Fresh design review, settle supported questions within approved scope.
- [x] Write core/file/store regression tests, observe RED, implement and observe GREEN.
- [x] Full tests/lint/build, green Step1 commit/push with design/plan.

## Step2 export adapters and interface

Create src/mobile/workoutBackupExport.ts and its test,
src/components/WorkoutBackup.tsx, src/App.backup.test.tsx and
tests/browser/backup.spec.ts. Modify App, WorkoutHome, package/lock and workflow
feature triggers. Add iOS PrivacyInfo.xcprivacy resource and synchronize plugins.
saveWorkoutBackup(text):Promise<'download'|'share'> validates outgoing content,
serializes exports, uses native cache/share or a browser download with URL cleanup.
WorkoutBackup consumes the existing WorkoutStore and onHome callback.

- [x] Write export/React tests and observe RED before implementation.
- [x] Implement browser/native export, Home entry, bounded read/preview/confirm/recovery.
- [x] Add synthetic browser round-trip, conflict/stale-preview and narrow-layout cases.
- [x] Full tests/lint/build/sync/browser suite and visual review, green Step2 commit/push.

## Step3 review and integration

- [x] Fresh whole-feature review, resolve supported findings test-first.
- [x] Read actual hosted browser/native results, including native plugin compilation.
- [x] Final compact docs, reviewed master/original-checkout integration and checks.
- [x] Preserve previews, stop owned listeners, remove clean temporary tree, retain branches.

## Execution evidence

Baseline Node 22.23.2, locked 482-package install, 511 tests/lint/build and owned
loopback 4183 health pass. Fresh design review is ready. Step1 observed core10,
store7 and reader6 failing cases, then all31 focused and542 full tests pass.
Step1 is committed as c78b58c. The build's newer Object.hasOwn usage was replaced
with the existing target-compatible hasOwnProperty idiom after a compiler error.

Step2 observed exporter6, React7 and native-resource1 failures before the feature
was implemented. Three real-browser failures exposed live FileList clearing.
Copying the selection before resetting input fixes the observed1-to-0 change.
An absent-randomUUID regression then drove filenames to the app's existing
getRandomValues strategy. Fresh review independently passes 75 tests in 8 files and
exact4MiB/legacy-cap/multibyte probes, with no unresolved significant findings.

Final local source passes562tests/34files,lint/build and guarded sync of13shared
web files per platform, with three Capacitor plugins. Build has 435 modules, CSS
index-D3AO3QCE, JS index-BcFiZ8Aj. Vite reports its502.21kB chunk advisory.
All four synthetic previews were inspected at390/1280px without overflow.
The owned 4183 preview was stopped after PID/command verification.

The first full browser run passed21/22 cases, timing out at no-person.spec.ts:46
after its session became empty. Live edits occurred during that run. A development
reload is a hypothesis, with cause unconfirmed. With source frozen and the preview
server stopped, all 22 cases pass in3.4minutes, Chromium 156.0.8078.4, GPU,120samples.
No pose code or browser-test allowance changed in response.

Step3 source 070988e passes both feature and master hosted browser/native runs.
The original 485-package install passes 562 tests/lint/build sequentially, guarded
sync and all 22browser cases in 4.4 minutes. All branches retained, Task4 unmerged,
clean temporary worktree removed, previews copied/hash-checked and owned 4183
stopped. Final current docs are updated together under D-036.
