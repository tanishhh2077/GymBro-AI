# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 8: coordinated iPhone Safari testing**, on `feat/task8-safari-phone-test`.
The user will provide the hotspot connection and a video later. Do not ask again
now. D-024 and the latest "Clear just start working" authorize routine PC work;
phone/account/network/settings actions still require coordination. One writer,
read-only reviewers. No LAN listener, phone transfer or Safari case has run.

Reviewed master `a524387` (Task 13) is merged with preserved history, after the
four merges of Tasks 9-12. All non-Markdown files equal that master. This checkout
passes **391 tests / 18 files**, lint, build (411 modules) and read-only mobile
verification (11 shared files per platform). Keep Task 8
unmerged into master until its own acceptance/review resolves. Task 4 is also
incomplete/unmerged; do not merge it for tooling.

**Next action when the user returns:** follow Step 2 of the
[phone plan](superpowers/plans/2026-11-04-phone-video-acceptance.md). Agree a
trusted private connection (home Wi-Fi or iPhone Personal Hotspot), re-detect the
PC's address on it, check ports 5195/5196, and bind preview/fixture servers only
to that address. The PC was on Public campus Ethernet UWNet; do not expose it
there. Verify phone reachability, transfer non-human fixtures, and record Safari
cases as passed/failed/blocked/not run. Firewall/VPN/router prompts are the user's
decision; do not change settings automatically.

The phone is an **iPhone 12 Pro Max, user-reported iOS 26.5.2**. No Android phone,
Apple Developer membership or owned MacBook; temporary Mac access unconfirmed.
The installed native app remains a separate signing/device gate. No paid services,
signing credentials or store release. A simulator ZIP cannot install on iPhone.

## Completed PC work

Claude's Tasks 10-12 (processing-time badge, build-config checks, legacy cleanup)
are on master and freshly audited by Codex: no material defect, 45 focused tests.
Task 13 adds a maintained real-browser smoke command, exact Playwright 1.64.1,
fixed pattern integrity preflight, typed test config and hosted checks. Its
[design](superpowers/specs/2026-11-04-browser-smoke-design.md),
[plan](superpowers/plans/2026-11-04-browser-smoke.md) and
[code review](superpowers/specs/2026-11-04-browser-smoke-code-review.md) hold details.

Task 13: **391 tests / 18 files**, lint/build, **10 browser cases** pass locally
and in [Ubuntu run 1](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41947939605).
Browser 156.0.8078.4, GPU delegate label, 120 no-person samples; no hardware or
phone-performance claim. Fresh review's one Low wording finding is resolved.
Screenshots/video/traces/page snapshots are off. Failure/source diagnostics are
temporary and removed; last-run metadata may remain. No human inputs are allowed.

```sh
npx playwright install chromium
npm run test:browser
```

This owns strict loopback 4179 without reusing/stopping another server. It tests
dev-server decoding/model/player integration with fixed non-human patterns only.
No native/Safari, offline, rotated-metadata or useful lifter-landmark claim.

Ignored `build/fixtures/` retains the five non-human patterns/provenance plus
S07/S08 inputs `zero-byte.mp4`, `corrupt.mp4`, `over-size.mp4`, hash-checked against
the phone plan. The earlier seven Edge preflight cases and insecure-origin GPU
check are PC evidence. Task 13 additionally asserts actual pause/seek state.

[Native run 8](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41938020495)
for Task 12 `1c44729` passed shared checks, Android compile and iOS simulator
startup. Packages were not downloaded. Ignored `build/artifacts/run-5/` contains
older Task 9 packages, without the processing badge. Task 13 changes tooling,
not app/native sources; later master workflows are separate evidence. Pushing
Task 8 does not trigger these workflows; do not change repository settings.
[Master browser run 2](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41948751190)
for `a524387` also passed: 391 tests/lint/build and 10 browser cases in 5.6 minutes,
same browser/GPU delegate label/120 no-person samples. Native run 9 (`41948751280`)
has passed shared checks and Android compilation; iOS simulator startup is still
running. Do not report the whole native run as passed yet.

## Video and product boundaries

Task 4 remains at `34538e4`. The user now expects to supply a video, superseding
the earlier unavailability. Treat it as private by default: review permission,
framing and encoding locally when supplied, then run actual inference and manual
shoulder/elbow/wrist-to-lifter identity checks. Never upload/commit human footage,
frames or pose traces. No real bench fixture has been accepted yet; M1 is open.

One local side-view bench MP4, MediaPipe 0.10.35, bounded jobs/cancellation,
synchronized overlay/player, image-space elbow traces/summary and observed
processing-time badge. No backend, accounts, persistence, reps or form verdicts.
Sample counts are availability, not confidence; extrema are not per-rep ROM or
measured 3D anatomy. Safari success will not prove native or bench accuracy.

## Later product-design discussion

The user mentioned Hevy as a future direction and wants a detailed Q&A about
features and appearance (roughly 15-30 questions if useful). They explicitly
deferred that conversation: focus on the current validation task first. The
meaning of the Hevy reference, feature selection and visual direction remain
open; clarify them during that later discussion before implementation.

## Environment and Git

Use process-local Node 22.23.2 from `%LOCALAPPDATA%/nvm/v22.23.2`; never `nvm use`
or change global Node 20. Existing Vite listeners `[::1]:5173` (other project)
and `127.0.0.1:5193` (this checkout) must stay. Avoid `npm ci` here while their
locks are active. Full tests/lint/build before every green commit; no attribution
trailers, force-pushes, branch deletion or history rewrites. Retain all task
branches; GitHub default remains `feat/gymbro-video-landmarks`. Detailed history
and exact merge evidence are in STATUS. Markdown is the Claude/Codex handoff.
The temporary sibling worktree was removed after its reviewed changes reached
master and this checkout; all task branches remain. Continue in this folder.
