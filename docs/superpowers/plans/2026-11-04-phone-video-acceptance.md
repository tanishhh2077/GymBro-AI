# Phone and video acceptance test plan

> **For agentic workers:** Use `superpowers:executing-plans` for later approved
> execution, one writer and a fresh final review. Steps use checkbox syntax.
> This is a manual verification plan; do not add tests that merely assert this
> document or simulate a phone and claim physical-device acceptance.

**Goal:** Establish repeatable, honestly scoped evidence for video processing on
the available iPhone, then the installed native app when installation is possible.
**Architecture:** Reuse the existing pipeline. First test its browser path in
iPhone Safari from the Windows LAN; separately test Capacitor's installed app.
**Tech Stack:** Existing React/Vite, local MediaPipe 0.10.35, Capacitor 8.6.0,
Node 22.23.2; macOS/Xcode 26+ only for future native iOS builds.
**Spec:** [approved mobile design](../specs/2026-11-03-mobile-prototype-design.md)
and [milestone-one contract](../../../spec.md), amended by D-014/D-021/D-022.

## Authorization and known resources

Task 7 authored/reviewed this plan only. Its original "clear" authorized planning,
not execution. Task 8 subsequently approved Step 1's free Safari preparation;
D-024 waived routine "Is this clear?" stops. Explain and proceed within that
scope, coordinating actual phone/settings actions with the user. Task 8 stays
open on its separate branch, which now merges reviewed master `3209025` (Task 9);
phone work waits for the user's availability. Signing, enrollment, network
settings changes and release remain outside that approval.

| Resource | Observed or user-reported state |
| --- | --- |
| Test phone | User's iPhone 12 Pro Max; iOS 26.5.2 (user-reported from Settings, 2026-11-04) |
| Android phone | User has no access; physical Android tests remain blocked |
| Apple Developer Program | User has no membership |
| Mac | User owns no MacBook; temporary Mac access is unconfirmed |
| Windows | Node 22.23.2 available per process; global Node 20 stays unchanged |
| Native artifacts | Master run5 (Task 9 source) compiled APK/simulator app, as did Task 6 run4; neither proves phone video processing |
| Real bench fixture | Still missing; user cannot record one; do not ask again |

Builder recommendation: begin with free Safari checks on the actual phone.
This can expose decoder/model/player problems without a paid membership or Mac.
It does not fulfill native acceptance. Rewriting the app or buying a build
service would add work/cost before identifying whether the shared pipeline works.

## Global constraints

- One local nonempty `.mp4`, at most **104,857,600 bytes / 100 MiB**, **60 s**,
  **1920 px long edge**, **2,073,600 pixels**. Actual decoding is required; the
  filename and MIME hint do not establish codec compatibility. Use H.264 MP4.
- Target **30 sample positions/s** is not an inference-speed promise. Metadata
  **10 s**, initialization **60 s**, each seek **10 s**, total **300 s** are
  configured failure budgets, not phone benchmarks or suspended-wall-time promises.
- Keep model/runtime local. No mocks, seeded poses, remote analyzers or backend.
  No reps/form scores or medical/validated biomechanics claims.
- Keep human video, frames, pose arrays, traces and recordings outside Git,
  `public/`, native copied assets and cloud artifacts. Default evidence is text.
- No paid enrollment/services, Apple credential/signing setup, uploads or release
  actions without a separate concrete authorization. Do not change repo settings.
- Task 4 stays unmerged. Export only its verified first-party synthetic fixture
  blobs later; do not import its unfinished tooling or claim its checks ran here.

## Review focus

1. iPhone Files/Photos provider may rename/transcode/download a selection: S02/S07
   record the delivered filename and behavior, never assume camera `.MOV` is MP4.
2. Safari success cannot exercise the native App bridge: S09 and N01/N02 remain
   separate, with no native pass inferred from a browser result.
3. Remove/reselect can race cleanup and late results: S04/S05 explicitly check
   stale filename/progress/errors/delegate/overlay do not return.
4. Background suspension/process death differ: N01/N02/N03 distinguish unfinished
   cancellation, surviving completed memory and a fresh empty session.
5. Synthetic empty content cannot establish bench-lifter tracking: S03 and B01
   have separate outcomes; wrong-person or unusable upper-body observations fail B01.

## Installation routes, checked against primary sources on 2026-11-04

| Route | Prerequisites and limits | Current disposition |
| --- | --- | --- |
| Safari from Windows LAN | Phone and PC reachable on the same trusted private network; browser loads the built app from PC | Proposed free first step; not installed native validation |
| Xcode Personal Team | Temporary compatible Mac, Xcode 26+, free Apple account, device pairing and required Developer Mode; personal provisioning expires after 7 days and needs rebuilding/reinstalling | Conditional; Mac access unconfirmed (iOS 26.5.2 reported); no paid membership required for this route |
| Paid-program distribution | Membership, approved signing/provisioning, macOS build path and separately chosen TestFlight or registered-device installation workflow | Unavailable now; future proposal only, not an enrollment recommendation |
| Existing simulator ZIP | macOS simulator runtime | Already tested in CI; cannot install on this iPhone |
| Existing Android debug APK | A compatible Android device | Retained locally; no physical device currently available |

Apple documents [free Personal Team testing and seven-day limits](https://developer.apple.com/help/account/basics/about-your-developer-account),
[running on physical devices](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices),
and [Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device).
[Capacitor's environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
require macOS and Xcode 26+; its [iOS guide](https://capacitorjs.com/docs/ios)
lists iOS 15+ support. The checked-in deployment target is 15.0; the reported
iOS 26.5.2 is above it, but that comparison does not show the app was tested on
this OS. A later Xcode route must confirm its Xcode supports iOS 26.5 devices.
[Apple's program page](https://developer.apple.com/programs/) lists paid membership
at US$99/year and TestFlight benefits; no purchase is approved or required for
the proposed Safari slice. Recheck requirements before a later signing action.

## Step 1: Prepare the free Safari slice — Task8 approved, phone portion pending

**Paths:** Existing app only; later local outputs under ignored `build/fixtures/`
and `build/`. Text findings go in `docs/STATUS.md`; no new product module.
**Consumes:** Current master app and exact synthetic blobs below.
**Produces:** Known app commit/build, local fixture hashes and a reachable test URL.

- [x] Explain this step; Task 8 is approved and routine understanding stops are
  waived by D-024. Actual user phone/settings actions still need coordination.
- [x] Merge reviewed master `3209025` (Task 9) into the Task 8 branch with a merge
  commit, keeping both published histories, and repeat whole tests/lint/build and
  guarded sync on the merged tree before any phone case. See STATUS.
- [x] Confirm the iOS version in Settings > General > About: the user reported
  **iOS 26.5.2** on 2026-11-04. Safari's user-agent string is not used for it.
- [ ] Confirm phone/PC LAN reachability with the user when available.
- [x] Select installed Node 22.23.2 only in the task process. Verify the existing
  dev/build baseline before any later feature code. Preserve servers5193/5176.
- [x] Export only the following files plus their provenance README from immutable
  commit `34538e417a724ebceb0971bd2b632a376a7e739e`, paths `tests/fixtures/`.
  Use binary-safe Git archive/extraction into ignored `build/fixtures/`; never
  PowerShell text redirection for MP4 bytes. Verify each SHA-256 before transfer.

| Fixture | Metadata recorded at source | SHA-256 |
| --- | --- | --- |
| no-person.mp4 | 320x180, 4 s, 4,890 bytes | `1c2088bb6706fd6e4594d3951f8187a2c7cedacedf321628fce539193773b802` |
| no-person-portrait.mp4 | 160x240, 2 s, 3,216 bytes | `8d94beb8ecdf3cff4cb2375cd9487be645e83c5ecd871f2f2ded5d965355a3c6` |
| over-duration.mp4 | 320x180, 61 s | `d1ecf3e02ecb7eb5a2e17bdb4a604b0e478523dd477b73796f2b5cdd414c87ab` |
| over-long-edge.mp4 | 1922x2, 1 s | `e09146f6d59f10eb4065e6c270b40f9a81ce5c4d92215953bff47cba6fbe9c00` |
| over-pixels.mp4 | 1920x1082, 0.2 s | `da10e4153dbc57d0bcb49607fa0b99c5c3b7b79586959ad4211f430e6a3adc7c` |

Source README grants project redistribution of these internally generated black,
silent H.264 patterns; no human/third-party content. They are not bench fixtures.

- [x] Amendment, 2026-11-04 (builder-proposed under Task 8; review recorded in
  STATUS): S07 and S08 need a zero-byte MP4, a file over 100 MiB and a nonempty
  corrupt MP4, which none of the exported fixtures is. Generate these three
  non-media inputs into the same ignored `build/fixtures/`. They are defined by
  their exact bytes, so any session can regenerate identical files; nothing is
  committed to Git.

| Input | Bytes | Exact content | SHA-256 |
| --- | --- | --- | --- |
| empty.mp4 | 0 | nothing | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| corrupt.mp4 | 68 | ASCII `GymBro AI S08 test input: these bytes are deliberately not a video.` plus one LF | `447aba0195e407858bc7816fdd332b3a27d4e707e108f53ca426b4a6ccc691aa` |
| over-size.mp4 | 104,857,601 | that many 0x00 bytes (100 MiB + 1) | `7f12a2ac8cc123711b92c20e22583eaa49582c52a8c1f3050f81dd1aa6591007` |

These are not videos and contain no human or third-party content. Expected app
behavior: `empty.mp4` and `over-size.mp4` are rejected before processing;
`corrupt.mp4` passes the selection check and must end in an actionable decoding
failure, not a no-pose success. Transfer `over-size.mp4` only if the user agrees
to store about 100 MiB on the phone temporarily, and delete it after S07.

- [x] Build with `npm run build`; desktop runtime preflight is recorded separately
  in STATUS and does not pass the physical-phone cases below.
- [ ] When the user returns, check port5195 is free; set a task-local
  `$phoneTestHost` to the PC's actual private LAN address, then later run
  `npm run preview -- --host $phoneTestHost --port 5195 --strictPort`.
  Use a production preview instead of exposing the development server/source.
  Do not change firewall/router settings or publish a tunnel automatically; if
  LAN access is blocked, record the exact prerequisite and continue other work.
- [ ] Check port5196 is free. For fixture transfer only, later run
  `python -m http.server 5196 --bind $phoneTestHost --directory build/fixtures`.
  That directory must contain only the five verified non-human fixtures, their
  provenance README and the three generated S07/S08 inputs above. Download them in phone Safari and confirm they are
  stored locally in Files. This temporary LAN server avoids a cloud upload or
  fixture files in served app assets; it is separate from the product. Stop
  this newly owned server after transfer. If Python/LAN access is unavailable,
  mark transfer blocked rather than installing tools/changing firewall silently.
- [ ] Open the preview URL in Safari and record success/failure and iOS version.
  Browser page loading fetches assets from PC; selected video processing stays
  on the phone. Stop the newly owned preview after testing; leave old servers.

## Step 2: Run shared-pipeline cases — pending phone coordination, none executed

Use real UI and model, first Safari and later repeat in native app with separate
rows. Each outcome is **passed / failed / blocked / not run**; all start not run.

| ID | Action | Required observation |
| --- | --- | --- |
| S01 | Open portrait/landscape; use touch controls | Readable guidance; no horizontal overflow or controls hidden by system areas; scrubber/labels usable |
| S02 | Open Choose video, cancel, reopen; select local Files MP4 | Cancel admits no clip/starts no work; no exact cancel-message requirement; valid selection starts real processing |
| S03 | Process no-person.mp4 | Terminal no-pose notice, 0% coverage, no skeleton, unavailable elbow values/no measurable trace; delegate and 30-sample target reported. Unexpected poses require investigation, never fabricated nulls |
| S04 | Try another selection while processing/completed/failed | Choose video stays disabled; removal required; no silent replacement |
| S05 | Remove during visible work, then choose distinct/same file; repeat after completion/error | Clip disappears; temporary cleanup state may block selection; admission resumes; old progress/name/error/delegate/overlay never returns. If the short clip finishes first, cancellation case is not run |
| S06 | Play/pause, seek both directions while paused, restart, use .25x/.5x/1x | Playback and time controls respond; empty clip shows no fabricated landmarks/measurements; repeat with portrait-source pattern |
| S07 | Try .MOV/non-MP4, zero-byte MP4, >100 MiB selection where possible | Rejection before processing; selection remains available. Distinguish picker filtering from app rejection; single-file picker cannot establish multi-file-drop handling |
| S08 | Use three over-limit fixtures and a nonempty corrupt .mp4 | Bound fixtures show supported-limit error; corrupt clip reaches actionable terminal failure, not no-pose success. Remove, then process known empty clip successfully |
| S09 | Leave/return to Safari; separately record any suspension/reload | Observe shared browser behavior only. Do not demand or claim Capacitor's reset behavior; Safari has no registered native listener |

Do not rename MOV to MP4 as a conversion. A camera's Most Compatible setting
does not establish container acceptance. Photos/iCloud picker routes and rotated
metadata video are additional cases, not inferred from Files or screen rotation.
Record elapsed times as observations only. Current synchronous inference cannot
be preempted; mobile suspension can delay timers. Deterministic model/seek/timeout
faults need approved fault tooling; source/unit checks do not pass those phone cases.

## Step 3: Installed native acceptance — prerequisites blocked, not approved

**Consumes:** Separately authorized installation route and identified signed
physical-device build, iOS version, local fixtures; repeats S01–S08 natively.
**Produces:** Explicit native evidence, never inferred from Safari/simulator.

- [ ] Explain and choose an available installation route at its own checkpoint.
  No credentials, paid enrollment, signed CI or store uploads are part of this plan.
- [ ] N01: While real unfinished processing is visible, background then return.
  Expect clip removal, cleanup settling, no late result and no auto-restart.
- [ ] N02: Complete a result, play it, briefly background/return in the same
  surviving process. Expect retained clip/results, paused playback and manual
  resume only. Verify seek/play after return.
- [ ] N03: After installation/media transfer, terminate app, disable Wi-Fi and
  cellular, launch and reselect the already-local empty fixture. Expect actual
  UI/model processing/replay offline. Old results should be absent: memory is not
  saved-session storage. Do not use an iCloud-only file for this case.
- [ ] Record Android physical tests as blocked until a device exists. Do not
  count the APK build or iPhone results as Android device verification.

Safari's LAN page has no service-worker/offline installation. Reloading it
offline is not an equivalent N03 test. An offline pass proves only that tested
workflow worked without networking, not a complete network/privacy audit.

## Step 4: Permitted bench evidence and closeout — conditional, not approved

- [ ] B01 remains blocked until a licensed/permitted side-view H.264 MP4 fixture
  is found. Do not ask the user to record again. Record permission, source, local
  checksum and metadata; keep human media outside Git/cloud artifacts.
- [ ] At three documented start/middle/end reference times, manually check useful
  visible shoulder/elbow/wrist landmarks belong to the bench lifter. Wrong-person
  tracking or unusable upper-body estimates fail this gate despite positive coverage.
  Test paused forward/backward seeks, restart and all speeds; missing observations
  remain missing. Empty-pattern playback cannot pass this synchronization gate.
- [ ] Record qualitative alignment only; no numeric biomechanical accuracy,
  validated form, rep counting or bar-tracking claims follow.
- [ ] Record each case, app commit/artifact identity, environment (Safari/native,
  phone/OS), fixture ID/hash, actual delegate/coverage and elapsed time if observed.
  Keep unrun/blocked reasons explicit; screenshots only empty/non-human UI by default.
- [ ] Review supported defects before any fixes; a fix is its own bounded,
  explained step with meaningful failing test and relevant checks, not permission
  to redesign the app. Preserve Task4's unfinished acceptance status.
- [ ] Update HANDOFF/STATUS with actual observations and next action. Commit/push
  green changes on the execution task's own branch after full tests/lint/build;
  integrate only after its fresh review resolves. Keep merged branches.

## Authoring verification and review

Task 7's deliverable is this protocol and current handoff, not the above passes.
Root inspected source contracts and fixture provenance; a read-only Codex helper
mapped observable cases. Fresh independent review and actual authoring checks
are recorded in STATUS. No phone cases have executed: Safari cases are **not run**;
native/Android/bench gates are **blocked** by their unavailable/unconfirmed
prerequisites. Authoring completion is not acceptance of those gates.
