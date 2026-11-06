# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024/D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed approved batch

Tasks32–37 implement all six recommended Q20–Q25 choices, D-051–D-056.
- Finished workout name/set corrections with explicit Save/Cancel and stale-save recovery.
- Routine name/exercise search and name/creation-order sorting.
- Optional session-only rest sound/vibration, off by default and capability-dependent.
- Home seven-day completed training summary, including warm-ups and separate lb/kg volume.
- Optional local-completion-day History calendar using existing filters.
- Completed actual-set CSV export through browser/native export ownership.

Three parallel Codex workers implemented the batch. One fresh source reviewer
found no significant defects. Final checks pass 824 tests/67 files with four
workers, full lint/build, native asset sync and all 36 Chromium cases.
An old global Home-statistics assertion was updated for the new summary.
Actual iPhone sound/vibration/sharing and native compilation remain unverified.

## Next work

Transfer to Claude Code. Q26–Q33 all A are approved under D-057, pending build.
Read their eight exact choices in PRODUCT_DIRECTION. Q&A resumes at Q34.
Plan shared saved-data extensions together before parallel UI work. Preserve
legacy libraries, backup/sync, independent routines and actual logged values.
Use fresh review for saved-data/export changes. Do not ask for approval again
for the eight accepted features. Start from updated origin/master.
Preserve all worker branches/checkouts and the incomplete Task4 branch.
Use isolated ownership and one browser suite on4179, previews on4183.
Assign task/decision numbers at integration and update shared docs once.

Supabase still needs user dashboard setup, both migrations and email-code
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
