# Task26 workout flow improvements

The user selected recommended Q14–Q16 on 2026-11-06 and said to start all three.
This one workout-flow feature covers completion, set labels and rest defaults.
Implementation runs inline with focused test-first steps and one fresh final
read-only review because the set representation changes saved data.

## Accepted behavior and builder choices

- A successful Finish opens a summary of the saved workout, with elapsed wall
  time, exercises, sets, regular/warm-up counts and total logged volume. Volume
  sums entered reps × entered weight across every logged set, using the workout's
  original unit. It describes recorded load. Summary is derived from history and
  can also be opened there. A failed finish keeps the current workout visible.
- Sets offer Regular and Warm-up. Missing labels in older records mean Regular.
  Regular saves omit the optional label, preserving existing set shapes. Warm-up
  uses `kind: 'warmup'`. Schema3 accepts the label. Strict v1/v2 normalize only
  their version digit on read, with no writes or extra defaults at the size cap.
  Backup, restore, sync and server validation carry labels. Older app versions
  reject unsupported schema3 safely. Apply backend migrations in filename order.
- Warm-ups remain visible in history and count in the total summary volume, but
  personal records/charts use Regular sets. Previous-value suggestions match the
  selected set type. Repeat last set preserves its type. Old three-argument set
  calls remain valid and edits preserve the type when the argument is omitted.
- Exercise rest defaults use the existing 30/60/90/120/180/300-second choices,
  with 90 seconds when unset. Match exact exercise names across units and future
  workouts. Save bounded device-local preferences separately for guest and each
  account. Backups/sync continue to carry manual workout records. Storage errors
  use session-only rest preferences with an explicit notice.
- Each exercise offers its default duration and manual Start rest. Successful
  new-set logging passes that exercise's default to the opt-in automatic timer.
  Edits, failed saves and copied drafts never start it. Timer clocks, running
  state and auto-start remain session-only. Existing manual controls still work.

## Steps and verification

1. Add schema3/set-kind validation and tests. Extend store add/edit with optional
   kind, type-matched previous values, regular-only progress and backup conflict
   identity. Add an additive SQL migration and apply all migrations in the local
   PostgreSQL test command. Test old/current records, rollback, set-kind round
   trips and label-only conflicts through restore/sync and server validation.
2. Add a derived summary helper/component, finish navigation and History access.
   Add the set-type selector, logged labels, correct edit/repeat behavior and
   type-matched previous values. Test success/failure, reload and source identity.
3. Add a scoped rest-preference hook, exercise controls and timer handle context.
   Test saved duration reuse, exact names, guest/account isolation, storage-error
   fallback, timer deadlines and save-before-auto-start behavior.
4. Run full tests/lint/build and guarded native sync after the feature is complete.
   Run affected browser scenarios with synthetic logs and keep files/checks stable
   during browser execution. Obtain one fresh read-only review, resolve concrete
   defects and rerun affected checks. Update the compact handoff/status and actual
   data contracts at completion, then integrate through the existing Git workflow.

Live cloud configuration and physical-phone/bench testing retain their existing
user-owned prerequisites. Local tests establish recorded-workout behavior.

## Completed locally on 2026-11-06

All four implementation/verification steps are complete. STATUS records full and
affected test evidence, 30 passing browser cases, PostgreSQL checks, build/native
sync and the independent review. The server setup guide now requires both
migrations. Cloud configuration and physical-device verification remain open.
