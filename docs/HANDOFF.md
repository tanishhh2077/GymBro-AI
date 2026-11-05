# GymBro AI: current handoff

Updated2026-11-05 America/Chicago. Read root/scoped AGENTS first.

## Current task and next action

Task16 saved routines are implemented and freshly reviewed, source4c1b519,
branch feat/task16-saved-routines in isolated GymBro AI-task16 from master7d97ac6.
Original checkout remains clean Task8 at0895f32; do not merge Task8/Task4 into master.
User approved the three proposed routine features with "Yes create all of that"
(D-034), then hit the Codex five-hour limit and requested transfer to Claude Code.
Codex stops development after this handoff. Continue in THIS Task16 worktree;
original Task8 checkout still contains Task15 only. Master has NOT advanced yet.

Local494tests/26files,lint/build,guarded mobile sync and17 real browser cases
(3.5minutes) pass. Fresh design review ready/no findings; fresh code review no
significant findings, independently77tests/8files pass. Requested code reviewer
gpt-6-astra, actual runtimeID unavailable. No production change after review.

Hosted gates have BOTH PASSED on exact source4c1b519:
- Browser run8: https://github.com/tanishhh2077/GymBro-AI/actions/runs/41983009261
- Native run15: https://github.com/tanishhh2077/GymBro-AI/actions/runs/41983009299

Browser8 passes494shared checks/all17browser cases; native15 passes shared checks,
Android/iOS compile and visible empty Home simulator startup. No package download
or physical-device validation. Do not repeat implementation or fresh reviews.

Claude's next task: finish Step3 documentation/master and original Task8 preserved-
history integration per D-018/D-019. The final handoff commit changes Markdown
only after reviewed source4c1b519; local final494tests/lint/build also passed.
Use authorized reviewed fast-forward/push master, then merge that master into
original Task8 preserving histories and any original Task15 integration notes.
Check git status first; only documented work is present. Verify merged non-Markdown
source matches master and run required checks before green merge commit/push.
Keep final docs
consistent, verify merged source/checks, retain branches, remove clean temporary
worktree. Native compile/startup is separate from physical-phone behavior.

## Implemented behavior and data boundaries

Home keeps equal Start workout/Analyze video actions and now adds Manage routines;
Routines also has its own navigation entry. Create/edit/delete named local plans,
order exercises, add independently optional integer set/rep targets, explicit
lb/kg. Starting copies fresh workout/entry IDs, order/unit/targets and EMPTY actual
sets. Active/history snapshots never change when a template is edited/deleted.
Targets are displayed separately; only actually logged sets count. An active
workout blocks another routine start. Delete confirms; failed saves retain fields.
The editor retains its opening revision even after reload and requires reopening
a stale draft. Existing rest timer/analysis lifecycles remain independent.

Document schema2 uses the SAME IndexedDB database version1 (gymbro-workouts,
library/current). Strict v1 reads change only the version digit in memory, with
no writes/defaults/size growth, so exact1,000,000-character records stay readable.
Optional routines means empty. Next explicit successful save persists v2 using
atomic revision/final-size checks; unknown/corrupt/future data is never overwritten.
Old app code must update/reload, not strip v2 fields. Routines<=100, exercises<=100,
optional targetSets1-100 and targetReps1-1000; existing workout bounds unchanged.
No runtime dependency, media/pose persistence, cloud/account/native-plugin change.

Design, plan, schema review and code review are dated2026-11-05-saved-routines in
docs/superpowers. Detailed command evidence/history is in STATUS. UI inspected
390/1280, no overflow; four synthetic previews preserved in original ignored
build/visual-review/task16. Owned loopback4183 server was identity-checked/stopped;
unrelated servers untouched. Browser harness captures/uploads remain off.

## Accepted direction and remaining work

PRODUCT_DIRECTION records Q1-Q9. Tracking and AI equally central; mixed experience,
linked/standalone analysis intended, Home actions plus compact dashboard, full
personal tracking/community deferred, bench-only AI first release, post-video now
and live later. Q8 accepts guest use plus optional accounts/sync; Q9 restricts sync
to workout records, no video uploads. Accounts/sync are NOT implemented. Routines
are now Task16; charts/PRs, set-linked persistence and final styling remain future.
Q&A resumes at Q10 when requested; do not block approved routine work on it.
The one-time Q&A reminder was fulfilled/paused; no duplicate/Claude task is active.

Task15 manual rest timer is session-only, manual presets/start/pause/resume/reset,
retained across screens, reset on reload/restart or successful finish/discard;
completion in-app, no background alert. Task14 local logging/history and the
standalone bench video/overlay/elbow observations remain. No rep/form verdict,
medical claim, validated bench accuracy or complete release claim.

## Phone/video acceptance remains open

User will provide hotspot/video later; do not ask again now. iPhone12ProMax,
reported iOS26.5.2; no Android phone, paid Apple membership or owned Mac. Follow
reviewed2026-11-04-phone-video-acceptance plan only with user present: trusted
private connection, re-detect address, ports5195/5196 bound only there. Campus
Ethernet was Public; no LAN exposure/firewall/VPN/router change. No physical
Safari/native cases have run. Simulator ZIP is not an installable iPhone app.

Original ignored build/fixtures holds first-party patterns/S07/S08/provenance.
Human bench footage is not accepted yet: private by default, permission/framing/
codec/inference and manual lifter-landmark identity checks remain. Never upload or
commit footage, frames or pose traces. M1 and phone performance remain unverified.

## Environment and Git

Use process-local Node22.23.2 from LOCALAPPDATA/nvm/v22.23.2, preserve global Node.
Full tests/lint/build before green step commits, no attribution trailers/force
pushes/branch deletion. Keep Task8/Task4 and feature histories. GitHub default
still feat/gymbro-video-landmarks; no settings/signing/payment/publication changes.
