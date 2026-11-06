# GymBro AI current handoff

Updated 2026-11-06, America/Chicago. Read root/scoped AGENTS.md first.
Follow D-024 and D-036. Detailed evidence is in [STATUS.md](STATUS.md).

## Integrated Tasks27–29

Q17–Q19's three user-managed agent branches are integrated together and checked.

- Task27/D-046 adds case-insensitive workout/exercise-name search and inclusive
  local completion-date filters. Direct workout links resolve against full history.
- Task28/D-047 adds All time and rolling one/three/six-calendar-month Progress.
  Cards, charts, tables and counts share the selected period. The displayed cutoff
  refreshes on mount/period changes. Empty periods preserve exercise/unit selection.
- Task29/D-048 adds the collapsible plate calculator to WorkoutEditor. It uses
  editable bar weight, target and plate-pair inventory in the workout unit. Exact
  solutions minimize plates. Inputs remain local to the screen.

Combined checks pass 763 tests/57 files, lint, build, guarded native sync
(16 files/platform, 3 plugins) and all 31 Chromium cases. Three independent
source-only reviews found no significant defects. The new browser case verifies
all three features together. See STATUS for limits and source branch hashes.

## Next work

The exercise-history agent can create a fresh branch/worktree from updated
origin/master containing the calculator. Preserve its WorkoutEditor integration.
Routine duplication and completed-workout correction are the other proposed
agent tasks. Assign task/decision numbers only when integrating completed work.

Use separate worktrees and branches. Shared docs update at final integration.
Only one browser suite may use 4179, with previews on 4183. Merge one at a time.
Retain existing worker worktrees and branches. The incomplete Task4 branch needs
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
