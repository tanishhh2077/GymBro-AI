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

## Prior art: openGym (read before copying anything)

openGym (github.com/DuarteSantos8/openGym, about 20k stars, in the App Store) is a
self-hosted workout tracker. It has no pose or video analysis, which is our difference.
It is **AGPL v3**; its App Store exception is the owner's and does not pass to us, so
**do not copy or adapt its code**. Safe: write our own Strong/Hevy/FitNotes import from
the apps' export formats; use MuscleMap (MIT, credit it) for a muscle diagram; use the
MIT exercise dataset hasaneyldrm/exercises-dataset after checking its own licence.
Never use its Gym visual exercise animations or stills. Contributing there needs
its CLA; propose first. Based on its NOTICE, CLA, roadmap and file list only.

## Task A complete, 2026-11-08

Schema6 screens are wired through the app. Home opens Body Log; active exercises
expose notes; sync confirms only after all workout/goal/body/note choices resolve;
backup previews show body/note counts; Routines imports/exports individual plans.
Routine files export v2 numeric superset groups and still read v1 boolean groups.
Fresh sharing review found adjacent-group loss and stale previews, both corrected.
Native routine sharing reuses the existing validated export adapter.

Checks pass 1790 tests with 3 existing skips/126 files, lint/build, native sync
(26 files/platform) and all 50 Chromium cases. Synthetic tests do not establish
physical-phone sharing, live sync or real-bench accuracy.

## Next work

1. Restore the reverted fix/goals-account-a11y changes and correct unsafe conflict
   ARIA IDs and focus restoration after disabled sync/guest-copy buttons re-enable.
2. Task B standalone Strong/Hevy/FitNotes CSV importer is implemented on
   feat/workout-export-imports. Wire Backup entry, review final integration,
   verify and integrate after Task A. See its format provenance document.
3. Task C muscle diagram is optional and has not been implemented.

Keep Task4 and all other worker branches/worktrees. No paid services, media
uploads, signing or settings changes are authorized. Supabase setup still needs
the user and all five migrations. Phone/media work requires user presence.

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
