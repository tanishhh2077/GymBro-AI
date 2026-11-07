# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024/D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Completed approved batch

Tasks46–51 implement Q34–Q37, Q39 and Q40 under D-058 (Claude Code, Opus 5.5;
five agent branches with separate file ownership, one integration branch).
- RPE (Q34): optional 1–10 effort per set; never changes records or volume.
- Supersets (Q35): group adjacent exercises; moves keep a group together.
- Bodyweight (Q36): weight is added load, negative for assistance; records,
  history and previous values keep bodyweight and loaded entries apart.
- Goals (Q37): one goal per exercise, unit and bodyweight setting, with progress
  from actual Regular sets only.
- First-run intro (Q39): three skippable screens; "Show intro again" on Home.
- Unit display (Q40): converted weight shown as "≈ …", display only.
Q38 rep counting and Q41 health export are deferred (see D-058).

Storage is schema5. Fresh storage reviews of schema4 and schema5 found no
Blocker/High; their findings are fixed. Combined checks: 990 tests/83 files
with four workers, lint, build, native sync (16 files per platform), database
tests and all 40 Chromium cases. **Supabase needs all four migrations in
order** before sync; updated clients save schema5. Phone behaviour unverified.

## Next work

No approved feature is pending. Q&A resumes at Q42 when the user asks. Q38 needs
the user present with their private bench videos (kept outside the repository).
Backlog: removing one member of a two-exercise superset drops the other's unsaved
set entry without a prompt; goal edits refuse after any other save while open.
Preserve all worker branches/checkouts and the incomplete Task4 branch; use
isolated ownership, one browser suite on 4179 and assign numbers at integration.

Supabase still needs user dashboard setup, all four migrations and email-code
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
