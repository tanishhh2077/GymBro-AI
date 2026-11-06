# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024/D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed approved batch

Tasks38–45 implement all eight Q26–Q33 choices under D-057 (Claude Code, Opus 5.5,
three parallel agents with separate file ownership, then one integration branch).
- Workout notes (Q26): one optional note per workout, editable during and after
  training, shown in history and the summary.
- Reorder (Q27): Move up/down for active exercises; logged sets stay with them.
- Repeat (Q28): a finished workout starts a fresh one with the same exercises
  and targets, zero sets; previous-value hints appear automatically.
- Exercise detail (Q29): Progress opens per exact name and unit records, chart and
  completed-workout history.
- Unsaved changes (Q30): changed forms ask "Discard unsaved changes?" before
  navigation, Cancel or reload; unchanged and saved forms never ask.
- Target weight (Q31): optional planned load per routine exercise, copied into
  started workouts and shown apart from logged sets; never counted as actual work.
- Weekly consistency (Q32): completed workouts per Sunday–Saturday local week for
  the last 12 weeks on Progress.
- Name suggestions (Q33): previous workout names offered, custom names allowed.

Storage is schema4 (notes, target weights). Versions 1–3 still read with only an
in-memory version change; backup conflict checks and sync include the new fields.
A fresh storage review found no Blocker/High; its findings are fixed (routine
target weights kept on edit, conflict cards show notes/targets, revision-checked
note saves, CRLF normalised, unpaired surrogates rejected). Combined checks: 900
tests/74 files with four workers, lint, build, native sync (16 files per
platform) and all 37 Chromium cases (three specs now accept the new discard
prompt). **Supabase needs the third migration** `202611070001_notes_target_weight.sql`
before sync: updated clients save schema4. Phone behaviour remains unverified.

## Next work

No approved feature is pending. Q&A resumes at Q34 when the user asks. Preserve
all worker branches/checkouts and the incomplete Task4 branch. Use isolated
ownership, one browser suite on 4179 and previews on 4183, and assign
task/decision numbers at integration.

Supabase still needs user dashboard setup, all three migrations and email-code
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
