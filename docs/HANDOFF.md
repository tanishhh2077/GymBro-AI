# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. D-036 keeps checks/plans/docs lean.
Detailed evidence and history are in [STATUS.md](STATUS.md).

## Task25 accounts and sync

The user authorized building optional accounts/sync and selected Supabase with
email codes (D-044). Codex implemented the client, backend migration and setup
guide. Cloud project/email configuration still belongs to the user. A pending
chat question asked them to follow [supabase setup](../supabase/README.md).
Check their reply before treating a live backend as configured.

- Home → Account and sync offers email codes and explicit Preview/Confirm sync.
  Guest keeps its established store/database. Each authenticated service/account
  has a separate local library. Explicit guest copy uses backup merge/revision rules.
- Whole-record three-way merging exposes concurrent edit/delete choices and
  propagates independent edits. Two active workouts require finishing one first.
  Remote revision checks and atomic local data/baseline commits preserve retries.
  Account changes reset session video/links, screen drafts and rest timers.
- Full checks passed 678 tests / 46 files, lint and build. After review/input fixes,
  affected checks pass 46 tests / 6 files, covering the current 681-test/47-file
  inventory. Guarded native sync passes 16 files/platform and 3 plugins. Browser
  passes 28/29 plus 2/2 affected reruns after a development reload interrupted
  portrait inference. All 29 cases have passing coverage. See STATUS for details.
- Real PostgreSQL 17.11 authorization/concurrency/validation tests pass through
  `npm run test:sync-db`. A real pinned-SDK/fake-HTTP test verifies protocol.
  Fresh read-only review found one medium retry issue, corrected with explicit
  app-reload recovery. No unresolved significant review findings remain.

## Next work

1. User configures Supabase URL/publishable key in ignored `.env.local`, applies
   the migration and updates the email-code template using the setup guide.
   Public signup also needs an appropriate email provider. Coordinate account,
   plan/spending and dashboard actions. The live service needs verification.
2. Verify real email sign-in and two-device workout sync, including conflicts,
   offline edits and deletion. The iPhone portion runs only with the user present.
3. Continue Q&A from Q14 or another approved feature. Automatic sync, account
   deletion, persisted analysis and live analysis need their own bounded work.

Tasks22–24 exercise library, appearance and on-demand analysis are complete.
Task24 48d3918 hosted browser 42171205737 and native 42171205658 passed. Check
Actions for the latest Task25 commit. Retain branches and the separate Task20
worktree. The incomplete Task4 branch needs explicit approval before integration.

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
