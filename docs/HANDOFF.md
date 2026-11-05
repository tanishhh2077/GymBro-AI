# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 12 (complete): remove unrendered legacy code and template assets**
([D-028](DECISIONS.md#d-028-remove-unrendered-legacy-code-and-template-assets)), on
`feat/task12-legacy-cleanup` from reviewed master `eaf87e1`. The user, still away,
asked the builder to keep working toward completion without frequent questions;
D-028 records this builder choice. It deletes `ExercisePicker.tsx`, `App.css`,
Vite template images/SVGs and the unused score-bearing analysis types, and
narrows the lift/view/source types and metadata to bench/side/upload. Nothing
visible changes. Read the [plan](superpowers/plans/2026-11-04-legacy-cleanup.md);
its checkboxes and Git show the latest step. Step 1 (D-028, plan) and Step 2
(unreferenced files deleted, plus the picker-only lift icons; 383 tests, lint,
guarded sync with 11 verified files per platform) and Step 3 (types/metadata
narrowed, unused analysis types deleted, **385 tests / 17 files**) are done; next
is Step 4: the browser check (screens match Task 10's) and fresh review (six Low
documentation findings, fixed) are done, and master is fast-forwarded to the
reviewed result. **Task 12 is complete.** Next: merge master into Task 8, then
the phone session when the user is present. D-024 applies. One writer;
reviewers read only.

Task 11 (D-027, the build's Vite/Vitest config type-check) is complete on master
`eaf87e1`; [native run7](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41936252985)
for that commit passed all three jobs (shared checks, Android APK, iOS simulator
build/startup); packages not downloaded (needs a signed-in account). Pushing
Task 12 to master starts another run. Follow-up: `capacitor.config.ts` is still checked with the root DOM settings.

## Task 8 phone test (separate branch, waiting for the user)

`feat/task8-safari-phone-test` at `398b5c0` has merged reviewed master three times
(Task 9, Task 10's badge, Task 11's config check), each with a merge commit
keeping both histories, and repeated 383 tests/lint/guarded sync. The user
reported **iOS 26.5.2**. Ignored `build/fixtures/` holds the five exported
non-human fixtures, their README and three generated S07/S08 inputs
(`zero-byte.mp4`, `corrupt.mp4`, `over-size.mp4`), all hash-checked against the
phone plan. Task 8's own HANDOFF/STATUS hold the details. Task 12 must never delay
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
