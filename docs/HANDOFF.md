# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 13: reproducible non-human browser checks** (D-029), on
`feat/task13-browser-checks` from reviewed master `1c44729`, in sibling worktree
`GymBro AI-task13`. User approved the explanation and said "Clear just start
working". Explain meaningful steps and proceed with routine PC implementation;
coordinate device/account/settings actions. One writer; reviewers read only.

Read the [design](superpowers/specs/2026-11-04-browser-smoke-design.md) and
[plan](superpowers/plans/2026-11-04-browser-smoke.md). Fresh clean locked install
on process-local Node 22.23.2: **385 tests / 17 files**, lint and build pass.
Step 1 design review is ready with no blockers; next is the fixed-pattern Playwright suite and
hosted checks. No application behavior change, native sync, LAN listener or
private-video processing. Task 4 stays incomplete and unmerged. Selected safe
patterns/tests may be ported from `34538e4` with provenance.

Claude's Tasks 10–12 are complete on master. A fresh Codex audit found no material
defects (45 focused tests); this session also ran all 385 tests/lint/build in the
Task 8 checkout and in the new clean worktree. Follow-up: `capacitor.config.ts`
is still checked with root DOM settings; separate future task if justified.

## Task 8 phone test (separate branch, waiting for the user)

`feat/task8-safari-phone-test` at `4a752dd` has merged reviewed master four times
(Tasks 9–12), each with a merge commit keeping both histories; its non-Markdown
tree equals master `1c44729`. Its last checks were 385 tests/lint/guarded sync. The user
reported **iOS 26.5.2**. Ignored `build/fixtures/` holds the five exported
non-human fixtures, their README and three generated S07/S08 inputs
(`zero-byte.mp4`, `corrupt.mp4`, `over-size.mp4`), all hash-checked against the
phone plan. Task 8's own HANDOFF/STATUS hold the details. Task 13 must never delay
the phone session.

With the user present: agree a trusted private network (home Wi-Fi or Personal
Hotspot; the PC is on Public campus Ethernet UWNet), bind preview 5195 and fixture
server 5196 only to that address, verify reachability, transfer fixtures, and run
the Safari cases. No LAN listener, phone transfer or Safari case has run.
Firewall/VPN/router prompts are the user's decision.

## Product boundaries

One local side-view bench-press MP4. Existing MediaPipe 0.10.35 model/runtime,
bounded decoding/cancellation, synchronized player/overlay, image-space elbow
measurements and Task 9's clip summary. No backend, accounts, saved sessions,
reps or form verdicts. Summary availability is not accuracy confidence; observed
extrema can include tracking errors and are not per-rep ROM or 3D anatomy.

Capacitor 8.6.0/App 8.1.2 prototypes use appId `com.gymbroai.app`, version 0.1.0.
[Master run8](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41938020495)
(Task 12 source `1c44729`) passed shared checks, Android compilation and iOS
simulator startup; packages were not downloaded. [Run5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
verified visible iPhone 17 Pro/iOS 26.4 simulator startup, and its packages are
in ignored `build/artifacts/run-5/` (Task 9 source, without the badge). The simulator
ZIP cannot install on an iPhone; physical native workflow and offline inference
remain unverified. The workflow runs on pushes to `master` and
`feat/task6-mobile-app` only.

The user has an iPhone 12 Pro Max, no Android phone and no Apple Developer
Program membership; temporary Mac access is unconfirmed. No paid services,
signing setup, publication or human-video uploads.

Task 4 remains at `feat/task4-browser-acceptance` / `34538e4`. The user now expects
to supply a video later; none has arrived. Permission/privacy, framing, encoding,
real inference and manual lifter-landmark identity checks remain open.
Do not merge the incomplete branch for tooling or call M1 bench acceptance done.

## Verification and Git

Use process-local Node 22.23.2: prepend `$env:NVM_HOME\v22.23.2` (under
`%LOCALAPPDATA%\nvm`, not `%APPDATA%`) to `PATH` and confirm `node -v` prints
v22.23.2 before checks; never switch
global Node 20 with `nvm use`. Leave the existing listeners alone: an unrelated
project's Vite on `[::1]:5173` and this checkout's dev server on `127.0.0.1:5193`
(they lock `node_modules` files, so `npm ci` would fail while they run).
Run tests/lint/build before each green step commit, push, and update STATUS and
this handoff. Write commit messages to a new file (Windows PowerShell 5.1 adds a
byte-order mark). No attribution trailers, force pushes or history rewrites.
Retain feature branches. GitHub default is still `feat/gymbro-video-landmarks`;
do not change settings. Detailed evidence remains in STATUS and Git history.
