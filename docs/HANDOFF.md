# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 8: the phone plan's free Safari slice** (Step 1 of the
[phone test plan](superpowers/plans/2026-11-04-phone-video-acceptance.md)), on
`feat/task8-safari-phone-test`. Approved by the user on 2026-11-04;
[D-024](DECISIONS.md#d-024-explain-and-proceed-without-routine-is-this-clear-checkpoints)
waives routine "Is this clear?" stops, but every phone, account, network or
settings action is coordinated with the user. Do not merge Task 4.

The branch has merged reviewed master `3209025` (Task 9) with a merge commit that
keeps both published histories. Its non-Markdown files are identical to master,
so Task 9's fresh code review covers the merged code. Under process-local Node
22.23.2: **366 tests / 15 files**, lint and guarded `mobile:sync` (build, 411
modules, 13 verified files per platform) pass; the 13 rebuilt `dist/` files match
the master run5 APK byte-for-byte. Details are in STATUS, "Task 8 merge of
reviewed master".

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
`docs/superpowers/`, D-025). No backend, accounts, saved sessions, reps or form
verdicts. Summary availability is not accuracy confidence; observed extrema can
include tracking errors and are not per-rep ROM or 3D anatomy.

Capacitor 8.6.0/App 8.1.2 prototypes use appId `com.gymbroai.app`, version 0.1.0.
[Master run5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
compiled both platforms and verified visible iPhone 17 Pro/iOS 26.4 simulator
startup with Xcode 26.6/17F113. Latest ignored packages/image are in
`build/artifacts/run-5/`; Android APK SHA-256:
`91a0a19de40a5616a90f8776fd9d52dcde925699d63a87982217c55447bed9c9`.
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

Use process-local Node 22.23.2 (prepend its nvm folder to `PATH`); never switch
global Node 20 with `nvm use`. Existing listeners at the merge: an unrelated
project's Vite on `[::1]:5173` and this checkout's dev server on
`127.0.0.1:5193`; leave both alone, and note they lock `node_modules` files.
Run tests/lint/build before each green step commit, push, and update STATUS and
this handoff. Stage only the step paths, no media/signing files/private data.
No attribution trailers, force pushes or published-history rewrites. Retain
feature branches. Task 8 reaches master only after its acceptance and fresh
review resolve. GitHub default is still `feat/gymbro-video-landmarks`; do not
change settings. Detailed earlier evidence remains in STATUS and Git history.
