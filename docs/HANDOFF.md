# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task and next action

**Task 10: observed processing time** ([D-026](DECISIONS.md#d-026-show-the-observed-processing-time-for-a-completed-clip)),
on `feat/task10-processing-time` from reviewed master `3209025`. While the user is
away, they asked the builder to find PC-side work; D-026 records this builder
choice. When a clip finishes, the player shows one badge, "Processing took N s on
this device", measured with a monotonic clock from admission to the completed
result. It is a single-run observation, not a benchmark. Read the
[design](superpowers/specs/2026-11-04-processing-time-design.md) and
[plan](superpowers/plans/2026-11-04-processing-time.md). D-024 applies: explain
and proceed; stop only for phone/account/settings/spending/publication actions.

Progress: Step 1 (design, fresh design review adopted) and Step 2 (store clock,
`Clip.processingMs`, badge; **379 tests / 15 files**, lint, guarded sync pass)
are done. Next: Step 3, real no-person browser check at wide and narrow widths,
fresh whole-feature code review, then fast-forward master. Check the plan's
checkboxes and Git for the latest step. One writer; reviewers read only.

## Task 8 phone test (separate branch, waiting for the user)

`feat/task8-safari-phone-test` at `3d8230a` has merged master `3209025` (merge
commit `fedc7e2`, both histories kept) and repeated 366 tests/lint/build/guarded
sync. The user reported **iOS 26.5.2**. Ignored `build/fixtures/` holds the five
exported non-human fixtures, their README and three generated S07/S08 inputs
(`zero-byte.mp4`, `corrupt.mp4`, `over-size.mp4`), all hash-checked against the
phone plan; a fresh review's Low findings are fixed. Task 8's own HANDOFF/STATUS
hold the details.

If Task 10 is reviewed and on master by then, merge master into Task 8 again
and repeat its checks; Task 10 must never delay the phone session, which
otherwise runs on Task 8's current build. Then, with the user present: agree a trusted
private network (home Wi-Fi or Personal Hotspot; the PC is on Public campus
Ethernet UWNet), bind preview 5195 and fixture server 5196 only to that address,
verify reachability, transfer fixtures, and run the Safari cases. No LAN listener,
phone transfer or Safari case has run. Firewall/VPN/router prompts are the
user's decision.

## Product boundaries

One local side-view bench-press MP4. Existing MediaPipe 0.10.35 model/runtime,
bounded decoding/cancellation, synchronized player/overlay, image-space elbow
measurements and Task 9's clip summary. No backend, accounts, saved sessions,
reps or form verdicts. Summary availability is not accuracy confidence; observed
extrema can include tracking errors and are not per-rep ROM or 3D anatomy.

Capacitor 8.6.0/App 8.1.2 prototypes use appId `com.gymbroai.app`, version 0.1.0.
[Master run5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
compiled both platforms and verified visible iPhone 17 Pro/iOS 26.4 simulator
startup. Latest ignored packages are in `build/artifacts/run-5/`. The simulator
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

Use process-local Node 22.23.2 (prepend its nvm folder to `PATH`); never switch
global Node 20 with `nvm use`. Leave the existing listeners alone: an unrelated
project's Vite on `[::1]:5173` and this checkout's dev server on `127.0.0.1:5193`
(they lock `node_modules` files, so `npm ci` would fail while they run).
Run tests/lint/build before each green step commit, push, and update STATUS and
this handoff. Write commit messages to a new file (Windows PowerShell 5.1 adds a
byte-order mark). No attribution trailers, force pushes or history rewrites.
Retain feature branches. GitHub default is still `feat/gymbro-video-landmarks`;
do not change settings. Detailed evidence remains in STATUS and Git history.
