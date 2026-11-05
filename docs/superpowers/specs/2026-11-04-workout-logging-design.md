# Task 14: local workout logging and Home

## Intent, source and scope

The seven accepted answers and explicit "start building for now" authorization
are in [PRODUCT_DIRECTION](../../PRODUCT_DIRECTION.md) and D-030. This supersedes
the earlier generic-fitness/persistence deferral only for the bounded slice below.
Bench M1 and physical-device acceptance stay open; no further questions while
the user is busy. Existing source is reviewed master `a524387`, 391 tests.

Deliver a usable first path: Home -> Start workout -> add exercises and manual
rep/weight sets -> reload/resume -> finish -> reopen history. Home also provides
an equal standalone Analyze Video entry to the existing bench pipeline. No mock
data or placeholder charts. Logging exercise names are independent of the
bench-only analysis type. Community, routines, timers, PRs/charts, account/sync,
set-linked video storage, live analysis and additional AI lifts are later tasks.

## Contracts and builder defaults

- New plain readonly contracts in `src/types/workout.ts`: `WeightUnit = 'lb' |
  'kg'`; set `{id,reps,weight}`; exercise entry `{id,name,sets}`; workout
  `{id,name,unit,startedAt,finishedAt,exercises}`; document
  `{version:1,revision,active,history}`. Millisecond epoch timestamps, null
  `finishedAt` for the one active workout, non-null for history. No runtime media
  handles, AI observations, blobs or extra fields permitted in storage.
- New workout starts with explicit unit selection (initial lb is a builder
  default). The unit stays fixed for that workout; never relabel saved numbers
  or convert implicitly. Weight means the user's entered load in that unit;
  zero is valid for no added load. No per-hand/total-load inference.
- Names trimmed, 1-80 characters; IDs nonempty <=80 ASCII letters/digits/_/-.
  Reps whole numbers 1-1000; weight finite 0-10000. Valid epoch integer timestamps
  0 through 8.64e15, finish >= start. Engineering bounds, not strength guidance.
- Bounds: 1000 completed workouts, 100 exercises/workout, 100 sets/exercise,
  serialized document <=1,000,000 characters. Reject a full/invalid save with an
  actionable error; never prune old history. IDs unique per workout and workout
  IDs unique in the document. Validate version, shape, bounds, counts and IDs on
  every read/write. Unknown/corrupt data remains untouched and blocks tracking
  until a successful reload; standalone analysis still works.
- An active workout may contain empty exercise entries during editing. Finishing
  requires at least one exercise and one set per exercise; remove empty entries
  explicitly. Add/edit/remove sets, remove an exercise, finish, discard the
  active workout, read history and delete a saved workout. Destructive whole
  workout/exercise actions require an explicit UI confirmation. No auto-reset.

## Storage and state

Use native IndexedDB, database `gymbro-workouts`, object store `library`, key
`current`, schema/database version 1. Whole-document saves are small and atomic.
Each save uses one readwrite transaction: read current revision, compare with
the caller's expected revision, validate next record, then put revision+1. This
prevents two tabs from silently overwriting each other's edits. Transaction
completion, not put-request success, is the saved-state boundary.

Repository in `src/store/workoutRepository.ts` exposes
`load(): Promise<WorkoutData>` and
`save(expectedRevision: number, next: WorkoutData): Promise<WorkoutData>`.
One 10-second budget covers open/transaction; clear timers, abort incomplete
transactions and close connections on success/failure/timeout/blocked/version
change, including late open success. Storage failure never replaces existing
data with an empty record. No remote service, migration guess or automatic retry.

`createWorkoutStore(repository, deps)` owns data/loading/saving/errors and async
actions. IDs use 16 random bytes from crypto.getRandomValues (also available on
the HTTP LAN phone-test origin); clock Date.now, both injectable for tests.
Load on App mount, deduplicate StrictMode loads. Block writes while loading or
saving. Save to the repository before exposing the new state; failures preserve
the last confirmed state and the user's form inputs. A write error may have an
uncertain outcome; require reload before further mutations rather than claim
the database is unchanged. Conflict/failed reads show a
reload action. Finishing with a backward/invalid clock fails explicitly.

Browser/app data are local, origin-specific and can be removed by clearing app
or browser data; explain this in the UI. This is not cloud backup or a guarantee
against OS/browser eviction. IndexedDB behavior in native WebViews still needs
physical-device acceptance. [API reference](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

## UI and analysis lifecycle

Use existing visual tokens provisionally: base #05070d, surface #131a2a,
text #e2e8f0, primary #4ade80, analysis #f472b6, destructive #fb7185; system sans.
No external fonts/assets or final branding decisions. Left-aligned, single-column
mobile layout, clear exercise rows and tabular set data, visible keyboard focus.
Keep visual emphasis on the two equal Home actions, not decorative charts.

Root App retains native lifecycle handling/header and simple Home/Workout/Analyze
navigation. Extract the current video workspace without changing its processing
contract. Unmounting that view pauses/releases the visible player lease but does
not remove the clip or corrupt the store job; returning restores its state.
The global lifecycle still pauses/cancels appropriately. Default Home has the two
actions, real saved-workout/set counts and recent history. Pending storage shows
loading; failed storage shows retry and no fabricated empty-history count.

Forms have explicit names/units, bounded input validation, accessible errors,
disabled writes while busy, and preserve failed submissions. History shows units
per workout; never sum mixed loads. Empty history invites starting a workout.
No nonfunctional routines/Progress/social buttons. Future link analysis and full
personal tracking remain visible in docs, not falsely implemented in UI.

## Verification and integration

Pin only `fake-indexeddb` 6.2.7 as a development dependency for missing jsdom
IndexedDB; no runtime dependency addition. TDD for schema validation, atomic
repository reads/writes, failures and stale writers, store transitions and UI.
Real Chromium tests cover Home/log/edit/reload/finish/history, two-tab conflicts,
and the existing no-person pipeline with navigation away/back. Synthetic workout
values only; no human footage/logs, captures or artifact uploads.

Adapt existing smoke entry to navigate from Home into analysis. Preserve all ten
existing cases. Add this branch to browser/native workflow triggers for actual
hosted evidence. Empty Home includes the bench-analysis action text so the
existing native visual startup guard still recognizes GymBro + Bench Press;
inspect actual simulator output before claiming startup success.

Full tests/lint/build before each green step commit. Run local guarded sync and
mobile verification because the UI bundle changes, then fresh critical review.
Actual hosted browser/native results must be stated separately from local tests.
No phone/network/settings/signing changes or human uploads. Keep Task 8/4 histories.
