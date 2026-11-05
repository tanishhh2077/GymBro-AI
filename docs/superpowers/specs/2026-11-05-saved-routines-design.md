# Task16: saved workout routines

## Approved intent and boundary

The user approved the proposed next feature with "Yes create all of that":
create/edit/delete routines, save exercise order and optional set/rep targets,
and start a fresh workout from a routine with only actually logged sets counted.
D-034 records this. Charts/personal bests were described as following this work,
not part of this routine slice. Existing local-only records, bench-only AI,
session timer and pending physical-phone/bench gates remain separate.

Use existing React/TypeScript/Zustand/IndexedDB and UI tokens, no new dependency
or service. Local routines are part of the same library/revision as workouts so
one atomic save protects all records from stale tabs. Targets are plans, not
completed sets or exercise prescriptions. Starting a template never copies old
completed sets or invents reps/loads. No video/pose/account/cloud change.

## Version2 data and upgrade

Keep IndexedDB database version1, database gymbro-workouts/store library/key
current; only the plain document schema becomes version2. Existing bounds remain:
1000 history workouts,100 exercises/workout,100 actual sets/exercise, names1-80
trimmed chars, IDs1-80 ASCII alnum/_/-, reps1-1000, weight0-10000, JSON at most
1,000,000 characters, atomic revision checks,10-second operation deadline.

`WorkoutData` is version2 with existing revision/active/history and OPTIONAL
`routines: readonly WorkoutRoutine[]`. Absence means no routines; do not add an
empty array when normalizing a legacy document. `WorkoutRoutine` has id/name/unit
(explicit lb/kg) and1-100 ordered exercise definitions. Each definition has id,
name and optional `targetSets` integer1-100 / `targetReps` integer1-1000. Either
or both may be absent; present undefined/null/invalid values are rejected. At
most100 routines; unique routine IDs and unique exercise IDs per routine.
These are engineering bounds/builder choices. No target weights or rep ranges.

WorkoutExercise gains the same optional target fields, separate from its actual
sets. The rest of workout shape is unchanged; historical/manual workouts may
omit both. Targets do not relax the existing actual-set requirements for finish.
Unknown keys/media/version3+ data remain rejected and untouched.

`validateWorkoutData(unknown): WorkoutData` accepts strict legacy version1 data
using the OLD fields only, validates it fully, then returns an immutable shallow
copy changing version1 to2. Do not write during load. This changes no JSON length:
both version numbers are one digit and no default field is added, preserving a
valid legacy document already at the1,000,000-character cap. New version2 accepts
the optional routine/target fields and validates the whole document, including
final revision increment, before put. Next successful explicit save persists v2
in the same transaction; failed/corrupt/future reads/writes never erase data.
Old app code refuses v2 rather than dropping its new fields. App update/reload is
needed in such an old tab; do not claim old binaries can edit the new schema.

## Store actions and snapshots

Add `RoutineInput {name,unit,exercises: readonly RoutineExerciseInput[]}`;
input definitions have name and optional targetSets/targetReps. Store actions:
`createRoutine(input)`, `updateRoutine(id, expectedRevision, input)`,
`deleteRoutine(id)`, `startRoutine(id)`, all return existing async WorkoutResult.
Creation assigns fresh IDs; update keeps routine ID but may regenerate definition
IDs. Validate trimmed input through the central boundary; fail explicitly without
clearing editor fields. Existing save-before-state, busy/reload/conflict handling
and repository deadline remain the authority.

An editor captures the library revision when it opens. If it changes after a
reload, `updateRoutine` refuses that stale draft with guidance to reopen the
routine, even though the newly loaded library itself is current. Do not overwrite
another tab's template with an old whole-editor snapshot. The repository still
catches changes that happen after the action starts. Creating a new routine may
retain its draft after a reload because it does not replace another record.

Starting a routine requires no active workout, copies the routine's name/unit,
exercise ORDER and optional targets into a new workout with fresh workout/entry
IDs, startedAt now, finishedAt null and EVERY actual sets array empty. The saved
routine is unchanged. Editing/deleting it later never alters that workout or
history; no live reference or required origin ID. Subsequent starts are fresh
snapshots. Never replace an active workout implicitly. Starting/finishing keeps
the existing timer lifecycle and actual-history counts.

## Usable interface

Add a Routines navigation entry and a Home Manage routines action; keep Home's
Start workout/Analyze video equal. Four navigation actions must fit390px. A
Routines screen lists actual saved routines (or honest empty state), unit,
ordered exercises/optional targets, and real New/Edit/Delete/Start actions.
An active workout disables routine starts and offers Resume workout. Save/delete
errors and reload remain visible; templates are local and clear with app data.

Focused RoutineEditor, one form: name, explicit unit (initial lb builder default),
ordered exercise rows with name, optional integer set/rep targets, add/remove and
Move up/down buttons. A new routine begins with one blank row. Use stable local
row keys so reordering preserves inputs. Save requires at least one named row;
blank optional targets are omitted, not zero. Show bounds/required errors clearly,
and retain draft on failed saves. Cancel returns without saving. Confirm deletion
of a saved routine; cancellation does nothing. Removing an editor row changes
only the unsaved draft, and saving/canceling is explicit. Do not nest forms.

Use explicit per-row accessible names including row number, wrapped80-char names,
focus-visible controls and a mobile layout. Display targets in the active workout
as planned guidance above actual logged rows, not table rows/completed counts.
No fabricated data or unfinished buttons. Saved routine editing must not steal
or reset the independent active rest timer or analysis job.

## Acceptance and evidence

Test-first data/store/repository upgrade and template lifecycle, including strict
invalid/future input, legacy exact-size cap, read-without-write, atomic first v2
save and failure preservation, target/history separation, original units/order,
fresh IDs and empty sets on every start, active-workout protection, revision
conflicts/stale editor recovery and target snapshots surviving template deletion.
React flow covers create/edit/reorder/delete confirmation, failed-input retention,
and targets appearing without completed sets. Real Chromium uses synthetic logs
only: CRUD/start/reload/history, old v1 data seeded via native IndexedDB before app
boot, and two-tab routine conflicts. Preserve all14 existing cases. No human
media/logs, browser harness captures, traces or uploads. Separate local synthetic
UI inspection at390/1280 is allowed; no human data in those ignored previews.

Fresh schema/design review before code, fresh whole-feature code review afterward.
Full tests/lint/build before each green commit; guarded mobile sync/verify,
maintained browser run and hosted browser/native evidence. Physical-iPhone/video
acceptance remains pending; no App Store or background-notification claims.
