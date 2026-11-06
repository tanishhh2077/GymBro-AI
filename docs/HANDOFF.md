# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. D-036 keeps checks/plans/docs lean.
Detailed evidence is in [STATUS.md](STATUS.md).

## Task26 workout flow

The user selected recommended Q14–Q16 and authorized all three (D-045).
Codex implemented the finish/History summary, Regular/Warm-up labels and remembered
exercise rest defaults. Summary volume includes every logged set. Progress records
use Regular sets. Missing kinds in older data mean Regular.

- Schema3 preserves strict v1/v2 reads without read-time writes or size growth.
  Set kinds travel through backup/restore and sync. Existing cloud projects need
  migration002. Apply both migrations in filename order for new projects, using
  [Supabase setup](../supabase/README.md). Update old app clients before syncing.
- Rest defaults use exact exercise names and existing duration presets, saved
  separately for guest/account on the device. Storage failures use session values
  with a notice. Timer clocks and auto-start remain session-only. Successful new
  sets use the exercise default for opt-in auto-rest. Manual exercise rest works too.
- Full checks passed 707 tests / 51 files. After compatibility/wording fixes,
  42 affected cases pass, covering the current 710-test inventory. Lint, build,
  guarded native sync (16 files/platform, 3 plugins), real PostgreSQL 17.11 and
  all 30 Chromium cases pass. Independent source review found no significant code
  defect and flagged the migration guide, now corrected. See STATUS for limits.

## Next work

1. User configures Supabase URL/publishable key in ignored `.env.local`, applies
   the two migrations and sets the email-code template using the guide. Dashboard,
   account and spending actions require coordination. Live service is unverified.
2. Verify real email sign-in and PC–iPhone manual sync, including offline edits,
   conflicts, labels and deletion. Phone work runs only with the user present.
3. Continue Q&A from Q17 or another approved feature. Automatic sync, account
   deletion, persisted analysis and live analysis need their own bounded work.

Task25 optional accounts/manual sync is built. Its 81b4362 hosted browser
42180714200 and native42180714184 passed. Check Actions for Task26 after integration.
Retain branches and the separate Task20 worktree. Task4 is incomplete and needs
explicit approval before integration.

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
