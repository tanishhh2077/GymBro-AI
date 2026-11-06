# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024 and D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed follow-ups

- Task30/D-049 adds Duplicate to each saved routine. Copies retain unit, order
  and targets with fresh routine/exercise IDs and a bounded ` (copy)` name.
  Save/reload/cap guards and confirmed success use the existing atomic store.
- Task31/D-050 adds expandable exercise history inside an active workout.
  Five-workout pages show exact name/unit matches, all matching exercise entries
  and Regular/Warm-up actual sets. Only completions by the active workout's start
  appear, newest first. Opening history preserves typed set values without writes.
- Tasks27–29's history search/date filters, Progress ranges and plate calculator
  remain integrated. The new combined browser case exercises copied routine
  editing/start, history expansion, unchanged drafts and source preservation.

Two parallel Codex workers implemented the follow-ups in separate worktrees.
One fresh source reviewer found no significant defects. Combined checks pass
790 tests/60 files with four workers, lint, build, guarded native sync and all
32 Chromium cases. The default-worker run hit one loading timeout. Its isolated
file and constrained full rerun passed with source/timeouts unchanged. See STATUS.

## Next work

Completed-workout correction remains proposed. Product Q&A resumes at Q20.
Start the next approved task from updated origin/master with both follow-ups.
Retain the worker worktrees/branches. The unpublished exercise-history source
commit is represented by its integration commit as recorded in STATUS.

Use separate worktrees and branches. Assign task/decision numbers at integration.
Update shared docs at final integration. Only one browser suite may use 4179,
with previews on 4183. Merge one at a time. The incomplete Task4 branch requires
explicit approval before integration.

Supabase setup still needs the user's dashboard actions, both migrations and
email-code configuration through [the guide](../supabase/README.md). Live email,
real cross-device sync and physical-phone checks remain unverified.

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
