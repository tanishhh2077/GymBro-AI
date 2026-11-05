# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 8: the phone plan's free Safari slice** (Step 1 of the
[phone test plan](superpowers/plans/2026-11-04-phone-video-acceptance.md)), on
`feat/task8-safari-phone-test`. Approved by the user on 2026-11-04;
[D-024](DECISIONS.md#d-024-explain-and-proceed-without-routine-is-this-clear-checkpoints)
waives routine "Is this clear?" stops, but every phone, account, network or
settings action is coordinated with the user. Do not merge Task 4.

The branch has merged reviewed master four times with merge commits that keep
both published histories: `3209025` (Task 9), `aec3cb2` (Task 10, the
processing-time badge, D-026), `eaf87e1` (Task 11, D-027: the build also
type-checks the Vite/Vitest config files) and `1c44729` (Task 12, D-028: unrendered
legacy code, unused analysis types and template assets removed; screens
unchanged). Its non-Markdown files equal master, so those tasks' fresh reviews
cover the merged code; native run7 passed for Task 11's source. Under
process-local Node 22.23.2: **385 tests / 17 files**, lint and guarded
`mobile:sync` (build, 411 modules, 11 verified shared files per platform) pass.
Details are in STATUS, "Task 8 merge of reviewed master (Task 12)".

During the phone session, a completed clip shows "Processing took N seconds on
this device"; record it as the plan's elapsed-time observation (one run; whether
iOS keeps counting during suspension is unverified).

PC preparation is complete: the five first-party non-human fixtures plus their
provenance README sit in ignored `build/fixtures/`, exported from `34538e4`, and
every SHA-256 still matches the plan. Seven desktop Edge preflight cases and a
forwarded insecure-origin GPU check passed earlier (pause/seek actions exercised,
final seek state not asserted). These are PC evidence, not Safari/LAN/native or
bench passes. The plan was amended to add three generated non-media inputs
for S07/S08 (`zero-byte.mp4`, `corrupt.mp4`, `over-size.mp4`, exact bytes and
hashes in the plan); desktop Chromium confirmed their intended rejection and
read-failure paths, and a fresh review's three Low findings are fixed.

The user reported the iPhone 12 Pro Max runs **iOS 26.5.2** (Settings, 2026-11-04).

**Next action, with the user present:**
1. Agree on a trusted private connection: home Wi-Fi or the iPhone's Personal
   Hotspot. The PC is still on Ethernet UWNet, Windows category **Public** (a
   campus network); do not serve on it.
2. Re-detect the PC's private address on that connection, check ports 5195/5196
   are free, and bind the production preview (5195) and fixture server (5196)
   only to that address, as the plan's commands specify.
3. Verify the phone can reach the PC, transfer the fixtures, then run Step 2's
   Safari cases with the user, recording each as passed/failed/blocked/not run.

Do not change firewall/VPN/router settings automatically; prompts are the user's
decision. No LAN listener, phone transfer or Safari case has run.

## Product boundaries

One local side-view bench-press MP4. Existing MediaPipe 0.10.35 model/runtime,
bounded decoding/cancellation, synchronized player/overlay, image-space elbow
measurements and Task 9's clip summary (measurable sample counts, lowest/highest
observed 2D angles with jumps to their timestamps; design and plan in
`docs/superpowers/`, D-025) and Task 10's observed processing-time badge
(D-026; one run's value, not a benchmark). No backend, accounts, saved sessions, reps or form
verdicts. Summary availability is not accuracy confidence; observed extrema can
include tracking errors and are not per-rep ROM or 3D anatomy.

Capacitor 8.6.0/App 8.1.2 prototypes use appId `com.gymbroai.app`, version 0.1.0.
[Master run7](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41936252985)
(Task 11 source `eaf87e1`) and run6 (Task 10 source) compiled both platforms and
passed their iOS simulator startup jobs; their packages were not downloaded (that
needs a signed-in account). Master `1c44729` (Task 12) started a further run.
[Run5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
verified visible iPhone 17 Pro/iOS 26.4 simulator startup with Xcode 26.6/17F113;
its packages are in ignored `build/artifacts/run-5/` (Task 9 source, no badge).
The simulator ZIP cannot install on an iPhone; physical native workflow and
offline inference remain unverified. Pushing this branch does not trigger the
workflow (only `feat/task6-mobile-app` and `master` do).

## Resources and limits

The user has an iPhone 12 Pro Max, no Android phone and no Apple Developer
Program membership; temporary Mac access is unconfirmed. No paid services,
signing setup, publication or human-video uploads. Safari success is not
native-app or bench-accuracy validation.

Task 4 remains at `feat/task4-browser-acceptance` / `34538e4`; licensed bench
footage is still missing. The user cannot record one; do not ask again.
Do not merge the incomplete branch for tooling or call M1 bench acceptance done.

## Verification and Git

Use process-local Node 22.23.2: prepend `$env:NVM_HOME\v22.23.2` (under
`%LOCALAPPDATA%\nvm`, not `%APPDATA%`) to `PATH` and confirm `node -v` prints
v22.23.2 before checks; never switch
global Node 20 with `nvm use`. Leave the existing listeners alone: an unrelated
project's Vite on `[::1]:5173` and this checkout's dev server on `127.0.0.1:5193`
(they lock `node_modules` files, so `npm ci` would fail while they run).
Run tests/lint/build before each green step commit, push, and update STATUS and
this handoff. Stage only the step paths, no media/signing files/private data.
No attribution trailers, force pushes or published-history rewrites. Retain
feature branches. Task 8 reaches master only after its acceptance and fresh
review resolve. GitHub default is still `feat/gymbro-video-landmarks`; do not
change settings. Detailed earlier evidence remains in STATUS and Git history.
