# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 11 (complete): type-check the build configuration files**
([D-027](DECISIONS.md#d-027-type-check-the-build-configuration-files)), on
`feat/task11-config-typecheck` from reviewed master `aec3cb2`. The user, still
away, asked the builder to keep working without frequent questions; D-027 records
this builder choice of the configuration task D-017 deferred. `npm run build`
did not check `vite.config.ts`/`vitest.config.ts` before Task 11 (both passed by hand); Task 11
points `tsconfig.node.json` at both, runs it in the build, and deletes the
unreferenced template `tsconfig.app.json`, whose settings fail on the real source.
No application source or dependency changes. Step 1 (D-027, plan) and Step 2
(wiring, `scripts/build-config.test.mjs`, **383 tests / 16 files**, lint,
guarded sync, three build mutations) and the fresh review (four Low documentation
findings, fixed) are done, and master is fast-forwarded to the reviewed result.
**Task 11 is complete.** Next: merge master into Task 8 (merge commit), then a
builder-selected PC task while the phone session waits. Follow-up recorded in
STATUS: `capacitor.config.ts` is still checked with the root DOM settings.
Read the
[plan](superpowers/plans/2026-11-04-config-typecheck.md); its checkboxes and Git
show the latest step. D-024 applies. One writer; reviewers read only.

## Task 8 phone test (separate branch, waiting for the user)

`feat/task8-safari-phone-test` at `9c06492` has merged reviewed master twice
(`3209025`, then `aec3cb2` with Task 10's badge), each with a merge commit keeping
both histories, and repeated 381 tests/lint/guarded sync. The user reported
**iOS 26.5.2**. Ignored `build/fixtures/` holds the five exported non-human
fixtures, their README and three generated S07/S08 inputs (`zero-byte.mp4`,
`corrupt.mp4`, `over-size.mp4`), all hash-checked against the phone plan. Task 8's
own HANDOFF/STATUS hold the details. Task 11 must never delay the phone session.

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
[Master run6](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41913320712)
(Task 10 source) compiled both platforms and passed its iOS simulator startup
job; its packages were not downloaded. [Run5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
verified visible iPhone 17 Pro/iOS 26.4 simulator startup, and its packages are
in ignored `build/artifacts/run-5/` (Task 9 source, without the badge). The simulator
ZIP cannot install on an iPhone; physical native workflow and offline inference
remain unverified. The workflow runs on pushes to `master` and
`feat/task6-mobile-app` only.

The user has an iPhone 12 Pro Max, no Android phone and no Apple Developer
Program membership; temporary Mac access is unconfirmed. No paid services,
signing setup, publication or human-video uploads.

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
this handoff. Write commit messages to a new file (Windows PowerShell 5.1 adds a
byte-order mark). No attribution trailers, force pushes or history rewrites.
Retain feature branches. GitHub default is still `feat/gymbro-video-landmarks`;
do not change settings. Detailed evidence remains in STATUS and Git history.
