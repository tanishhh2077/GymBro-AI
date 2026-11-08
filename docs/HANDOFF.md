# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024/D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed utility batch

Tasks46–52 implement Q42–Q48 under D-058.
- Named device-local equipment profiles in the plate calculator.
- Running rest minus/plus 15 seconds and custom durations from 1 second to 60 minutes.
- Device-local exercise favorites and built-in equipment filters.
- Searchable Help accessible from Home.
- Optional weekly backup reminders, due on Home/Backup with one-day snooze
  and seven-day dismissal. Export requests remain distinct from confirmed files.

Three isolated Codex workers and one fresh source review completed this batch.
A profile recovery overwrite was reproduced, fixed and independently re-reviewed.
945 tests/79 files, lint/build and native sync pass. Browser evidence covers all
43 cases across the full run (42 passed) and one affected test rerun after its
broad section-count assertion was scoped to actual exercise regions.

## Transfer back to Claude

Q34–Q41 remain Claude's unfinished batch. Preserve schema5/training-detail UI,
progress-goals UI and onboarding branches and their worktrees. They were not
merged by this utility batch. Inspect their current changes before resuming.
Tasks46–52 and D-058 are now allocated to utilities. Assign later task/decision
numbers from current master at integration. Further product questions start Q49.

The original checkout retains Claude edits in src/core/previousWorkout.ts,
src/core/workoutCsv.ts and src/core/workoutSummary.ts. Do not accidentally stage
these with unrelated work. Utility verification used an isolated clean checkout.
Integrate against current origin/master, preserving utility additions. App.tsx,
workout storage/schema and unfinished Claude source files were left to Claude.
Keep worker branches/checkouts and incomplete Task4. Use one browser suite on4179.

Master still uses schema4. Supabase setup needs user dashboard actions, all three
integrated migrations and email-code configuration in [the guide](../supabase/README.md).
Claude's pending schema5 migration needs verification with that later integration.
Phone, native sharing/alerts and real cloud sync remain unverified.

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
