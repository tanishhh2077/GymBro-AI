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

- [x] Isolated branch, locked install, Node22.23.2, full baseline and loopback health.
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

- [ ] Write export/React tests and observe RED before implementation.
- [ ] Implement browser/native export, Home entry, bounded read/preview/confirm/recovery.
- [ ] Add synthetic browser round-trip, conflict/stale-preview and narrow-layout cases.
- [ ] Full tests/lint/build/sync/browser suite and visual review, green Step2 commit/push.

## Step3 review and integration

- [ ] Fresh whole-feature review, resolve supported findings test-first.
- [ ] Read actual hosted browser/native results, including native plugin compilation.
- [ ] Final compact docs, reviewed master/original-checkout integration and checks.
- [ ] Preserve previews, stop owned listeners, remove clean temporary tree, retain branches.
