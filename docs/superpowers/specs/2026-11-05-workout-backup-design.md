# Task18 workout backup and restore

## Authorization and choices

The user approved the recommended feature, export/import workouts and routines,
with "start with recommended". Work remains local. D-024 directs explanation and
execution, D-036 keeps final documentation updates lean. This design's file
format, additive merge rules and Home entry are builder choices.

## User flow

Home opens Backup and restore. Export captures validated saved history, routines
and the active workout. A compact UTF-8 JSON file has format
`gymbro-ai-workout-backup`, version1, exportedAt epoch milliseconds and data
containing the current validated library. Source revision is informational.
No video, frame, pose, account or timer state enters a backup.

Browser export requests a .json download. Installed iOS/Android export writes a
unique app-cache file and opens the native share sheet. The user chooses where
to save it. Messages distinguish download request/share-sheet completion from
proof that a file was saved. No remote service or automatic destination is used.
The screen explains readable JSON and user-selected file storage.

Import accepts one nonempty .json file, at most4MiB, decoded as strict UTF-8.
Read/parse errors, unknown envelope/schema fields, unsupported versions and
invalid records fail before a write. Existing strict library validation accepts
v1/v2 data and retains bounds/units/targets. Read timeout is10seconds. Selection
replacement/navigation aborts reads and ignores stale results.

A preview shows export date and additions for completed workouts, routines and
an active workout, plus identical records already present. Confirmation uses the
library revision captured with that preview. Cancel clears it. A subsequent save
or reload cannot silently authorize an old preview. An all-identical backup is a
no-op and offers no write action.

## Merge contract

- Records match by their existing IDs, within workout and routine namespaces.
  Compare known fields independent of object-key order, preserving array order.
- Identical records are skipped. New records are added with original IDs,
  timestamps, units, targets and actual sets. Existing records keep their values.
- Different versions of the same ID reject the whole import. An imported active
  workout and current finished workout with the same ID also conflict.
- Two different active workouts reject the whole import. An identical active
  workout remains mounted under its existing ID, retaining the rest timer.
- Final aggregate count/size bounds are validated. The destination's revision
  drives the existing atomic repository save. Incoming revisions never replace it.
- Failed/conflicting/uncertain saves preserve prior state and use existing reload
  recovery. Concurrent tabs fail the repository revision check. No partial merge.

## Implementation boundaries

Reuse core/workouts validation and the repository's atomic save. Add a pure
workoutBackup core module, a bounded file reader and a store restore method.
Backup UI is a Home subview with Back to Home, retaining the four navigation tabs
and root-mounted timer. Preserve the current visual tokens and native lifecycle.

Native export pins @capacitor/filesystem8.1.5 and @capacitor/share8.0.3, both
compatible with the installed Capacitor8 core. Sync generates plugin references.
Add the filesystem-required iOS file-timestamp privacy reason C617.1 as an app
resource. Use only the cache directory, requiring no public-storage permissions.
Native successful-share cache files remain available to recipient apps and are
managed by the OS cache. Do not unlink them immediately when Android reports a
chosen recipient. Failed native exports attempt cleanup. Browser object URLs are
revoked after a short download-admission delay. Export operations serialize.
See the official [share](https://capacitorjs.com/docs/apis/share) and
[filesystem](https://capacitorjs.com/docs/apis/filesystem) API contracts.

## Acceptance and limits

Tests must establish round-trip fidelity, empty/legacy/Unicode/extreme data,
malformed files, unknown/media fields, additive/no-op/conflicting imports,
active-workout collisions, capacity limits, stale previews, concurrent writes,
failed saves, resource cleanup and timer preservation. Real browser checks use
synthetic workout backups in isolated contexts, with no human files or captures.
Native compile/plugin packaging and simulator startup are hosted gates. Native
file-picker/share-sheet behavior and actual user saving remain physical-device
acceptance with the user present. No phone/session/account/settings change is
part of this implementation.
