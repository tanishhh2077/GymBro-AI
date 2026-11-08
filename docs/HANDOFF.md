# GymBro AI current handoff

Updated 2026-11-08, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024/D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed current work

Task A is integrated. Home opens Body Log, active exercises expose exercise
notes, sync includes body/note choosers with hasSyncConflicts gating, restore
previews show body/note counts, and Routines exposes routine file import/export.
Routine files export v2 numeric superset groups and retain strict v1 reads.
Fresh review found group-boundary loss and stale previews, both corrected.
Native routine export reuses the validated cache/share adapter.

Task B is integrated through Backup and restore → Import workout CSV. Original
parsers support evidenced Strong English legacy, Hevy pounds and FitNotes Android
25.1 variants. See [format limits and provenance](WORKOUT_IMPORT_FORMATS.md).
Imports are local, additive, bounded to 4 MiB/10000 rows, validated and previewed
before revision-bound save. Identical repeats skip; changed sessions conflict.
Unsupported exercise types/variants reject the file. Explicit unit/UTC-offset
choices and warnings cover unavailable metadata and date-only session times.
Fresh independent review found no remaining blocking import defects.

The reverted goals/account accessibility changes are restored. Conflict IDs use
safe type/index IDs, including body/note choices. Sync/guest-copy focus waits for
enabled controls after React commits and guards stale/unmounted operations.
Fresh review found no material regression. Low-priority backlog is native-style
wrapping/modifier handling for account conflict radio arrow keys.

Final checks pass 1842 tests with 3 existing skips/130 files, lint, complete build
and native sync (27 files/platform). Browser evidence covers all 51 cases across
the full run (50 passed) and one affected import-test rerun after its broad
status selector was scoped (1 passed). Task A separately passed all 50 cases.
Actual phones, native sharing, live accounts/sync and real-bench accuracy remain
unverified. No human footage was used or uploaded.

## Vision scope direction (user, 2026-11-08)

The vision feature should cover six exercises next: bench press, machine chest
press, seated cable row, biceps curl, triceps pushdown and shoulder press. This
needs a design/plan and DECISIONS entry before code. Search results on datasets,
models and licences: [vision data and models](research/2026-11-08-vision-data-and-models.md).

## Next work and boundaries

The mandatory screens/import/account-fix work is complete. Task C muscle diagram
is optional and deferred. Verify MuscleMap and dataset licences before any asset
integration, then add the required NOTICE credit. No openGym code was copied or
adapted and no Gym visual media was used. Preserve Task4 and worker branches.

Use current origin/master for subsequent work. One browser suite owns4179.
Supabase still needs user dashboard setup, all five migrations in order and email
configuration in [the guide](../supabase/README.md). No paid service, signing or
network/settings changes were made. Phone/media work requires user presence.

## Phone and media boundaries

- iPhone 12 Pro Max, reported iOS 26.5.2, no Android phone, paid Apple Developer
  membership or owned Mac. Physical Safari/native behavior remains unverified.
- Use the reviewed phone plan only while the user is present. Agree a trusted
  private connection, re-detect the PC address and bind 5195/5196 to that address.
  Firewall/VPN/router/account/repository settings changes require coordination.
- Private bench videos stay outside Git. Never upload/commit footage, frames or
  pose traces. Current analysis is side-view bench pose/elbow observations.
  D-035's any-view direction requires separate design and validation. Record actual
  phone responsiveness/timings separately from build and simulator evidence.

## Environment and Git

Select installed Node 22.23.2 per process and confirm `node -v`. Preserve global
Node 20. Focus checks during implementation, then full test/lint/build once per
feature and affected reruns after fixes. GitHub default is master. Keep branches,
avoid force-push/history rewrites and attribution trailers. Preserve unrelated
servers/containers. Real credentials and human media stay outside tests.
