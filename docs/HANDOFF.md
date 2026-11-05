# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS first.

## Current task

**Provider handoff: user hit the Codex subscription limit and explicitly asked
Claude Code to take over. Codex is stopping development after this handoff.**
Continue in this `GymBro AI-task14` worktree, not the original phone checkout.
The Codex Q&A automation `resume-gymbro-ai-design-q-a` is PAUSED to avoid further
Codex usage; Claude should resume Q8 when the user is available, not assume a
Claude-side reminder has been scheduled.

Task 14, local workout logging/Home, on `feat/task14-workout-logging` in the
isolated `GymBro AI-task14` checkout from reviewed master `a524387`. User answered
seven MCQs and explicitly authorized building while busy; no more questions
until the user is available (originally around 23:28 Chicago). Resume at Q8, MCQ with a
recommendation and reason. See [PRODUCT_DIRECTION](PRODUCT_DIRECTION.md), D-030,
[design](superpowers/specs/2026-11-04-workout-logging-design.md) and
[plan](superpowers/plans/2026-11-04-workout-logging.md). Fresh design review ready.

Clean Node 22.23.2 install/baseline: 391 tests, lint/build passed. New local
transactional workout contracts/repository/store pass 46 focused tests and
**437 total tests / 21 files**, lint/build at foundation commit `f03ffc2`.
Home/editor/history UI is now connected. Current shared checks: **448 tests /
22 files**, lint and guarded sync/build (418 modules, 11 files/platform) pass.
Full local **13-case browser suite** passed on `5949c24`, including existing real inference,
navigation away/back, reload/history, two-tab conflict and long names at390px.
Fresh review's Medium size/revision boundary bug is fixed with a RED/GREEN
regression in `efa0c04`; 448 tests/lint/guarded sync pass on that source. The full
local browser suite was not repeated after this one-line boundary fix. Final
hosted verification is pending:

- [Browser run4](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41972437861)
- [Native run11](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41972437881)

Both were in progress at provider transfer, source `efa0c04`. Prior run3/native10
were cancelled by normal superseding workflow concurrency, not failures. Fresh
design/code reviews are complete; no unresolved finding. **Next: inspect final
hosted results, fix supported failures if any, record actual outcomes, then
integrate reviewed master per D-018 and incorporate it into Task8 preserving
history. Do not reimplement finished work or repeat a full review without a new
material change.** No media/pose
persistence, cloud/account/social/live feature, new AI lift or form claim.
Units/navigation/storage defaults are builder choices pending further Q&A.
The remaining first-release wishlist is in PRODUCT_DIRECTION; this slice does
not implement routines/timers/charts/PRs/set-linked analysis or live analysis.

## Open acceptance and preserved work

Original checkout remains `feat/task8-safari-phone-test` at `8151248`, with
non-human fixtures in ignored `build/fixtures/` and the current phone plan.
User will supply trusted hotspot/video later; no actual phone/network/settings
or human-media action yet. iPhone12ProMax, reported iOS26.5.2, no Android phone,
Apple membership or owned Mac. Coordinate private-network ports5195/5196 only
when user returns; don't expose campus Public Ethernet or change firewall/VPN.

Task 13's 391 tests and ten real non-human browser cases pass on Windows and
Ubuntu; native run9 for `a524387` passes shared checks, Android and iOS simulator
startup. This is the old video-only interface, not Task14 UI/device validation.
Task4/bench M1 remain open; no accepted human fixture. Treat offered media as
private; no uploads/commits of footage, frames or pose traces. Later set-linked
analysis, routines, timers/charts/PRs and final styling remain unimplemented.

## Environment

Use process-local Node22.23.2 under `%LOCALAPPDATA%/nvm/v22.23.2`; never global
`nvm use`. Original listeners5173/5193 stay. Full tests/lint/build before each
green commit/push, fresh code review before master integration, no attribution
trailers/force pushes/branch deletion. Task8 must incorporate reviewed Task14
before its phone session; keep both published histories. One writer/reviewers
read-only. Shared AGENTS/CLAUDE imports and Markdown are the provider handoff.
