# GymBro AI: current handoff

Updated 2026-11-04 (America/Chicago). Read root/scoped AGENTS.md first.

## Current task

Task9 adds a **clip elbow measurement summary**: measurable sample counts and
lowest/highest observed 2D angles, each linked to its actual media timestamp.
The user requested PC development while phone testing waits; D-025 records this
builder choice. D-024 says explain and proceed without routine understanding
stops; coordinate actual device/account/settings/spending/publication actions.

Branch: `feat/task9-elbow-summary`, from reviewed master `26a831f`.
Read the [design](superpowers/specs/2026-11-04-elbow-summary-design.md) and
[plan](superpowers/plans/2026-11-04-elbow-summary.md). One writer, fresh read-only
review. Task8/Task4 remain unmerged. Accepted D-024 guidance was carried as
documentation, without importing their unfinished source/history.

Step1 baseline: clean Node22.23.2/npm10.9.8 install (478 packages), 320 tests in
13 files, lint/build pass (409 modules). Existing uuid/Recharts deprecations and
Browserslist warning remain. Global Node20 is preserved. Own loopback dev server
5193 returnsHTTP200. Fresh read-only Codex design review found no significant
issues; no measurement-accuracy claim follows. Step1 is complete (check Git for
its documentation commit); next is test-first Step2. No Task9 application code yet.

## Product boundaries

One local side-view bench-press MP4. Existing MediaPipe0.10.35 model/runtime,
bounded decoding/cancellation, synchronized player/overlay and image-space
elbow measurements remain. No backend, accounts, saved sessions, reps or form
verdicts. Summary availability is not accuracy confidence; observed extrema can
include tracking errors and are not per-rep ROM or 3D anatomy.

Capacitor8.6.0/App8.1.2 prototypes use appId `com.gymbroai.app`, version0.1.0.
Task6 completed reviewed native builds and visible iPhone-simulator startup in
[master run4](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41794275180).
Ignored packages/image are retained in `build/artifacts/run-4/`. Simulator ZIP
cannot install on an iPhone; physical native workflow/offline inference remain
unverified. Task9 frontend changes need guarded mobile sync and accurate new
build evidence; do not reuse old compiled packages as proof of new UI.

## Deferred phone and bench work

Task8 is preserved at `feat/task8-safari-phone-test` / `7198ec1`.
The user has iPhone12ProMax, no Android phone or paid Apple membership.
iOS version/temporary Mac access remain unknown. They postponed phone actions
until returning home, about six hours after their message; wait for their return.

Task8 exported five first-party non-human patterns + provenance README into
ignored `build/fixtures/` from `34538e4`; hashes match the
[phone protocol](superpowers/plans/2026-11-04-phone-video-acceptance.md).
Its seven desktop Edge runtime checks and forwarded insecure-origin GPU check
passed; pause/seek actions were exercised without asserting final seek state.
These are PC evidence, not Safari/LAN/native or bench passes.
No phone transfer or LAN listener has run; UWNet was a Public campus connection.
When the user returns, coordinate trusted home Wi-Fi/hotspot, obtain iOS version,
re-detect the private address and verify reachability before serving/transferring.
Do not change firewall/VPN/router settings automatically.

Task4 remains at `feat/task4-browser-acceptance` / `34538e4`; licensed bench
footage is still missing. The user cannot record one; do not ask again.
Do not merge the incomplete branch for tooling or call M1 bench acceptance done.

## Verification and Git

Use process-local Node22.23.2; never switch global Node with nvm use.
Run tests/lint/build before each green step commit, push, and update STATUS and
this handoff. Stage only the step paths, no media/signing files/private data.
No attribution trailers, force pushes or published-history rewrites.
After fresh Task9 review resolves, fast-forward/push master under D-019 and
retain branches. GitHub default still `feat/gymbro-video-landmarks`; do not
change settings. Detailed earlier evidence remains in STATUS and Git history.
