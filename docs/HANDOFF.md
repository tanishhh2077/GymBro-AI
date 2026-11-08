# GymBro AI current handoff

Updated 2026-11-07, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024/D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed approved work (Q49–Q56 phase 1, D-059)

Claude Code (Opus 5.5) built these with separate agents and worktrees, each
merged after its checks; storage and the installable app also got a fresh review.
- Warm-up suggestions (Q52) and elapsed workout time (Q53).
- Reduced motion, text size (Q56) and a weekly workout target (Q54), all device-local.
- Schema6 storage (Q50, Q51): body log and exercise notes, backup, sync and the
  fifth Supabase migration. **No screens use it yet.**
- Installable web app (Q49): manifest, icons, offline-start service worker.
Gemini (Antigravity) delivered small test and accessibility branches, reviewed and
merged. Q38 rep counting and Q41 health export are deferred (D-058).

Checks on the integrated master: 1314 tests/106 files with four workers, lint,
native sync (20 files per platform), database tests and all 42 Chromium cases.
**Supabase needs all five migrations in order** before sync. Not verified in a real
browser or on a phone: installing, offline start, offline analysis, iOS storage.

## Utility integration (Q42–Q48, D-060)

Equipment profiles, custom/adjustable rest, favourites/equipment filters, Home
Help and opt-in weekly reminders are integrated on codex/q42-q48. Export requests
leave reminders due; Mark as done explicitly schedules the next week. Device-local
settings remain outside schema6 workout records, backup and sync. Pushed to master
as dc63adc after merging df88032. Checks: 1360 tests/111 files, lint, build and
native sync (20 files/platform). Browser: 45/48 in the full run; all four cases
in affected specs passed after two test-readiness fixes. Fresh source review found
no significant defects. Full evidence and the initial timeout are in STATUS.

## Next work

1. Screens for schema6: body log (weight, measurements, trend), exercise notes in
   the editor, sync-conflict choosers for body and note conflicts in AccountPanel,
   and the new backup counts in the restore preview (`addedBodyEntries`,
   `addedExerciseNotes`, `skippedExerciseNotes`).
2. Q55: export and import one routine as a small file.
3. Q42–Q48 is integrated under D-060. Keep its branch/worktree; no utility work
   remains pending. The original master checkout was left untouched.
Q&A resumes at Q57. Q38 needs the user present with private bench videos. Preserve
all worker branches and the incomplete Task4 branch; one browser suite on 4179.

Supabase still needs user dashboard setup, all five migrations and email-code
configuration in [the guide](../supabase/README.md). Live email and real
cross-device sync remain unverified. Phone/media work requires user presence.

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
