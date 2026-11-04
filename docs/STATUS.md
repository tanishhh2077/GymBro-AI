# Current project status

Updated: 2026-11-04 (America/Chicago).

For a new session in either Claude Code or Codex, start with [HANDOFF.md](HANDOFF.md).
This file retains detailed evidence/history; the compact handoff avoids loading
the full record on every task. Work runs in whichever provider has more remaining
usage, and these documents are the only handoff; see D-016 in
[accepted decisions](DECISIONS.md).

## Current stage

Task 8 (the phone plan's free Safari slice) has resumed on
`feat/task8-safari-phone-test`. On 2026-11-04 the branch merged reviewed master
`3209025` (Task 9's completed elbow summary) with a merge commit that keeps both
published histories. The merged source is byte-identical to master and the whole
tests/lint/build/guarded sync pass again. PC preparation is complete. The user
reported **iOS 26.5.2**. Phone testing still needs the user for a trusted private
connection between the iPhone and the PC. No LAN listener, phone transfer or
Safari case has run. Safari, installed-native and real-bench acceptance remain
unverified.

### Task 8 generated S07/S08 inputs

- Claude Code (Opus 5.5), 2026-11-04. The plan's S07 needs a zero-byte MP4 and a
  file over 100 MiB, and S08 a nonempty corrupt MP4; the five exported fixtures
  and Task 4's `tests/fixtures/` (checked at `34538e4`) contain none of them.
  Builder-proposed plan amendment: generate `zero-byte.mp4` (0 bytes; first
  generated as `empty.mp4` and renamed after review, same bytes and hash),
  `corrupt.mp4` (68 ASCII bytes) and `over-size.mp4` (104,857,601 zero bytes)
  into ignored `build/fixtures/`. A Python script wrote raw bytes, refusing to
  overwrite; the printed SHA-256 values are in the plan table. `git check-ignore`
  confirms `build/` is ignored. The folder now holds those nine files only.
- PC behavior check, desktop only: a temporary production preview bound to
  `127.0.0.1:5194` served the Task 8 tip's build (source identical to master
  `3209025`) to the Playwright MCP Chromium browser. Inputs were set on the real
  file input. The zero-byte input (then named `empty.mp4`) showed alert "Video not accepted — This file is empty.
  Choose a recorded video."; `over-size.mp4` showed "This video is larger than
  100 MiB…". Neither created a video element; Choose video stayed enabled.
  `corrupt.mp4` was admitted and ended in alert "The video could not be read —
  The browser could not load this video. Remove the clip to try another.", not a
  no-pose result; Choose video was disabled and Remove present. After removal,
  `no-person.mp4` processed to the no-pose result in about 4 s, with the old
  filename gone. No request went anywhere except the preview origin and
  in-memory `blob:` URLs for the selected files. Console: one
  `favicon.ico` 404 (the app ships no favicon; cosmetic) and MediaPipe's OpenGL
  notice. Preview process 50072 was stopped and port 5194 confirmed free; upload
  copies in ignored `.playwright-mcp/` were deleted.
- This shows the inputs reach the intended code paths in desktop Chromium. It is
  not a Safari, iPhone Files-provider or native result; the phone may filter,
  rename or refuse to download a zero-byte file, which S07 records as observed.

- Fresh read-only review (Claude Code subagent, Opus 5.5, no inherited builder
  conversation; read only Git objects and `build/fixtures/`) of `fedc7e2..e10cc93`
  found no Critical/High/Medium issue. It recomputed all three inputs' bytes and
  SHA-256 from the files and from the plan text alone, confirmed `build/` is
  ignored with nothing tracked, matched every quoted alert to `clipPolicy.ts`,
  `video.ts` and `VideoStage.tsx`, and found the iOS record consistent. It ran no
  tests/builds/servers and could not see the Chromium run or phone behavior.
- Three Low findings, all fixed in the following commit: (1) the name
  `empty.mp4` could be confused with the plan's "known empty clip"
  (`no-person.mp4`), so the input is now `zero-byte.mp4` and S08 names
  `no-person.mp4`; (2) the plan claimed a review "recorded in STATUS" before
  one existed, now this record; (3) "Only `blob:` requests left the preview
  origin" was reworded, because `blob:` URLs never leave the page.
- Two unverified concerns, addressed in the plan: the text-file `corrupt.mp4`
  exercises only the earliest (metadata) failure, now stated, and a timeout
  message with removal guidance also counts as S08's actionable failure;
  phone Safari may play rather than download an `.mp4` link, so the transfer
  step now says to long-press and choose "Download Linked File". The reviewer's
  minor note is also adopted: the amendment repeats "verify each SHA-256".
- Commit hygiene note: commit `e10cc93`'s subject begins with an invisible UTF-8
  byte-order mark, written by Windows PowerShell 5.1 into the message file. The
  commit's content is correct; the published history is left unchanged. Later
  message files are written fresh without one.

### Task 8 iOS version

- On 2026-11-04, while away from the PC, the user reported the iPhone 12 Pro Max
  runs **iOS 26.5.2**, read from Settings. This is user-reported, not observed by
  an agent; Safari's frozen user-agent string was not used. The phone plan's
  resource table and Step 1 record it. LAN reachability is still unchecked, and
  no phone, network or settings action was taken.

### Task 8 merge of reviewed master (Task 9)

- Done by Claude Code (Opus 5.5) on 2026-11-04 at the user's request. A fetch
  showed `origin/master` at `3209025` and the Task 8 remote at `7198ec1`; their
  merge base is `26a831f`. Merged with `git merge --no-ff master`: no rebase, no
  force push, no published-history rewrite. Task 4 (`34538e4`) was not merged.
- Task 8's three commits changed only Markdown; master changed source and docs.
  Eight documents changed on both sides. Git combined `AGENTS.md` (now identical
  to master) and `README.md` (master's text plus Task 8's D-024 first-message
  block, which master still lacked); `WORKFLOW.md` was already identical. In the
  conflicts, `DECISIONS.md` took master's side (it adds D-025; D-024 was identical
  on both). The phone plan and plans index keep each side's more precise wording
  and record this merge. This file keeps every section from both branches, newest
  task first. `HANDOFF.md` was rewritten for the merged state.
- Every non-Markdown path in the merged tree is identical to master `3209025`
  (`git diff master -- . ':(exclude)*.md'` is empty). Task 9's fresh code review
  therefore covers the merged code; the merge adds no application code to review.
  Only `README.md`, `HANDOFF.md`, `STATUS.md` and the two plan files differ.
- Process-local Node 22.23.2 / npm 10.9.8; global Node 20 untouched. No reinstall:
  `package.json` and the lockfile are unchanged on both branches, and
  `npm ls --depth=0` exits 0. A clean `npm ci` was not run because two running
  Vite servers hold files open: an unrelated project on `[::1]:5173` and this
  checkout's dev server on `127.0.0.1:5193`. Both were left running. Task 9's clean
  install remains the latest reinstall evidence.
- Merged tree: `npm test` **366 passed / 15 files**, exit 0; `npm run lint` exit 0;
  `npm run mobile:sync` exit 0 (build/config type-check, 411 modules, `cap sync`,
  then verification of iOS and Android: 13 files each, local entrypoints, model and
  six runtime files). The existing Browserslist warning remains. No tracked file
  changed.
- All 13 rebuilt `dist/` files match the web assets inside the ignored run5 APK
  (`build/artifacts/run-5/GymBroAI-android-debug.apk`) byte-for-byte, so master
  run5's native compile/launch evidence describes this branch's web bundle. Pushing
  this branch does not trigger the workflow, which runs only on
  `feat/task6-mobile-app` and `master`; no new cloud run was made.
- `build/fixtures/` still holds exactly the six exported files; all five fixture
  SHA-256 values match the plan and the README hash matches the Step 1 record.
- Read-only network check: still Ethernet UWNet, Windows category **Public**. No
  listener was started, no setting was changed and no phone action was taken.
- Next, with the user: record the iOS version, choose home Wi-Fi or Personal
  Hotspot, re-detect the private address, bind 5195/5196 only to it, verify phone
  reachability, transfer the fixtures, then run Step 2's Safari cases. Task 8
  stays unmerged into master until its acceptance and review are resolved.

### Task 9 record: observed elbow summary, completed on master

Task9 PC development ran on `feat/task9-elbow-summary` from reviewed
master26a831f. The user requested PC work while phone testing waits; D-025
records the builder-selected observed-elbow summary. **Task9 is complete**:
reviewed source is integrated in master9e34ec4, local366 tests/lint/build/sync
and all three native run5 jobs pass. Final documentation follows that source;
check Git for current tips. Phone/Safari/native-video/bench gates remain open.
D-024 guidance was carried from Task8's accepted
user instruction; Task8 itself stays open at7198ec1 and is not merged here.

### Task9 Step1 baseline and design

- Clean Node22.23.2/npm10.9.8 `npm ci --no-audit --no-fund` succeeds:478 packages,
  with existing uuid/Recharts deprecations. No package/lock changes or new dependencies.
- Whole320 tests/13 files, lint and build/config type-check exit0;409 modules,
  existing Browserslist warning. Own loopback dev server5193 starts before feature
  code. Global Node20 is preserved. No public/LAN binding or phone action.
- Existing single-writer feature checkout is retained under established project
  workflow. Independent reviewers read only. If separate isolation becomes
  necessary, changes must be transferred; no worktree cleanup or branch deletion.
- Task8 at7198ec1 preserved fixtures/desktop preflight evidence. Its phone cases
  remain unrun, pending user return/iOS/private-network coordination. Task4 at34538e4
  still lacks permitted bench footage and remains unmerged.
- Own dev5193 returnsHTTP200. Fresh independent read-only Codex builder review
  (`elbow_summary_design_review`, no inherited conversation; model not exposed)
  found no significant findings/material questions. It inspected source/design/
  plan/scoped rules and the player contract, ran no builds/tests and changed no
  files. The identified stale HANDOFF was updated. Step1 is complete; Step2's
  application behavior will be written only after observed failing tests.

### Task9 Step2 implementation and verification

- Added pure `elbowSummary.ts` and small `ElbowSummaryPanel.tsx`; integrated
  once-per-pose derivation in ElbowTimeline's existing fallback and onSeek path.
  Counts/extrema use observed values and raw media times only. No engine/store,
  runtime dependency, input limit, persistence or native configuration changes.
- RED: initial missing module was resolved with an empty contract file; then the
  actual first test failed because summarizeElbows was absent. Minimal aggregation
  made it pass. Expanded34 cases then had22 expected validation failures before
  guards; all34 now pass. New timeline cases first failed3/12 because summary was
  absent; panel cases failed7/7 against the empty scaffold. Implemented presentation/
  integration, then all53 focused cases across3 files passed.
- Whole **364 tests/15 files**, lint and `mobile:sync` (including build/config
  type-check) exit0. Vite transforms411 modules; existing Browserslist warning
  remains. Both platforms'13 shared files and local model/six runtime files pass
  byte/config checks. This is sync evidence, not new native compilation.
- Isolated headless desktop Edge156.0.4314.58 at loopback dev5193 passed5 browser
  cases: real no-person processing yields0 of120 measurable samples on each side,
  four unavailable/disabled jumps and paused replay; supplied synthetic geometry
  yields independent3/4 and4/4 counts and evidence jumps that actually update
  paused video time/angle (0°,180°,90° at real target times); wide1280x900 and
  narrow390x844 layouts have no horizontal overflow; removal clears summary and
  restores admission. No external app-origin requests or page errors observed.
- Positive geometry was explicitly supplied through the development store after
  real empty-clip inference, with the clip labeled synthetic. It is not positive
  model/bench evidence. Browser scratch script/results and three non-human PNGs
  remain ignored in `build/task9-*`; all images were manually inspected. The
  real inference delegate was not separately captured in this run. No physical
  phone, actual private-LAN transport, bench accuracy or performance claim follows.
- Source READMEs/root counts/architecture/plan/handoff updated. Final fresh
  whole-feature review remains Step3 before integration. Task8/Task4 stay open.
- Evidence correction: Step2 commitde63196's body overstates the RED count by
  saying all34 core cases were observed failing. Actual record above is the
  first API case failing, then22/34 expected validation failures while12 already
  passed the minimal aggregation. All7 panel and3 new integration cases did fail
  before their UI/integration implementation. Published history is preserved;
  this correction, not the shorthand commit body, is the verification record.

### Task9 Step3 critical review and supported fix

- Fresh read-only Codex review (`elbow_summary_code_review`, explicitly selected
  gpt-6-astra/high, no inherited builder conversation) inspected26a831f..de63196
  against D-025/design/plan/source. Independently passed67 focused tests across
  core/panel/timeline/player and mobile:verify13 files per platform. No authored
  files/builds/sync/branches changed by the reviewer; no delegated subreview.
- One Medium accessibility defect: aria-label replaced the button's visible
  angle/time with only action/side, so tabbing screen-reader users could not hear
  the evidence before activating. Reviewer reproduced the actual component in
  isolated Edge and its computed accessibility tree. No other significant finding;
  Declined to judge: none. Reviewer did not repeat full build/inference/native work.
- Verified source/effect and fixed in one pass. Two new panel tests first failed
  for missing description associations/unique IDs. React useId now links each
  button to its visible value/time or Unavailable; replacement updates description
  text and multiple panels cannot collide. All9 panel tests pass.
- Fresh whole **366 tests/15 files**, lint and guarded sync/build pass:411 modules,
  13 shared files on each platform. The existing Browserslist warning remains.
- Repeated browser checks for the new accessibility behavior: **six cases pass**,
  including actual computed AX descriptions for unavailable and synthetic0°/180°
  evidence values/times, plus real no-person inference, actual paused jumps,
  narrow/wide layout and removal. No external app-origin requests/page errors.
  This is browser accessibility-tree evidence, not a physical screen-reader test.
  Phone/LAN/native/bench gates remain unverified. Review is resolved; integration
  and new native CI evidence follow below.
- Review fix9e34ec4 was committed/pushed after green366 tests/lint/build/sync.
  Fast-forwarded master26a831f..9e34ec4; reran the whole366 tests/15 files,
  lint and guarded sync/build on the merged tree, all exit0. Working tree stayed
  clean and own dev5193 returnedHTTP200. Pushed master and retained feature branch.
- New native [master run5](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41901984826)
  at9e34ec4 finalized **success** in all three jobs: shared126826538964,
  Android126826848597 and iOS126826848662. Shared checks pass366 tests; Android
  build succeeds and matches13 compiled web files. iOS Xcode26.6/17F113 build and
  13-file comparison pass, negative splash is rejected, and foreground launch
  PID14141 eventually shows actual GymBro/bench UI at20:08:06UTC after an initially
  incomplete capture. iPhone17Pro/iOS26.4; WebView loaded. Matching fresh App
  crash reports0 is not general stability evidence. No Apple team/signing secrets.
- Downloaded both artifacts and verified outer SHA-256 against GitHub metadata:
  Android `13a2919e4cf0b7ff9aa01801eefd1bb86984479d8383fc5170861bb6b5029ddd`;
  iOS `dd0b2bb07c4b73738c491607a09ebcddab5724c3f725ac25de3aae45955f6609`.
  Root independently compared all13 dist files inside each downloaded package
  byte-for-byte. Manual image inspection confirms the real empty app interface.
  The new summary is bundled but not exercised by this startup-only image.
  Ignored `build/artifacts/run-5/` retains APK24,698,528 bytes,
  SHA-256 `91a0a19de40a5616a90f8776fd9d52dcde925699d63a87982217c55447bed9c9`;
  iOS App.app ZIP19,895,594 bytes and PNG1,105,405 bytes. Artifact IDs Android
  13358772029/iOS13359342876; one-day retention. Older run4 retained separately.
- Implementation was by the current Codex session (model identifier not exposed);
  review model gpt-6-astra/high was explicitly selected as recorded above. No
  new human footage, private media, native device install, signing or release.
- Task8 remains at7198ec1 with the earlier source. When resuming, merge reviewed
  master into its branch, retain both histories and redo checks/build/sync before
  phone cases. Preserve its factual preparation/evidence in conflict resolution.
  No published-history rewrite or Task8 merge into master is implied. Phone steps
  remain deferred until the user is home; Task4 still lacks permitted bench media.
- Final documentation verification:75 Markdown files,204 relative links/anchors
  and all19 CLAUDE imports resolve; diff formatting passes. Fresh precommit
  **366 tests/15 files**, lint and build/config check exit0,411 modules. Source
  bundle hashes match the verified run5 packages. All Task9 steps are complete;
  no acceptance-blocking review finding remains. Feature branch is retained.

### Task 8 Step 1 preparation

- Done by Claude Code (Opus 5.5) on 2026-11-04 after the user approved the
  explanation; the user then waived routine "Is this clear?" stops (D-024).
  Branch `feat/task8-safari-phone-test` created from master `26a831f`, which
  matched `origin/master` after a fetch.
- Node: `C:\nvm4w\nodejs` (global, v20.20.2) was left unchanged. Each command
  prepended the nvm folder for v22.23.2 to `PATH`; `node --version` reported
  v22.23.2 and npm 10.9.8. `nvm use` was not run, because it switches the global
  link.
- Baseline under Node 22.23.2: `npm test` **320 passed / 13 files**, exit 0;
  `npm run lint` exit 0; `npm run build` exit 0, 409 modules. Working tree clean.
- Fixture export from `34538e417a724ebceb0971bd2b632a376a7e739e:tests/fixtures/`
  with `git cat-file blob` (raw stored bytes, no line-ending or text filters;
  equivalent to the plan's binary-safe archive/extraction) into ignored
  `build/fixtures/`, which did not exist beforehand:

  | File | Bytes | SHA-256 vs plan | Git object ID matches tree |
  | --- | --- | --- | --- |
  | no-person.mp4 | 4,890 | OK | `ee7fdd4` OK |
  | no-person-portrait.mp4 | 3,216 | OK | `b59102c` OK |
  | over-duration.mp4 | 52,626 | OK | `83baafa` OK |
  | over-long-edge.mp4 | 2,391 | OK | `5b823db` OK |
  | over-pixels.mp4 | 2,374 | OK | `4c917f3` OK |
  | README.md (provenance) | 2,631 | not in plan; SHA-256 `aac2cdac1d5cc213208d869c3678abb4dad3267ba7accae511e86bea357e7d00` | `5ef78be` OK |

  The directory holds exactly these six files. The README's relative links point
  to files beside its original Task 4 location and do not resolve in the copy.
- Environment observed (read-only) for the LAN step: Python 3.12.10 available;
  ports 5195 and 5196 free; this session's earlier servers are gone, an older
  dev server still listens on 127.0.0.1:5176 and another on 127.0.0.1:5193
  (both left alone). The PC's only connected network is Ethernet "UWNet",
  Windows category **Public**; NordVPN adapters (NordLynx, OpenVPN) are present;
  Wi-Fi is disconnected. Enabled inbound firewall rules already allow
  `node.exe`/`python.exe` on the Public profile (rule program paths were not
  inspected). A campus network is not the plan's trusted private network and may
  block device-to-device traffic, so the recommended route is the iPhone's
  Personal Hotspot with both servers bound only to the hotspot address.
- Claude's inspection did not identify secure-context-only features in the
  selected processing path. This was an expectation about plain HTTP, not a
  Safari result; model startup on an actual phone LAN origin remains unverified.
- Not done by Claude: binding the preview/fixture servers, phone transfer, opening the
  page in Safari, and the iOS version. No server has been started, no file has
  been sent to the phone, and no Step 2 case has run.

### Task 8 Codex continuation: PC runtime preflight

- On 2026-11-04 the user asked Codex to inspect Claude's work and resume. Git was
  clean at `10524e9`, matching its remote; fetch left master at `26a831f`. The
  two Claude commits (`49538b2`, `10524e9`) change documentation only, including
  the user's D-024 waiver. App/native/package/tooling source is unchanged.
- Fresh read-only Codex review (`claude_task8_review`, no inherited conversation;
  model identifier not exposed) found no acceptance-blocking issue. All six
  ignored fixture files, sizes, SHA-256 and Git blob IDs match immutable
  `34538e417a724ebceb0971bd2b632a376a7e739e`, with no hidden extras/directories.
  Their README documents internally generated black/silent H.264 and permitted
  redistribution. The reviewer ran no tests/builds/servers/device actions.
- One supported low-severity finding was corrected: WORKFLOW's new-session
  paragraph and the phone plan's combined Step1 checkbox still mandated routine
  understanding stops, contradicting D-024. Current instructions now distinguish
  explain-and-proceed from actual user phone/settings coordination. Task7's
  approval language below is historical; Task8 now authorizes preparation.
- The user then postponed only the phone portion until returning home, about
  six hours later. No phone/network-setting action was attempted. Read-only
  network inspection still found Ethernet UWNet on the Public profile. Unlike
  the earlier Claude snapshot, ports5176/5193 had no listener at Codex's check;
  no existing server was stopped. No campus-bound or all-interface listener ran.
- Fresh Node22.23.2 verification: **320 tests/13 files**, lint and build/config
  type-check exit **0**, 409 modules; existing Browserslist warning remains.
  No dependencies installed or native build/sync needed for unchanged sources.
- A temporary Vite production preview bound only to **127.0.0.1:5194** was used
  with an isolated headless desktop **Edge156.0.4314.58** context. Existing
  Playwright1.64.1 was reused from the ignored clean-Task4 cache; no Task4 app or
  unfinished test tooling was merged. The real production UI/decoder/local model
  ran with no inference mocks or seeded poses. Seven scratch preflight cases passed:
  startup; landscape and portrait empty-clip GPU processing with no-pose/0%
  coverage/unavailable elbow values, actual playback progression, pause/seek
  control actions and narrow layout;
  all three over-limit metadata rejections; active cancellation and successful
  replacement without the previous filename returning. The narrow viewport is
  desktop Edge layout evidence, not iPhone/WebKit emulation or acceptance.
- No external app-origin requests, page errors or console errors were observed
  in that context. A non-human full-page result image was manually inspected.
  Scratch script/results/image remain ignored at `build/task8-pc-preflight.mjs`,
  `build/task8-pc-preflight-results.json`, `build/task8-pc-no-person.png`. These
  are local manual evidence, not seven new npm tests or committed CI tooling.
  They do not establish bench accuracy, native behavior or a general privacy audit.
  Pause and slider actions were exercised but the scratch harness did not assert
  the resulting paused/seek state; do not promote these actions to verified seeking.
- A separate scratch HTTP-origin check passed on the same desktop Edge:
  `http://gymbro.test` reported **isSecureContext=false**, completed real GPU
  processing of the empty fixture, and displayed no-pose/0%/unavailable angles.
  Browser request interception forwarded exact production responses from the
  loopback preview, with no inference replacement. No external requests/page
  errors were observed. Script/results are ignored at
  `build/task8-http-preflight.mjs` and `build/task8-http-preflight-results.json`.
  This narrows the secure-context concern for Edge only; interception is not an
  actual LAN connection and cannot verify iPhone Safari or hotspot routing.
- Temporary loopback previews were stopped after checks. One immediate stop
  probe still reported a listener; a subsequent independent query found neither
  port5194's listener nor its preview process. No older process was stopped.
  Global Node20.20.2 was rechecked and preserved; no LAN listeners were started.
- Targeted follow-up by the same read-only reviewer confirmed the D-024 fix,
  phone deferral and PC/forwarded-HTTP evidence boundaries. It identified the
  pause/seek assertion limitation above; claims were narrowed accordingly.
  No remaining acceptance-blocking finding; Task8 remains incomplete for the phone.
- All Safari/physical-phone cases remain unrun. Resume when the user returns:
  obtain iOS version, coordinate a trusted private connection, bind narrowly to
  its actual address and check phone reachability before transferring fixtures.
  Keep Task8 open/unmerged until its acceptance/review is resolved.

### Earlier Task7 planning record

Task 7's [phone/video acceptance plan](superpowers/plans/2026-11-04-phone-video-acceptance.md)
is complete as a planning-only deliverable, developed on
`feat/task7-phone-test-plan` from clean reviewed master `e38cc4b`. The user
approved **planning only** with "clear" on 2026-11-04 and reports iPhone12ProMax,
no Android phone and no Apple Developer Program membership. iOS version and
temporary Mac access remain unreported. D-023 records these facts separately
from the builder's proposed free Safari-on-Windows-LAN first slice. No phone
tests, fixture exports, listeners, product changes or signing actions have run.
Fresh independent plan review found no significant findings; authoring checks
pass. Execution is not approved. Check Git for the final documentation commit.

### Task 7 planning evidence and review

- Planning only: added the phone/video protocol and D-023; refreshed HANDOFF and
  documentation/plan indexes. No product/native/workflow/test code changes.
- Read official Apple/Capacitor documentation on 2026-11-04: free Xcode Personal
  Team device testing, seven-day provisioning limits, macOS/Xcode26+/iOS15+
  requirements, Developer Mode and paid distribution prerequisites. Sources are
  linked beside the plan's claims. No enrollment, credential, signing or store
  operation was performed. Paid membership is not recommended for the first slice.
- Root read the immutable Task4 fixture README at
  `34538e417a724ebceb0971bd2b632a376a7e739e`: five internally generated black,
  silent H.264 patterns have explicit project redistribution permission. Only
  exact-blob export to ignored local fixtures is proposed later. No branch merge
  or export occurred. Empty content cannot pass real-bench acceptance.
- Read-only Codex source audit (`device_plan_contract_audit`, no inherited
  conversation; model identifier not exposed) mapped actual file admission,
  limits, player, cancellation/cleanup, native lifecycle and memory-only session
  behavior. It ran no builds/tests/device actions and changed no files. Root
  incorporated its supported distinctions: picker cancel has no exact-message
  contract, native reset is absent in Safari, and process death loses results.
- Fresh Goldfish/builder review (`phone_plan_goldfish`, no inherited builder
  conversation; model identifier not exposed) found **no significant findings or
  material unanswered questions**. Independently checked all five immutable
  fixture blobs' sizes/hashes and provenance, actual UI/lifecycle contracts, and
  the primary Apple/Capacitor requirements. Explicit conditional native/Android/
  bench prerequisites do not block planning or falsely pass those gates. No edits,
  tests/builds, exports, listeners, signing or device checks ran in this review.
- Read-only documentation audit (`mobile_handoff_audit`, model identifier not
  exposed) found **no material findings**: all **196 relative links/anchors** in
  73 project Markdown files resolve; all 19 CLAUDE imports remain valid; no new
  directory needs guidance. Scope/hardware/authorization statements agree and
  diff formatting passes. This was a continuity audit, not a fresh-context
  product-code review. No files or runtime state changed by the auditor.
- All physical-phone cases remain **not run**. Native installation, Android
  device access and permitted bench footage remain conditional/blocked as
  specified. Next checkpoint covers only preparing the free Windows-LAN Safari
  slice with verified synthetic fixtures; no paid/signing action is implied.
- Required authoring verification under process-local Node22.23.2/npm10.9.8:
  **320 tests/13 files**, lint and build/config type-check all exit **0**; Vite
  transforms409 modules with the existing stale Browserslist warning. Own
  dev5193 returnsHTTP200; global Node remains20.20.2. No dependencies installed,
  native recompilation/sync or new tests were necessary for Markdown-only work.
  Self-review covered source/fixture contracts, each proposed case and prerequisite,
  explicit execution gates and plan scope. Fresh review is resolved; D-019 applies
  to integration of this documentation task, not execution of its future protocol.

### Completed Task 6 baseline

Task 6's bounded mobile prototype is complete. The reviewed feature was integrated
into local/remote `master` at `ed5f1b3`; later commits finalize documentation.
`feat/task6-mobile-app` is retained. It was based on reviewed master `f0e9118`.
D-022 authorizes both native prototypes, prioritizing iPhone, from Windows
without a MacBook.
The user confirmed the mobile packaging explanation, then replied "ok cool" to
Step 2's dependency/native-generation understanding checkpoint. The user then
answered "clear" directly to Step 3's background/layout/offline explanation.
The user then answered "clear" to Step 4's cloud-build explanation, and on
2026-11-04 answered "clear" to Step 5's whole-feature review/integration
explanation. All five steps are complete; the next planning checkpoint was then
approved as Task 7 above, while test execution retains its own checkpoint.
Read the [mobile design](superpowers/specs/2026-11-03-mobile-prototype-design.md)
and [plan](superpowers/plans/2026-11-03-mobile-prototype.md). Capacitor 8.6.0,
App plugin 8.1.2 and assets tool 4.0.0 are pinned. iOS/SPM and Android native
projects are generated with `com.gymbroai.app` / GymBro AI identity and version
0.1.0. **Run3 passes both native builds and visible iOS startup**, after earlier
blank/home-screen failures exposed insufficient launch verification. The final
screenshot was downloaded/hash-verified and manually inspected. Step 4 is
complete; Step 5's fresh review found no significant implementation issues.
Merged-tree local checks and all three jobs in master run4 pass. Both run4
downloads were hash-verified and matched against dist, and its actual-interface
screenshot was manually inspected. This completes the prototype, not M1 bench
acceptance or production readiness.
No Apple signing credentials or physical-device tests have been used.

Task 6 Step 1 verification on 2026-11-03: process-local Node 22.23.2 / npm 10.9.8;
working-tree tests **287/287** in ten files, lint and production build exit **0**,
403 modules. Existing stale Browserslist warning remains. Own Node-22 dev server
5193 returns HTTP 200. Separate ignored clean install completed with 338 packages
(existing Recharts 2 deprecation warning); clean-source tests **287/287**, lint
and build also exit **0**, with 403 transformed modules. Fresh read-only Codex
design review (`mobile_design_review`, model not exposed) found no significant
issues after inspecting the plan, store/engine ownership, file admission and local
asset contracts. It ran no builds and changed no files. Step 1 is complete and
pushed as `75cda7d`. Java 21 exists locally; Android SDK/emulator and Xcode do
not. Earlier server 5176 is untouched. No physical-device or bench-video
validation follows from these checks.

### Task 6 Step 2 verification

- Package installation and both `cap add` commands exited 0. All existing lockfile
  package objects remain unchanged; only native-tooling dependencies were added.
- Whole `npm test`: **287 passed** in ten files. `npm run lint`: exit **0**.
  `npm run mobile:sync`: exit **0**, including `npm run build`, the new mobile
  config TypeScript check, 403 Vite modules, both platform asset copies and App
  plugin references. No macOS/Xcode or Android Gradle compilation was performed.
- Manual SHA-256 checks matched all seven model/runtime files in each native
  copy; both indexes exist, both copied configs have the expected identity/local
  webDir with no server override, and copied web assets contain no Markdown.
- Pinned asset generation exited **0**: 74 Android and seven iOS assets generated.
  Visually inspected the iOS icon, Android legacy icon and iOS splash. Removed
  newly generated unused template iOS splash files and Android arithmetic/wrong
  package-name example tests; those do not validate GymBro AI.
- Copied bundles/config, native builds/caches, local SDK paths and signing files
  are ignored. Added scoped shared guidance and cross-platform commands. No
  behavior-mirroring tests were added for generated/configuration files; real
  sync/type-check/hash checks verify this step. Lifecycle/packaging behavior and
  associated tests belong to Step 3; native builds belong to Step 4.
- Fresh read-only Codex setup review (`native_setup_review`, model not exposed)
  found no significant issues. It inspected dependency/native references,
  config/ignores/scripts/branding and independently matched all seven assets
  against both native copies. It changed no files and compiled no native binary.
  Preserve executable mode on `android/gradlew`. No phone/inference/offline
  startup claim is made: existing remote fonts are removed in Step 3.

### Task 6 Step 3 implementation and evidence

- Added native-only App listener ownership and App composition integration.
  Background events pause attached videos, reset only processing/cancelling
  sessions, and reuse existing abort/lease cleanup. Completed clips stay in
  memory; foreground events never auto-resume. Cleanup handles late registration,
  queued events, idempotent disposal and rejected/synchronous bridge operations.
  Failures emit fixed diagnostics without private error/video details.
- Red/green: lifecycle stub failed eight of ten cases, then ten passed; App wiring
  initially failed its StrictMode/native integration case, then both cases passed.
  The bridge and media APIs are faked; cancellation uses the real session store.
  These checks do not prove native background delivery or interrupt synchronous
  MediaPipe inference before it returns.
- Packaging stub initially failed 19 of 20 cases; implementation passed 20. The
  real verifier then caught existing Google Fonts requests. Removed remote font
  links and use system-font fallbacks. Safe-area CSS consumes native variables
  or environment values; Android MainActivity enables edge-to-edge rendering.
  Android source compilation remains unrun until Step 4.
- First guarded full sync exposed two extra zero-byte files written by the pinned
  Capacitor CLI (`cordova.js` and `cordova_plugins.js`, confirmed in its source).
  A realistic fixture failed before the fix. The verifier permits only their
  exact empty contents; a new case rejects nonempty stubs. No other extra file
  is exempted. Real Cordova plugins would need a separately reviewed change.
- Whole suite now **320/320** in 13 files: 287 preceding, ten lifecycle, two App
  integration and 21 packaging cases. Lint and build pass (409 modules). Guard
  checks 13 shared web files per platform plus permitted stubs, both runtime
  configs/native bundle IDs, local entry resources and the model/six runtime
  copies. Public WASM must match the installed package; stale/missing/extra files,
  remote entry/CSS resources and obvious served media/signing/Markdown fail.
  It is not a general secret scanner or arbitrary-JavaScript network audit.
- Real Edge **156.0.4314.58**, production preview 5194: 390x844 portrait with
  injected top47/bottom34, 844x390 landscape left/right47 and bottom21, and
  1280x900 desktop zeros. Computed top/side padding matched; bottom padding was
  130/117/96 px. No horizontal overflow, external startup requests, or page/console
  errors. Portrait/landscape screenshots inspected; empty app only, no footage.
  This tests CSS/browser startup, not native notch/background handling, iPhone
  file selection, offline inference, performance or real bench accuracy.
- Final whole **320 tests**, lint and guarded `npm run mobile:sync` exit **0**,
  including source/config type-check, 409-module build, both copies and verifier.
  Fresh read-only Codex review (`mobile_behavior_review`, model not exposed) found
  no significant issues; independently passed 100 focused lifecycle/App/guard/
  store/engine tests and `mobile:verify`. It changed no files and compiled no
  native binary. Preview 5194 was stopped after verifying its process identity;
  port confirmed free. Own dev 5193 and earlier 5176 were left alone.
  Step 3 is complete; Step 4 awaits its teaching checkpoint. No native compilation,
  simulator launch, signing or physical-device test yet.

### Task 6 Step 4 preparation

- Added `.github/workflows/mobile-builds.yml` and scoped shared guidance/READMEs.
  Shared checks gate Android debug APK compilation on Ubuntu 24.04/Java21 and
  iOS simulator compilation on macOS26/Xcode, with final package asset comparisons.
  iOS plans an available iPhone simulator boot/install/launch and empty-shell
  screenshot; no human media is imported. Native results are still pending.
- Repo public confirmed through GitHub metadata. Standard public runners are
  free for compute per official GitHub billing documentation; larger runners are
  excluded. Artifacts have one-day retention, explicit prototype/screenshot paths;
  repository token is read-only contents, checkout credentials are not persisted,
  npm automatic caches disabled. No signing credentials, release or paid service.
- Official action release commits verified through GitHub Git refs: checkout
  v7.0.1, setup-node v7.1.0, setup-java v6.1.0, upload-artifact v7.0.2. Actionlint
  **1.7.12** downloaded to ignored scratch, SHA-256 matched official checksums;
  workflow validation exit **0**. Local whole **320 tests**, lint and guarded
  sync/build/config check exit **0**. Fresh read-only Codex workflow review
  (`mobile_ci_review`, model not exposed) found no material findings and
  independently passed `mobile:verify` and diff checks. No files changed by the
  reviewer; no native compile/startup result before the first workflow push.
- Relevant code/config pushes trigger on the mobile feature branch and master;
  Markdown-only changes do not. Manual dispatch is defined but its UI requires
  the workflow on the repository default branch, still `feat/gymbro-video-landmarks`.
  No repository setting was changed. GitHub connector fetch supports push-run
  metadata, while its dedicated commit-workflow helper filters to PR runs.

- Initial workflow commit `b126748` pushed successfully. GitHub connector reports
  [run 1](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41774153219),
  `41774153219`, at that exact head. Shared job passed on Ubuntu24.04.5 with
  Node22.23.2/npm10.9.8: clean install, **320 tests/13 files**, lint and guarded
  sync all succeeded. Android job `126390685905` passed: Gradle reports
  **BUILD SUCCESSFUL in 1m30s**, and final APK contains all 13 shared web files
  byte-for-byte. iOS job `126390685793` passed Xcode **26.6 / 17F113** compilation
  (`BUILD SUCCEEDED`) and package verification on `macos-26-arm64`; simulator
  iPhone17Pro boot/install/launch and screenshot steps exited 0. Startup took
  6m17s. No rendered-UI or physical-device/inference claim follows. In-progress iOS logs were unavailable
  through the connector (404 pending finalized log blob); wait for the job result.
- Android artifact `13296546282` (`GymBroAI-android-debug-1`) is 24,697,556 bytes
  and expires after one day. Downloaded through GitHub connector to ignored
  `build/artifacts/run-1/`; ZIP SHA-256 matches GitHub metadata:
  `c1ba4f4e13663bec784324f185425ee8601ce412c6e4b063a48c531e8b667f0e`.
  Extracted only the expected `app-debug.apk` to `GymBroAI-android-debug.apk`
  (24,697,416 bytes), SHA-256
  `9d82a4922d6d6b387144c337d9f46bf1b82c0b6560040f1e12e69894e9e85c66`.
  No artifact/build output is staged or committed. An APK is not an Android
  device test; simulator app delivery is not a signed iPhone installation.
- Run1 completed **success**, but visual inspection found a **blank dark iOS
  screen with status bar only**, not GymBro AI's interface. This is an acceptance
  failure; a green process-launch check is insufficient. iOS artifact
  `13296457592` (19,967,925 bytes) downloaded through connector; ZIP hash matched
  `dd9ef95de2e743e5a35214a36337148fe2dd631fb6cce58b5dc87daf44e23646`.
  Extracted only simulator ZIP (19,894,745 bytes) and empty startup PNG (72,872
  bytes) into ignored `build/artifacts/run-1/`. No human footage. Local APK
  independently matched all 13 web files against dist after download.
- Diagnostic/readiness change: new macOS-only local Vision text-recognition CLI
  must reject the first-party splash, then require visible GymBroAI/bench-press
  labels in bounded simulator screenshot retries. Capture native App console and
  recent system logs in CI output, and record selected runtime. No paid service,
  no workout images, no speculative app-code changes. Actionlint passes; actual
  Swift compilation/negative check/positive UI remain pending on macOS CI.
- Diagnostic follow-up review found one supported P2: file-backed stdout can
  buffer Capacitor's `Swift.print` startup errors, and reading before termination
  can miss them. Verified local CAPLog implementation and Apple's terminal/
  buffering documentation. Changed launch to `--console-pty`, terminate App,
  allow a bounded five-second logger drain, stop/reap that owned logger, then
  print captured output. System-log collection is supplemental. No other material
  review findings; Swift/console behavior must still be exercised in CI.
- After diagnostic changes, local **320 tests**, lint, build/config check and
  guarded sync pass; actionlint and diff checks pass. This does not validate the
  macOS-only Swift helper on Windows. The next CI run will compile it, check the
  splash rejection and require the real empty-shell interface to become visible.
- Diagnostic commit `99c7f21` pushed; [run 2](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41776005380)
  (`41776005380`) passed shared checks and both native compilers. The new macOS
  Swift guard compiled, and the first-party splash was correctly rejected with
  expected exit1. Bounded real simulator startup is in progress; visible UI and
  native diagnostics remain pending. No product startup fix is claimed.

- Run2 finished with **iOS UI gate failure**, while shared/Android/native iOS
  compilation and the splash negative check passed. All 12 actual screen reads
  showed the simulator home screen (including app icon label OCR "GymBro Al")
  without bench-press UI. The captured console contained only the launched PID;
  no Capacitor/JavaScript error or App unified-log entry established a cause.
  The asynchronous console-attached launch may race capture, or the app may
  fail early; neither is proven. No speculative product code change.
- Revised diagnostic flow uses foreground `simctl launch` before UI retries,
  explicit child unbuffered I/O and SDK stdout/stderr destinations under guest
  `/tmp`, collected through the selected device data directory. Qt Creator's
  primary launcher implementation documents simctl's path rewriting; reading a
  guessed host temp path is unreliable. Capture at most three fresh matching App
  crash reports, bounded 50k characters each, without treating .ips as a single
  JSON object. The startup step is bounded at 15 minutes including slow boot,
  foreground launch, retries and diagnostic collection. No human media or new service.
- OCR now requires the unambiguous `gymbro` fragment **and** `benchpress`, avoiding
  the observed I/l confusion while still rejecting the labeled home screen.
  Reviewer inspected the actual replacement: no material issues; actionlint and
  diff checks independently pass. Local consumer checks validate all five Bash
  blocks and embedded Python/JavaScript syntax. Full local checks are being
  passed (**320 tests**, lint, build/config check, guarded sync) before another
  push. Signing metadata/dylib dependencies will also be printed read-only;
  no actual startup repair is claimed.
- Foreground-launch/crash diagnostic commit `76dd71c` pushed. [Run 3](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41778715047)
  (`41778715047`) passed shared checks and is compiling Android/iOS. Native
  startup logs/crash reports and rendered screenshot remain pending.

### Task 6 Step 4 final result

- [Run 3](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41778715047) at
  `76dd71c` completed **success**: shared checks, Android debug APK and iOS
  simulator compile/package/UI checks. Swift guard compiles and correctly rejects
  the first-party splash. Both final packages contain all 13 shared web files.
- iPhone **17 Pro / iOS 26.4** simulator, Xcode **26.6 / 17F113**, standard
  macOS26 ARM64: foreground launch returned PID13285; first capture lacked the
  interface, next capture recognized actual GymBro/bench-press text. The final
  downloaded 1206x2622 screenshot was manually inspected: header, safe top spacing,
  hero, recording guidance and supported-workflow labels render correctly.
  Console reports **WebView loaded**; no fresh matching App crash report found.
  Absence of a crash report is not a general stability result.
- Foreground launch plus bounded visible-text retries resolves the verification
  failure without changing application code. This does not isolate one production
  defect or measure phone startup/performance; cold shared simulators are slow.
  Retain the guard, separate stdout/stderr and scoped crash diagnostics.
- Signing metadata shows `Signature=adhoc`, `flags=0x20002(adhoc,linker-signed)`,
  `TeamIdentifier=not set`, despite `CODE_SIGNING_ALLOWED=NO`. No Apple identity,
  credentials or provisioning were used. This is a simulator package, not an IPA
  installable on a physical iPhone. Earlier "unsigned" shorthand is superseded.
- Downloaded both current artifacts to ignored `build/artifacts/run-3/`; outer
  ZIP digests match GitHub metadata. Android artifact `13297429135`, 24,697,556
  bytes, SHA-256 `d12dc6377297143f57f67ff95a42cdfe327f6bc8ebd0a0f0ba47c6aab59fd24e`.
  iOS artifact `13298088997`, 20,996,498 bytes, SHA-256
  `768af2609e771b82f87832fb4195bc7fc193d26b5510b46fa0df662e6ae16590`.
  Only expected entries were extracted. APK payload is 24,697,416 bytes, SHA-256
  `06f11dbc5b80a21a5f366db28983eb5033732a7deccdb0cfb6c55bec07b42e32`;
  simulator ZIP is 19,894,745 bytes; visible startup PNG is 1,101,445 bytes.
  Both downloaded package payloads independently match all 13 dist files by
  SHA-256. Artifacts remain one day on GitHub; local ignored copies are retained.
- No actual phone installation, native file selection/background test, offline
  inference, video processing or bench calibration occurred. Android compilation
  does not establish Android UI/device performance; iOS startup proves no pose
  accuracy. M1/Task4 footage acceptance remains incomplete. No store release.

### Task 6 Step 5 whole-feature review and integration

- Authorized on 2026-11-04 by the user's "clear" response to the complete review
  and reviewed merge explanation. Started on clean `feat/task6-mobile-app` at
  `eabf55e`; fetch confirmed local/remote master both `f0e9118`, the branch's
  merge base. D-019 already authorizes fast-forward integration and branch retention.
- Fresh read-only Codex code review (`mobile_whole_feature_review`, no inherited
  builder conversation, model not exposed) examined `f0e9118..eabf55e` against
  D-022/design/plan and scoped rules. **No significant implementation findings.**
  It checked native listener/store ownership, safe-area/vendor behavior, local
  resources/identities, package guard and failure cases, CI final-package and
  visible-startup checks. Independently passed **33 focused cases** in three
  files under Node22.23.2, matched all 13 dist files against each retained native
  package, verified packaged configs/no server overrides and the APK hash, and
  inspected the retained visible iOS screenshot. No native build/device/inference
  test was performed by this reviewer; no files changed.
- Independent read-only Codex documentation audit (`mobile_handoff_audit`, fresh
  context, model not exposed) verified 72 tracked Markdown files, 187 relative
  links/anchors, all 19 CLAUDE imports and authored-directory guidance coverage.
  It found two stale current claims: README privacy still mentioned external
  fonts, and architecture still treated native compilation as future work.
  Both were independently confirmed and corrected. A low-priority index label
  now distinguishes the original M1 plan from the mobile plan. No readiness
  overclaim or unresolved link issue was found. No files changed by the auditor.
- Fresh whole local suite: **320 tests/13 files**, lint and guarded sync/build/
  config check exit **0** (409 modules). Dev server5193 returned HTTP200. Existing
  Browserslist warning remains. Source behavior and native project inputs are
  unchanged by these documentation corrections; run3's native evidence remains
  applicable. Review is resolved.
- Review/documentation correction commit `ed5f1b3` passed whole tests/lint/build,
  actionlint 1.7.12 and staged diff checks before commit/push. Follow-up audit
  found no material issues and verified all 188 relative links/anchors.
- Fast-forwarded local master `f0e9118..ed5f1b3`, then independently reran
  **320 tests/13 files**, lint and guarded sync/build on that merged tree: all
  exit **0**. Working tree stayed clean. Pushed master successfully and retained
  the feature branch; all four local/remote pointers matched `ed5f1b3`.
- Master [run4](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41794275180)
  at `ed5f1b3` finalized **success** in all three jobs: shared `126454557698`,
  Android `126454766976`, iOS `126454766779`. Android logs report successful
  native compilation and all 13 compiled APK files matching dist. iOS logs show
  Xcode26.6/17F113, iPhone17Pro/iOS26.4, all 13 simulator files matching, negative
  splash rejection and foreground launch PID22487. Actual GymBro/bench text was
  recognized at 07:55:12 UTC; native stdout reports WebView loaded. No matching
  fresh App crash report was found; this is not a general stability result.
- Root fetched the completed-success run result, downloaded both run4 artifacts
  and verified outer SHA-256 against GitHub metadata:
  Android `a9bda97c4567acb247e932db3b1419186d7f51326101e224020cf9a8a36355a1`,
  iOS `251676d7f2368a25d8d55e5b76ad89984b61dd8d93fd417534274a81b82bfbc8`.
  Root independently matched all 13 dist files in each downloaded package and
  manually inspected the 1206x2622 screenshot: the real GymBro bench interface
  is visible, with no human footage. Latest payloads are retained in ignored
  `build/artifacts/run-4/`; old run3 evidence is retained separately.
  APK: 24,697,416 bytes, SHA-256
  `a8bdc00bd80188bbdeb8bd3a1b66ea108a8be6fec69d01b943abba38535a2918`.
  iOS App.app ZIP: 19,894,745 bytes; screenshot: 1,094,538 bytes.
  Artifact IDs Android `13305216402`, iOS `13305681152`; one-day retention,
  expiring 2026-11-05 07:46/07:55 UTC respectively. No signed phone IPA or device
  inference result is implied. No artifacts, logs or screenshots are committed.
- Final documentation-only changes also pass **320 tests/13 files**, lint and
  build/config type-check (409 modules). Global Node remains20.20.2; process-local
  verification uses22.23.2. Own dev5193 still returnsHTTP200. All five prototype
  steps are complete. Next: explain and obtain understanding for the physical-
  device/video acceptance planning task; no paid/signing/store action is approved.
- Implementation rulings retained from the plan's scratch ledger: use the
  existing task-specific branch/shared checkout with one writer, matching the
  established workflow (if separate isolation becomes necessary, native changes
  must be transferred); permit only Capacitor's two exact zero-byte compatibility
  stubs, which the pinned CLI writes even without Cordova plugins (adding real
  plugins requires an explicit verifier change). No deferred review findings.

### Earlier milestone context

The current product is **GymBro AI** (`gym-bro-ai`). The user approved the [implementation plan](superpowers/plans/2026-11-02-video-landmarks.md), then changed the first exercise to **bench press** before feature edits began; see [D-013/D-014](DECISIONS.md#d-013-execute-the-reviewed-first-milestone-plan). Tasks 1–3 are complete and reviewed. Whole `npm test` is **236 passed / 236 total**, exit **0** (58 media-helper, 55 engine, 22 selection, 12 store, 11 dropzone, 56 display calculations, 10 overlay, 12 player). Lint and build pass. Task 3 was developed on `feat/task3-overlay-playback`; D-019 integrates the reviewed tip into `master` by fast-forward and push. Check Git for current branch pointers. Task 4 is next, after its teaching checkpoint and permitted fixture gate. The [bench-specific Goldfish review](GOLDFISH_BENCH_REVIEW.md) is complete, with its two acceptance clarifications adopted in the specification. Execution follows the user's explanation-and-understanding checkpoint before each meaningful step.

The working folder is now `D:\Programming\summer 2026 projects\GymBro AI`; older folder paths in historical records are not the current working directory.

## Observed implementation

- React/TypeScript/Vite application with Zustand state and a video-centered UI.
- Local video selection, browser decoding, MediaPipe pose estimation, timestamped observations, progress/errors, and GPU-to-CPU initialization fallback.
- Playback, scrubbing, slow motion, and a canvas landmark overlay.
- Locally bundled pose model and vision WASM runtime.
- Standalone metadata, seek, and duration-recovery helpers with bounded event-driven waiting, invalid-value rejection, drawable-frame checks, cancellation, typed errors, and cleanup; 58 simulated-browser tests pass. The engine uses them, and the store relies on the engine for decoding and metadata.
- A one-clip session store: admission through `validateSelection`, a fresh engine and job token per clip, cancellation on removal/reset, a `cancelling` state that blocks admission until cleanup, and leased object URLs revoked once; 12 store tests pass with the real engine and a mocked SDK.
- A bounded pose engine: metadata limits before model work, one shared initialization budget, per-job detector ownership, busy rejection, seek/total deadlines, cancellation, forward-only sample times, and copied, validated landmarks; 55 mocked-SDK contract tests pass. See [ARCHITECTURE.md](ARCHITECTURE.md#pose-engine-lifecycle).
- Geometry and smoothing helpers plus provisional analysis types.

These are source-inspection observations. They do not establish that real-video pose alignment, accuracy, mobile performance, or every failure path has been tested successfully.

## Not implemented or not demonstrated

- Verified first-milestone result on a real, permitted side-view bench-press clip.
- Rep detection/counting, descent/bottom/ascent segmentation, validated anatomical-angle/depth/tempo measurements, or technique findings. Task 5 separately implements limited image-space elbow estimates and explicit missingness; it does not establish those biomechanical capabilities.
- Saved sessions, comparisons, authentication, backend services, or a database.
- Compiled/installed mobile build, device performance results, or store submission.
- Complete real-browser acceptance tests, fixture manifest, evaluation dataset, or measured accuracy benchmarks. The passing unit/component checks are described below.

## Known inspection findings

- Resolved in the engine on 2026-11-02 (mocked tests only): unbounded `seekTo`, the shared detector across clips, unsequenced detector timestamps, and missing duration/dimension bounds. The file-size bound is checked at admission, which Task 2 adds.
- Resolved in the store on 2026-11-03 (mocked tests only): the pending legacy metadata wait, no cancellation on removal/reset, the shared engine across clips, and immediate URL revocation while still in use.
- One detected frame can currently mark a whole clip ready.
- `SkeletonOverlay.tsx` uses bounded display interpolation without modifying raw observations. Legacy `math.ts` gap filling has no current analyzer consumer and must not be mistaken for measured evidence.
- Resolved on 2026-11-03: the UI no longer offers exercise/angle choices and its copy no longer claims coach-grade analysis, measurements, or bar tracking. Future analysis types (not rendered) still include arbitrary score fields and lack the required finding-evidence contract.
- The build's TypeScript check includes application source, but does not reference `tsconfig.node.json` or type-check `vite.config.ts` through that configuration. `@types/node` is now installed for the planned test setup. Wiring a configuration check remains separate work.
- Unit/component checks cover media helpers, engine, selection, store, dropzone, display helpers, overlay, and player. Full real-browser bench-press acceptance remains pending.

These findings need targeted reproduction and verification during implementation. Do not silently promote them into measured failure rates.

## Verification evidence and limits

### Initial environment baseline, before tooling repair

The initial environment check on 2026-11-02 used a temporary directory containing the authored project files, excluding Git internals, installed dependencies, build output, and TypeScript build caches. That initial verification did not replace the working repository's packages or installed dependencies.

- Runtime: Node **20.20.2**, npm **10.8.2**. Locked tooling: Vite **6.4.2**, TypeScript **5.9.3**, MediaPipe Tasks Vision **0.10.35**. This is a verified machine baseline, not a newly imposed version policy.
- `npm ci --no-audit --no-fund`: exit **0**, installed 180 packages from the lockfile. Dependency security auditing was not performed by this command.
- `npm run build`: exit **0**, TypeScript application-source check and Vite production build passed. This does not establish coverage of the inactive configuration type-check noted above.
- `npm run lint`: exit **1**, Windows reported that `eslint` is not recognized. The clean copy has no local ESLint executable and none of the six lint packages is locked.
- `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`: started successfully. HTTP checks returned **200** for the page, transformed `/src/App.tsx`, bundled pose-model path, and WASM path; the page contained the correct brand. Model/WASM checks used HEAD requests and do not prove initialization or inference. The temporary server was stopped after verification.
- Shutdown was verified specifically at `127.0.0.1:5174`; another project's listener on a different local address was left untouched. Automatic approval review rejected removal of the temporary directory with "blocked by policy," so `%TEMP%\spotter-ai-env-aae48875eda94988b6ca8fbb58cd2818` remains. Do not bypass that policy block with another deletion mechanism.
- Nonblocking upstream messages: the locked Recharts 2.x release reports deprecation, Browserslist data is stale, and the MediaPipe bundle references an absent source map. No package upgrades or suppression changes were made; these messages are not evidence that pose inference failed.
- No browser-rendering test, real-video inference, network/privacy audit, phone benchmark, or scientific accuracy evaluation was performed. No test script exists yet.

### Latest verification, after tooling repair

The authorized repair added these six development dependencies and updated the lockfile: ESLint **10.14.0**, `@eslint/js` **10.0.1**, `globals` **17.14.0**, `eslint-plugin-react-hooks` **7.1.1**, `eslint-plugin-react-refresh` **0.5.7**, and `typescript-eslint` **8.72.1**. The working repository's installed tooling was updated accordingly. ESLint 10 was selected after checking the maintained release line and plugin/runtime compatibility; no lint configuration or rule was changed.

- Reused the retained verification directory, refreshed its authored files and final manifest/lockfile, and ran `npm ci --no-audit --no-fund`: exit **0**, installed **273** packages.
- Clean-copy `npm run build`: exit **0**, TypeScript application-source check and Vite build passed; **396** modules transformed. The separate inactive configuration type-check remains outside this repair.
- Working-repository and clean-copy `npm run lint`: exit **1**, exactly **one error and zero warnings**, both at `PoseEngine.ts:161:11` for `no-useless-assignment`. The missing-executable defect is resolved; whole-project lint is not yet passing.
- Clean-copy `npm ls eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh typescript-eslint --all`: exit **0**, compatible resolved peer tree with ESLint 10.14.0.
- Before/after comparison against pre-repair snapshots: exactly six `devDependencies` added; all existing dependency specifications and locked package objects unchanged. There are **93** new locked package entries, all development-only.
- Application source, public assets, ESLint configuration, Vite configuration, and TypeScript configurations remain byte-for-byte unchanged by this repair. Build output was generated only in the temporary copy.
- No test framework, new application behavior, server, mobile scaffold, or real-video test was introduced. Prior upstream messages and verification limits remain applicable.

### Independent repair review

A fresh reviewer compared pre-repair manifest/lock snapshots with the final files and inspected resolved package metadata and unchanged source/configuration. Verdict: **no significant findings in the dependency repair; technically sound on Node 20.20.2 / npm 10.8.2**. It independently confirmed that new dependency/peer ranges resolve compatibly and newly added Node engine requirements accept the verified runtime.

The reviewer classified the redundant `result` initialization as a **low-severity existing source issue**, separate from the dependency repair; it blocked a green lint command at that stage. No source change or rule suppression was made during the dependency repair. The reviewer inspected files and metadata but did not rerun install/build/lint; the command results above were supplied by the coordinator. Security auditing, real-video correctness, and product readiness were not reviewed.

## Documentation handoff

- Original user brief copied without content changes to `PRODUCT_BRIEF.md`; source and copy SHA-256 matched at creation.
- Root/scoped `AGENTS.md` files capture local responsibilities, teaching checkpoints, independent judgment, and review obligations.
- Accepted direction is recorded separately in `DECISIONS.md`; architectural proposals and prototype gaps remain labeled.
- `WORKFLOW.md` supplies reusable Goldfish and implementation-review prompts.
- Root `spec.md` describes the proposed first implementation milestone. Its engineering defaults are proposals, not measured results or user-approved numeric requirements.
- Independent Goldfish review: [ready for implementation planning](GOLDFISH_REVIEW.md), with no consequential blockers or material unanswered requirements. This is not runtime or scientific verification.
- Initial documentation coverage/link/integrity checks passed: 12 maintained directories have instructions, relative Markdown links resolve, the original brief matches its attachment, and application/runtime files retained their hashes at that stage.
- Initial documentation-stage edits to existing files were limited to README accuracy/context links and a `.gitignore` exception so `.vscode/AGENTS.md` can be versioned. Other work already present in Git status was preserved.
- Environment verification and the later separately approved tooling repair are recorded above. The subsequent source cleanup is recorded below; root instructions and README reflect the now-passing checks.
- The tooling repair changed `package.json`, `package-lock.json`, installed development packages, and the relevant handoff documentation. Application code and lint rules were preserved.
- Source cleanup was approved separately and was not part of the dependency repair. First-milestone feature implementation still requires its own planning and understanding checkpoints.

## Current identity handoff

- Updated the app header/introduction, browser title, README, type-file description, active branding guidance, architecture reference, and milestone specification to **GymBro AI** after the user's display-spacing correction.
- Updated package/root lockfile names and local installed-package metadata to `gym-bro-ai`. Comparison with pre-rename snapshots confirms that only identity metadata changed; all dependency specifications and locked dependency records are unchanged.
- Original `PRODUCT_BRIEF.md`, completed `GOLDFISH_REVIEW.md`, and operational paths identifying retained temporary directories are preserved.
- Initial branding verification: `npm run build` exited **0** with **396** modules transformed. Generated HTML and the application bundle contained the approved name at that stage. All **20** Markdown files and their local links/anchors passed checks; **12** maintained directories still have guidance. Historical names remain only in the original brief, the decision history in D-010, and the actual retained temporary-directory path. The subsequent display-spacing correction does not change package metadata or application logic.
- Display-spacing correction verification: a fresh `npm run build` exited **0** with **396** modules transformed. Built HTML/application text now uses **GymBro AI**, the package remains `gym-bro-ai`, and all **20** Markdown files' local links/anchors pass. No new real-video or runtime UI test was performed for this text-only correction.
- Rename-stage `npm run lint` exited **1** for the preexisting `PoseEngine.ts:161` error, with **zero warnings**. Its source cleanup was not included in the rename.
- Fresh independent rename review: **no significant findings**. The reviewer checked identity-only source substitutions, active guidance, preserved original/review hashes, and document links. It did not rerun build/lint/browser checks; its PowerShell reader could not parse the lockfile's empty package key, so lockfile equality relies on the coordinator's successful Node comparison. This does not establish real-video correctness or runtime UI rendering.
- The previously deferred lint cleanup was completed in the separately approved step below.

## Source cleanup handoff

- User approval: [D-011](DECISIONS.md#d-011-remove-unused-detector-result-initializer).
- Sole application-code change: `let result: PoseLandmarkerResult | null = null;` became `let result: PoseLandmarkerResult | null;` at `src/core/PoseEngine.ts:161`. The assignment from detection and the error-handling path are unchanged. No lint rule was disabled.
- Before the edit, `npm run lint` exited **1** with the expected `no-useless-assignment` error. After the edit, the same command exited **0**, with no diagnostics.
- `npm run build` exited **0**, including the TypeScript application-source check and a Vite build of **396** modules. The existing Browserslist-data warning remains; this is not a warning-free build claim.
- A fresh read-only reviewer found **no significant findings**. Its exact comparison confirmed only `= null` was removed: detection assigns before success-path reads, and the unchanged catch throws before any unassigned read on failure. The reviewer did not rerun lint/build; the coordinator ran the commands above.
- Dependency files and unrelated application source remain unchanged by this cleanup. No test framework or new unit test was added for a dead-initializer removal; the lint failure-to-pass check and TypeScript compilation directly verify the reported issue.
- No real-video inference, browser rendering, phone performance, or scientific validation was performed. Broader lifecycle/validation/measurement gaps remain as listed above.

## Task 5 setup: post-pipeline elbow measurements

- The user's new instruction explicitly requested tasks after the bench-video
  work, without stopping at that blocker. D-021 authorizes a bounded later-feature
  batch. Builder choice: estimated image-space elbow angles and an evidence
  timeline; no claim that the user specified the algorithm or cutoff.
- Created `feat/task5-elbow-measurements` from verified reviewed local/remote
  `master` at `680201d`. Task 4's pushed test tooling stays on its separate branch
  at `34538e4`; do not misreport its 254 tests as this branch's baseline.
- Drafted the design/implementation plan and scoped specs guidance, and updated
  instructions to make the ordering exception explicit. Original brief and M1
  specification are preserved. A fresh read-only Codex builder/Goldfish review
  found **nothing important left**; wording explicitly identifies stored
  observation indices rather than decoded source-video frame numbers. Reviewer
  served model ID unavailable; no code changes, browser or inference by reviewer.
- `npm install --no-audit --no-fund` succeeded, removing three Task 4-only tooling
  packages without changing this branch's package/lockfile. Baseline `npm test`:
  **236/236** in eight files; lint exit **0**; build exit **0**, 400 modules,
  existing stale Browserslist warning. Own strict-port dev server **5191** returned
  HTTP **200** before feature code. Earlier 5176 server untouched.
- Implementer: Codex; served model ID unavailable. No new runtime dependency,
  new positive-pose inference, human recording, or browser image artifact.

## One next task

Task 5 Step 2: implemented four pure functions in `src/core/elbowAngles.ts`.
The 40 new synthetic-geometry cases all failed first against API stubs, then
passed. Source-pixel axis scaling, bilateral availability, zero/180 degrees,
unknown visibility, invalid/out-of-image/degenerate points, immutable raw input,
observation indices and actual times, bounded nearest sampling, independent gap
segments, and valid-neighbor navigation are covered. The UI is now wired as below.
Whole tests: **276/276** across nine files; lint exit **0**; build exit **0**,
400 modules and existing stale Browserslist warning. Real bench landmark/angle
accuracy remains unverified.

Task 5 is complete within its bounded scope; its final review/verification is recorded below. Next product increment: a separately scoped repetition/phase-timing design using this measurement/missing-data layer. Task 4 real bench acceptance remains open and independent. Do not silently activate legacy scores, invent biomechanical thresholds, or claim validated rep counts from synthetic checks.

Task 5 Step 3: `ElbowTimeline.tsx` now uses the real measurement helpers below
the existing video controls. It displays per-side values or unavailable reasons,
the selected raw observation/time, discontinuous SVG lines/singleton points,
and accessible previous/next measured-sample navigation through `VideoStage`'s
existing seek handler. No added listeners, animation loops, video/URL leases,
store state, or persistence. Invalid measurement metadata leaves replay usable.
HTML axis labels remain legible when the plot resizes to a narrow viewport.

Test-first UI run: **11 failed / 12 passed**, 23 cases across the panel/player;
new panel and integration cases all failed before implementation. Green: **23/23**
focused, whole **287/287** in ten files, lint exit **0**, build exit **0**,
403 modules and existing stale Browserslist warning. Supplied positive-pose
geometry is explicitly synthetic, not a MediaPipe or human bench result.

Task 4 acceptance remains open on its separate branch. The user cannot arrange footage and requested continued licensed-footage search; do not ask them to record again. Real bench identity, anatomy and positive synchronization remain unverified. Do not claim that geometry/component fixtures validate real bench measurements.

## Task 5 final review, browser verification and handoff (Step 4)

- Fresh read-only Codex reviewer inspected the committed core plus then-working
  panel/player diff against base `680201d`, scoped instructions, D-021, design,
  plan and surrounding engine guarantees. It found **no significant findings**
  and independently passed **63/63** core/panel/player tests. No reviewer edits,
  browser/server, inherited implementation conversation or further agents.
  Reviewer and implementer served model identifiers were unavailable.
- After review, visual QA moved axis labels from scaled SVG text to HTML so
  labels stay readable at narrow widths. No measurement/navigation behavior
  changed. Repeated whole tests **287/287** across ten files, lint exit **0**,
  build exit **0**, 403 modules, existing stale Browserslist warning.
- Real browser verification: installed Edge **156.0.4314.58**, real **GPU**
  inference on the internally generated black H.264 clip from Task 4 scratch,
  **120** sampled positions. The completed no-pose result displayed unavailable
  angle values and disabled sample navigation, followed playback and a paused
  seek to raw observation time **2.000 s**, remained within a **390x844** viewport,
  and disappeared on clip removal. No page error or unexpected external/write
  request observed; fonts were blocked. SDK remains pinned at **0.10.35**.
- Separate visual/navigation check: the actual component rendered supplied
  geometry in a conspicuously labeled **synthetic component preview, not model
  output**. The app's session state was never seeded. Previous/next callbacks,
  a missing-data break, **390x844** and **1280x900** layouts passed. Inspected
  screenshots are ignored scratch and contain no human recording or claimed
  positive inference. This does not prove bench landmarks/anatomy or overlay
  accuracy. The first preview harness failed because optimized ReactDOM exposed
  `createRoot` on its default export; corrected the harness, not product code.
  An explicit phone viewport was added to the preview-only rerun before claiming
  mobile-size verification.
- Programmatic browser QA reused Playwright **1.64.1** from the ignored clean
  Task 4 copy; no new dependency or private/paid service was introduced. Another
  provider may use its own equivalent tool; no scratch path is an app prerequisite.
- Own strict-port dev server **5191** was verified by command/process identity,
  stopped, and its port verified free. Earlier **5176** server untouched.
- Step 3 is committed/pushed at `d8f5b9d`. Step 4 records the reviewed feature
  and final verification, then D-019 fast-forwards/pushes `master` to the Task 5
  tip, retaining the branch. Task 4 stays unmerged/incomplete at `34538e4`.
  Check Git refs for the resulting tips rather than assuming an earlier hash.
- Unverified: real bench target-person identity and anatomical angle accuracy,
  positive-pose media synchronization, rotated sources, physical-phone behavior,
  and the 60 s processing budget. No repetition detection, technique findings,
  storage/backend or mobile packaging was added. The original M1 gate is open.

## Test-tool verification checkpoint

Verified on 2026-11-02 after the user confirmed the explanation of this step:

- `npm ls --depth=0`: exit **0**. Installed test tooling includes Vitest **4.1.12**, jsdom **29.1.1**, and `@types/node` **20.19.43**. Vitest's version command starts successfully on Node **20.20.2**.
- A direct jsdom smoke check creates an `HTMLVideoElement`: exit **0**. The first command attempt failed because of PowerShell argument quoting; piping the same JavaScript through standard input corrected the command. No application change was needed.
- Development server `http://127.0.0.1:5175/`: HTTP **200**, with the GymBro AI title present. This checks serving, not rendered playback or inference.
- `npm run build`: exit **0**, **396** modules transformed; the existing stale Browserslist-data warning remains.
- `npm run lint`: exit **1**, **30** parser errors. ESLint scans the generated backup snapshot as well as the working source, and the two configuration roots conflict. `.gitignore` does not exclude files from this ESLint configuration.
- Diagnostic `eslint . --ignore-pattern '.superpowers/**'`: exit **0**, no diagnostics. This isolates the failure to the generated backup scope without changing configuration or disabling rules. The ordinary lint command remains failing until its configuration is repaired.
- No `npm test` script, Vitest configuration, or application tests were added in this verification step. No test-suite, real-video, or model-accuracy result is claimed.

### Generated-backup lint exclusion repair

After the user confirmed this step's explanation, changed only `globalIgnores(['dist'])` to `globalIgnores(['dist', '.superpowers/**'])` in `eslint.config.js`. The backup remains present; no lint rules were disabled and no application source or dependency files changed in this repair.

- Before the edit, `npm run lint`: exit **1**, **30** parser errors from competing working-project and backup configuration roots.
- After the edit, ordinary `npm run lint`: exit **0**, no diagnostics. `git diff --check -- eslint.config.js` also passed.
- Direct checks using the root configuration confirm that backup source/configuration files are ignored and working `src/App.tsx` and `src/core/PoseEngine.ts` remain included.
- An initial default-API diagnostic reported that an explicitly targeted backup file was not ignored. Investigation confirmed that ESLint 10 discovers the backup's own preserved configuration for that explicit file. Root traversal and an explicitly selected root configuration correctly exclude the backup. This is a configuration-discovery distinction, not a failure of the ordinary project lint command.
- Fresh read-only review: **no significant findings**. The reviewer independently ran normal lint and verified **21** linted files, no snapshot files, zero errors/warnings. Effective configurations for all **14** application TypeScript files and `vite.config.ts` match the baseline, with **108** rules each; the existing `dist` exclusion remains effective.
- Build was not repeated for this ESLint-only change; the preceding build verification remains applicable to unchanged application source. No application test suite, real-video inference, or accuracy validation was performed.

## Test-harness setup handoff

- User confirmed the explanation before this bounded setup step. Added `test: "vitest run"` in `package.json` and created `vitest.config.ts`, merging existing Vite settings with `environment: "jsdom"` and `include: ["src/**/*.test.{ts,tsx}"]`. Updated README and root instructions to describe actual behavior and limitations.
- Dependencies were already installed and committed before this step. Comparison with the pre-test-tools lock snapshot found **zero** changed preexisting non-root locked package records and **65** added records. This setup did not change the lockfile or dependency versions.
- A temporary source smoke check verified normal test discovery, an `@/core/math` import, an HTML video element, metadata events, and a clock advanced from 9,999 to 10,000 ms. `npm test` with that temporary check: **1 test passed**, exit **0**. The check was removed afterward; it is not a retained application test or a real decoding test.
- Final `npm test`: exit **1**, `No test files found`, with the intended source glob. No empty-suite success flag was added. This confirms the runner starts and reports the missing suite honestly; it is not a passing application-test result.
- `npm run lint`: exit **0**. `npm run build`: exit **0**, **396** modules transformed; the existing Browserslist-data warning remains. Scoped whitespace checks passed.
- Fresh read-only review: **no significant findings**. The reviewer independently verified the empty-suite result, lint, resolved jsdom environment, retained alias/React plugins, source-only discovery, compatible installed engines/peers, and unchanged dependency specifications. It did not repeat the coordinator's build or temporary smoke run.
- No application source or production Vite configuration changes remain. No permanent behavior tests, bounded media helpers, real-video inference, or accuracy results were added. The build's unrelated configuration-type-check limitation remains.
- Marked only Task 1 Step 1 complete. Preexisting edits elsewhere in the implementation plan and the generated TypeScript cache were preserved. The plan currently contains preexisting stale bench-review wording and an omitted intended-lifter substep; use the accepted decisions/current specification as authority before the later fixture work rather than silently weakening acceptance.

## Initial metadata tests: partial test-first handoff

- After the user's understanding checkpoint, created `src/core/video.test.ts` with three tests: literal already-ready metadata (12.5 s, 1280x720), timeout at 10,000 ms while still pending at 9,999 ms, and cancellation of a pending wait before its deadline. Each case checks that no helper timeout remains afterward.
- Tests use real jsdom video elements with controlled read-only media properties where needed, fake time, literal expected outputs, and structured error assertions. Rejection checks are attached before time advances. Cancellation is checked while the clock stays below the timeout, rather than relying on timeout completion.
- Targeted `npm test -- src/core/video.test.ts` and whole `npm test`: exit **1**, unable to resolve `./video`, **zero assertions executed**. This records the planned missing-helper boundary only. No assertion failure-to-pass result has been established.
- `npm run build`: exit **1**, TypeScript **TS2307** at the same missing import. The current working tree does not have a passing build. `npm run lint`: exit **0**; `git diff --check` passed.
- Fresh read-only test-design review: **no significant findings within the three approved cases**. The reviewer independently reproduced the missing import and explicitly did not treat it as behavioral verification. This is a partial review, not completion of the media helpers or Task 1.
- No production helper, shared error implementation, engine change, dependency change, or real-video check was introduced. Updated root/README command notes to reflect the current failure rather than retaining a green-build claim. Plan Step 2 is still incomplete: additional metadata/event/error/cleanup and seek cases remain. Next action is the helper implementation after the user's explanation checkpoint.

## Initial metadata-helper implementation handoff

- After the user's checkpoint, implemented `readVideoMetadata` and its `VideoMetadata`/`MediaWaitOptions` interfaces in `src/core/video.ts`. It returns already-available valid details, or subscribes to metadata/duration/error events with one deadline and abort handling. All terminal paths share timer/listener cleanup. It does not decode a frame or enforce the later clip size/duration/dimension bounds.
- Created `src/core/processingErrors.ts` and shared processing stage/failure-kind types. `PoseEngine.ts` now imports and directly re-exports the shared error class, preserving the store's import and `instanceof` behavior. No engine processing logic changed; the app still uses its existing metadata path.
- Added event-driven completion/listener-release, pre-cancelled signal, and media-error tests to the original three cases. A temporary API-only implementation made the tests collect and exposed genuine failures. That first run also exposed unhandled promise/async-assertion rejections in the tests; changed test-only observation to attach both handlers immediately and assert the captured result. The clean run showed **six failing tests** before implementation; no stub remains.
- Targeted and whole `npm test` after implementation: exit **0**, **six tests passed**, no unhandled-rejection warnings. First lint reported one `prefer-const` error; reordered early rejection/resource setup and then reran the whole suite, lint, and build. Final `npm run lint`: exit **0**. Final `npm run build`: exit **0**, **397** modules transformed; the existing Browserslist warning remains.
- Development server was restarted from the renamed folder at `http://127.0.0.1:5176/` before implementation; HTTP **200** and GymBro AI title verified. It remains running. This does not establish rendered video playback or inference.
- Fresh read-only review: **no significant findings in the delivered scope**; reviewer independently ran the six tests, inspected cleanup/deadline behavior, and confirmed error-class compatibility and the absence of engine logic changes. It did not rerun lint/build or validate real decoding/inference.
- Remaining direct test gaps include invalid metadata, duration-change recovery, a deadline under repeated events, invalid timeout inputs, and listener cleanup on failure. Unusable metadata currently waits for usable values or the deadline; more specific invalid-data handling and unknown-duration probing are unfinished. Seeking, clip bounds, model lifecycle, engine/store integration, and real-video acceptance remain pending. Plan Steps 2/3 and overall Task 1 are not complete.

## Metadata edge-case handoff

- User confirmed this step's explanation before edits. Expanded `src/core/video.test.ts` from **6 to 28** cases covering incomplete duration recovery, invalid loaded dimensions/duration, an existing browser error, repeated events under one deadline, invalid timeout inputs, and video/signal listener cleanup after every implemented failure kind. Event spies delegate to real jsdom EventTarget methods.
- Before changing the helper, the final test-first run had **10 failures and 18 passes**: invalid loaded metadata remained pending instead of failing immediately, including its cleanup cases. Changed only `src/core/video.ts` production behavior: reject invalid loaded dimensions as `validation` and nonpositive/invalid duration as `no-duration`. NaN/positive Infinity remain temporarily unknown and can recover through `durationchange` without extending the original deadline.
- Final whole `npm test`: exit **0**, **28 tests passed**. `npm run lint`: exit **0**. `npm run build`: exit **0**, **397** modules transformed; existing Browserslist-data warning remains. `git diff --check` passed. Existing development server on `127.0.0.1:5176` returned HTTP **200** before changes.
- Fresh read-only review: **no significant findings in this bounded step**. Reviewer compared exact prior source/test snapshots and independently ran **28/28** targeted tests. It did not repeat lint/build or the recorded RED run. No packages, engine/store integration, or other production modules changed in this step.
- Tests use controlled browser properties/events; some deliberately malformed numeric values are synthetic validation inputs. They do not establish real video decoding or actual metadata timing across browsers. Explicit unknown-duration probing, seeking/frame readiness, full processing lifecycle, and real-video acceptance remain pending. Plan Steps 2/3 and Task 1 remain incomplete.

## Safe-seek helper handoff

- User confirmed the seeking explanation before edits. Added `seekToFrame(video, time, options): Promise<void>` in `src/core/video.ts`. The caller owns the video while waiting. New/in-progress seeks require completion, `seeking === false`, current-frame data, and positive finite dimensions. Same-position ready frames resolve immediately without assigning time; same-position frames awaiting data do not depend on another `seeked` event.
- Added **20** seek cases: zero/current position, delayed data, new and in-progress seeks, both completion/data orderings, zero-dimension timeout, pre-cancellation, abort/media-error/timeout/setter-throw cleanup, successful cleanup, existing media error, invalid target/timeout inputs, and preservation of the browser-reported resulting time. Listener spies use real EventTarget methods. A temporary API-only implementation produced **20 failures / 28 existing passes**; no stub remains.
- Final whole `npm test`: exit **0**, **48 tests passed**. `npm run lint`: exit **0**. `npm run build`: exit **0**, **397** modules transformed; existing Browserslist-data warning remains. Development HTTP `127.0.0.1:5176` returned **200** before edits.
- Fresh read-only review: **no significant findings in the scoped change**. Reviewer compared exact prior source/test snapshots and inspected the event ordering, validation, cleanup, and test contract. It did not rerun tests/lint/build or perform browser decoding. Metadata behavior and its 28 cases are unchanged by this step.
- No packages, engine/store code, UI, or other production modules changed in this step. These are simulated media-state tests, not real frame decoding/pose inference. Unknown-duration probing, processing bounds, detector lifecycle, integration, and permitted real-video acceptance remain unfinished; Task 1 is not complete.

## Bounded duration-recovery handoff

- User confirmed the duration-recovery explanation before edits. Unknown duration now triggers one far-end seek request after metadata is available. The helper snapshots the original position before mutation, reads only actual finite duration, and requests restoration before reporting success. It waits for restoration to finish but does not require decoded frame data at the metadata stage. Known-duration videos are not moved.
- Probe and restoration share the original metadata timer; no budget is restarted. On abort/error/timeout, listeners/timer are removed and restoration is requested best-effort without another wait. A failed restoration cannot replace the primary cancellation/timeout/error. The caller remains responsible for video teardown; failed/cancelled operations do not guarantee completed restoration or stop all browser decoding.
- Added **10** cases, including restoration from a nonzero position, one attempt despite repeated events, delayed metadata/probe/restore under the same deadline, both cancellation phases, setter/media failures, and synchronous notification handling. Test-first run: **9 failures / 49 passes** before implementation. Final whole `npm test`: exit **0**, **58 tests passed**. `npm run lint`: exit **0**. `npm run build`: exit **0**, **397** modules; existing Browserslist warning remains. Whitespace check passed. Development HTTP on `127.0.0.1:5176` returned **200** before edits.
- Fresh read-only review: **no significant findings** in this bounded change. Reviewer compared exact prior snapshots and independently ran **58/58** targeted tests. It did not repeat the RED run or lint/build. Safe-seek implementation is unchanged; no dependencies or other production modules changed in this step.
- Marked plan Steps 2/3 complete based on tested media helper behavior; overall Task 1 remains incomplete. Engine limits/init/processing tests and implementation, store integration, and permitted real-video acceptance remain. Controlled jsdom events do not demonstrate recovery/decoding across actual browsers or model accuracy.

## Pose-engine contract tests: RED handoff

- User confirmed the test-only step before edits. Created `src/core/PoseEngine.test.ts` with controlled public SDK initialization/detection and complete result-shaped synthetic observations. The media fixture dispatches real jsdom events; its delayed decoder timers are tracked separately from engine timers. Test teardown closes tracked engines only after assertions.
- Added **36** cases covering metadata bounds before runtime/model loading; accepted boundaries; zero-position readiness; one 60,000 ms budget including runtime load and GPU/CPU fallback; init failure, abort/explicit close and late model disposal/rejection; concurrent processing rejection; seek/total deadlines; cancellation; actual ordered unique media samples; detector clock sequencing; copied mutable SDK output; genuine no-pose and unknown visibility; off-image coordinates; malformed output; and detector/timer cleanup.
- Final whole command used the normal `npm test` script with JSON reporting: **94 total**, **65 passed**, **29 failed**, exit **1**. Breakdown: **58/58 media-helper cases pass**; engine **7/36 pass**, **29 fail**. Failures are assertions against missing engine behavior, not missing imports. The stored report/console log are generated scratch artifacts under `.superpowers/sdd/2026-11-02-video-landmarks/engine-contract-red.*`.
- `npm run lint`: exit **0**. `npm run build`: exit **0**, **397** modules transformed; existing Browserslist warning remains. The build includes static Tailwind scanning of source test files, so generated stylesheet contents can change without an application-source edit. Engine SHA-256 matches the exact pre-test snapshot: **no engine implementation change in this step**. No dependencies or other production modules changed.
- Fresh read-only test-design review found **no significant defects** in the initial 34-case suite. It identified nonblocking timer-leak/mixed-runtime-budget/explicit-close coverage gaps. Added those targeted checks and reran the whole suite, lint, and build. Resource assertions occur before cleanup; the slow-decoder case releases only fixture-owned events before checking engine timers. Reviewer inspected the original saved RED report/source but did not rerun commands or review these final two added cases separately.
- Marked plan Step 4 complete; Step 5 implementation and Step 6 observation behavior still need passing verification. Mocked responses verify coordination only, not actual model initialization, decoding, inference, or landmark accuracy. Some assertions after an earlier failing assertion have not yet executed; the green implementation run must exercise the complete contract before acceptance.

## Claude Code continuation handoff

- User requested portable documentation and continuation in Claude Code after
  reporting Codex usage limits; accepted as D-015. Prepared `HANDOFF.md` with the
  current 94-test baseline, scope, working-tree state, approval boundary, and exact
  next task. Prior checks are labeled historical; no runtime tests were repeated
  for documentation-only work.
- All **14 maintained project directories** now contain `AGENTS.md`, `README.md`,
  and `CLAUDE.md`. The short Claude files import adjacent shared rules with
  `@AGENTS.md`; rules are not copied into a separate policy. Existing local rules
  were preserved. Added Git ignore exceptions for the two new editor documents.
- Root guidance loads the compact handoff first, then relevant scope/context,
  rather than requiring the full historical record on every startup. Added folder
  explanations, a paste-ready Claude startup prompt, actual-provider review rules,
  and one-writer ownership guidance. Existing plan edits were preserved.
- Self-audit: directory/import coverage and **160 local link paths** passed;
  **44 source/config/runtime/test/original-brief files** retained SHA-256 hashes;
  whitespace checks passed. No application code, dependency, asset, engine test,
  or original brief changed. No commits, pushes, or account settings changed.
- Claude CLI was not on this PowerShell session's PATH. Actual Claude instruction
  loading, login/subscription routing, and execution were not verified; confirm
  loaded instructions with `/context` in the user's Claude Code interface. No
  Claude or additional Codex reviewer was launched for this documentation pass;
  the audit is a self-check, not cross-provider verification.

## Pose-engine contract implementation handoff (Task 1 Steps 5–7)

- Implemented by Claude Code (model Opus 5.5) on 2026-11-02, after the user
  approved the explained step ("lets just start with the development"). The user
  asked not to rerun anything first, so the RED baseline was **not re-observed in
  this session**; it rests on the earlier recorded run (94 total, 65 passed, 29
  failed, saved under `.superpowers/sdd/2026-11-02-video-landmarks/engine-contract-red.*`).
- Changed paths: new `src/core/processingLimits.ts`; rewritten `src/core/PoseEngine.ts`.
  Steps 5 and 6 were done together because both rewrite the same sampling loop.
  The old engine-local `seekTo`/`resolveDuration` were removed in favour of the
  `video.ts` helpers. No test, store, UI, type, or dependency file changed.
- Behavior and design are recorded in [ARCHITECTURE.md](ARCHITECTURE.md#pose-engine-lifecycle).
  Implementer choices that the reviewer should check:
  - `init(options)` prepares a detector that the next job adopts unused. No test
    covers it and nothing calls it; this is one reading of the plan's interface.
  - A pose must have exactly 33 landmarks; present-but-non-finite visibility is
    treated as malformed (`detect`); world landmarks absent while normalized
    landmarks are present become `null`.
  - An invalid reported media position is `video-load`/`seek`. External
    cancellation and `close()` report `aborted` without a stage; the total
    deadline reports `timeout`/`processing`.
  - Progress `processedFrames` counts visited sample positions, including skipped
    repeats, so it stays comparable with `estimatedTotalFrames`.
  - `coverage.meanVisibility` still reports 0 when no visibility is known
    (unchanged preexisting behavior).
- Interim app effect: each job loads the model again, and a clip added while one
  is processing fails with `busy`. Task 2 owns the store-side lifecycle.
- Checks run after implementation: `npm test -- src/core/PoseEngine.test.ts`
  **36/36 passed**; whole `npm test` **94/94 passed**, exit **0**; `npm run lint`
  exit **0**; `npm run build` exit **0**, **399** modules, existing Browserslist
  warning. Mocked SDK responses and simulated media verify coordination only;
  no real decoding, model initialization, inference, or accuracy was tested.
- Review: **not yet performed** (plan Step 8 is next). No fix has been made in
  response to a review.

## Repository structure fixes handoff

- After an audit of the layout requested by the user, Claude Code (Opus 5.5)
  applied the three fixes approved as [D-017](DECISIONS.md#d-017-repository-structure-fixes)
  on 2026-11-02. The audit found files where the plan places them, tests next to
  their code, and guidance in every authored directory; it found the problems below.
- `public/` guidance was being published: `vite build` had copied `AGENTS.md`,
  `CLAUDE.md`, and `README.md` into `dist/`, `dist/models/`, and `dist/wasm/`.
  Deleted those nine files from `public/` (three were tracked, six untracked) and
  moved their rules into the root `AGENTS.md` section "Static files in `public/`".
  Updated the two `src/assets` references. A fresh build now contains **0**
  Markdown files.
- Added `*.tsbuildinfo` to `.gitignore`; `git status --ignored` now reports
  `tsconfig.tsbuildinfo` as ignored. The file itself was left in place.
- Pinned `@mediapipe/tasks-vision` from `^0.10.21` to `0.10.35` in `package.json`
  and the lockfile's root entry; the installed and locked version was already
  0.10.35, so no package changed. `npm ls @mediapipe/tasks-vision` exit **0**.
  All six `public/wasm/` files are byte-identical to the package's `wasm/` folder.
- Documentation made provider-neutral and current per [D-016](DECISIONS.md#d-016-provider-neutral-documentation-first-continuity):
  root `AGENTS.md`, `README.md`, `WORKFLOW.md`, `ARCHITECTURE.md` (new repository
  layout and engine lifecycle sections), `DECISIONS.md`, this file, `HANDOFF.md`,
  the plan's progress checkboxes and README, and the `src/core` and `src/store` READMEs.
- Checks after these changes: `npm test` **94/94**, lint exit **0**, build exit
  **0** (399 modules). A scripted check found **43** Markdown files with **159**
  local links/anchors and **0** broken; **11** authored directories each have
  `AGENTS.md`, a plain-import `CLAUDE.md`, and `README.md`; `public/` has no
  Markdown. `git diff --check` passed. Deferred, not done: wiring `tsconfig.app.json`/`tsconfig.node.json`
  into the build, removing unreferenced template assets (`src/assets/react.svg`,
  `vite.svg`, `hero.png`; `public/favicon.svg`, `icons.svg`), and splitting `src/core/`.

## Engine review and fixes (Task 1 Step 8)

- Reviewer: a fresh-context Claude Code subagent (Opus 5.5), launched from the
  implementing session on 2026-11-03 with no access to that conversation; a
  same-provider review under D-016. Read-only; it ran `npm test` (94/94), lint
  (exit 0), build (exit 0, 399 modules) and 19 throwaway probe tests outside the
  repository (17 passed; the 2 failures were the reviewer's own wrong expectations).
- Verdict: **no significant findings** (nothing Critical, High, or Medium). Five
  Low findings, all evaluated by the implementer (Claude Code, Opus 5.5) and fixed
  after the user confirmed the explanation:
  - L1: custom limits and the `init()` timeout were unvalidated; a `NaN` duration
    limit accepted any length, and `NaN`/`Infinity` budgets fired at once. Fixed:
    `validateLimits` and an `init()` timeout check reject them with `validation`
    before any work or timer starts.
  - L2: `init()` was untested, and its `busy` message ("Another video is already
    being processed.") was wrong while only warm-up ran. Fixed: message now "The
    pose engine is busy with another operation; wait for it to finish."; `init()`
    tests added. Overlapping `init()` calls stay rejected, now documented.
  - L3: docs said `PoseFrame.time` is "never the requested time"; after an exact
    seek it usually equals the target. Reworded in ARCHITECTURE and the code comment.
  - L4: the 100 MiB bound was described as enforced; nothing reads `maxFileBytes`
    yet. Reworded in ARCHITECTURE and `processingLimits.ts`; Task 2 adds the check.
  - L5: MediaPipe 0.10.35 replaces absent coordinates/visibility with 0 (verified
    in `vision_bundle.mjs`), so "missing visibility stays missing" cannot occur with
    the real library and visibility 0 is ambiguous. Documented in ARCHITECTURE; the
    affected tests were already labelled fault-tolerance cases.
- The reviewer also named an undocumented combined case: removing a processing
  clip and choosing another gets `busy` for up to the old job's remaining budget.
  Now in ARCHITECTURE and HANDOFF; Task 2 owns the fix.
- Added 19 regression tests to `PoseEngine.test.ts` (36 -> 55): invalid limits (7),
  back-to-back jobs with a fresh detector and restarted clock, `init()` (5),
  metadata timeout/media-error/invalid-duration without model work (3), a rejected
  runtime load, `close()` during a seek, and the total deadline during a long model
  start. The behavior already existed except L1, so these are not test-first
  results. Mutation check: with `validateLimits` disabled, 4 of the 7 limit cases
  fail; the other 3 are also caught by later checks (metadata bounds, sampling
  rate, `video.ts` timeout validation). The file was restored byte-for-byte.
- Checks after the fixes: `npm test` **113/113**, exit **0**; lint exit **0**;
  build exit **0**, 399 modules, 0 Markdown files in `dist/`.
- Unverified concerns carried into Task 4's real-browser checks (none is shown by mocks):
  - U1: a 60 s clip at 30 samples/s is 1,800 seek+detect cycles; with up to 70 s
    of metadata and model start inside the 300 s total, about 130–166 ms remain per
    cycle. Exact H.264 seeks on the CPU delegate may exceed that, failing the whole
    job. Time a ~60 s 1080p clip on GPU and on forced CPU; revise a budget only
    with that evidence (D-013).
  - U2: right after `seeked` with `readyState >= 2`, some browser/decoder
    combinations expose the previous frame, so landmarks could belong to an earlier
    image. Compare with `requestVideoFrameCallback` or a frame-counter clip.
  - U3: each detector re-runs the MediaPipe loader (new `<script>`, new
    WebAssembly module); `close()` only closes the graph. Run 10+ jobs in Edge and
    watch memory, WebGL-context warnings, and start-up time.
  - U4: repeated reported positions are skipped without trace; a mostly
    unsampled clip still succeeds. Whether to report it is undecided.
  - U5: a duration that shrinks mid-job fails as `validation`/`seek`, which Task 2
    might present as an input-rule message.
  - U6: the first sample does not seek; a browser that stays at metadata-only
    readiness would time out after 10 s. Relevant to the phone prototype.
- Instruction loading: the reviewer observed that its session carried the root
  `AGENTS.md` text from the start of the implementing session, not the later
  on-disk version. Instructions load when a session starts; a new session reads
  the current file.

## Fixture candidate research

Done on 2026-11-03 by Claude Code (Opus 5.5) from Wikimedia Commons pages, its
API, and cover images only. No video was downloaded, converted, or processed.
`ffmpeg` is not installed, so no frames beyond each cover image were inspected;
Commons ignored requests for frames at other times.

| Commons file | License | Facts | Cover-image observation |
| --- | --- | --- | --- |
| `Bench_press_-_exercise_demonstration_video.webm` (FitnessScape; from YouTube "Half Rack Workout") | CC BY 3.0 | 7.1 s, 1280x720, VP9 WebM, no audio, 389,315 bytes, Commons SHA-1 `619a8ca8c5ad851bb6b7d1775f8babefd478e623` | Oblique view from near the foot end, not a side view; large "BENCH PRESS" title overlay. Upper body and bar visible. |
| `Goldenberg_bench_press_world_record_156kg_2020.webm` | CC BY-SA 4.0 | 78.2 s, 1280x720 (over the 60 s limit) | Low oblique view from near the head end; loaders/spotters in frame. |
| `2025_Skelton_Gym_Powerlifting_Competition_(977548).webm` | Public domain | 60.06 s, 1920x1080 (just over the limit) | Interview frame; bench content unknown. |
| `Half_rack_resistance_exercise_workout.webm` (FitnessScape full video) | CC BY 3.0 | 173.5 s, 1280x720 | Title card; content unknown. |

Commons' MP4-family derivative is MPEG-4 Part 2 in QuickTime (`360p.mpeg4.mov`),
not H.264 MP4, so it does not meet the fixture format. Options for the user:
record a short consenting side-view clip kept outside Git through
`GYMBRO_E2E_VIDEO` (recommended; on iPhone choose "Most Compatible" for H.264),
use a stock clip whose license permits this use (kept outside Git unless
redistribution is allowed), and/or install `ffmpeg` to inspect, trim, and convert
candidates.

## Task 2 part 1: selection check (Steps 1–2)

- Implemented by Claude Code (Opus 5.5) on 2026-11-03 after the user approved the
  Task 2 explanation and confirmed starting this part.
- Changed paths: new `src/core/clipPolicy.ts` and `src/core/clipPolicy.test.ts`.
  No store, component, engine, or dependency file changed.
- `validateSelection(files, limits = M1_LIMITS)` returns `null` for exactly one
  non-empty file whose name ends in `.mp4` (any letter case) and whose size is at
  most `maxFileBytes`; otherwise a `SelectionIssue` with code `file-count`,
  `empty`, `format`, or `size`, checked in that order. The MIME type is never a
  reason to accept or reject. An invalid `maxFileBytes` (`NaN`, 0, negative,
  `Infinity`) throws `RangeError`, because `size > NaN` would accept any size; this
  case was added beyond the plan's list after review finding L1. `busy` is reserved
  for the store.
- Test-first: 22 cases ran against a temporary accept-everything placeholder;
  **16 failed** on their assertions and the 6 acceptance cases passed. After the
  implementation: `npm test -- src/core/clipPolicy.test.ts` **22/22**; whole
  `npm test` **135/135**, exit **0**; lint exit **0**; build exit **0**, 399
  modules; `git diff --check` passed.
- Not yet true: neither `ClipDropzone` nor the store calls `validateSelection`, so
  the running app still accepts any `video/*` file of any size. Plan Step 2's "both
  the component and store use this gate" is completed by Steps 4 and 6. Review of
  this code happens with the rest of Task 2 at Step 8.

## Task 2 part 2: store job ownership (Steps 3–5)

- Implemented by Claude Code (Opus 5.5) on 2026-11-03 after the user confirmed
  starting this part.
- Changed paths: rewritten `src/store/useSessionStore.ts`; new
  `src/store/useSessionStore.test.ts`; `src/types/index.ts` (`ClipStatus` gains
  `no-pose`, `Clip` gains optional `errorKind`); `src/core/PoseEngine.ts`
  (`getPoseEngine` singleton removed after confirming no other consumer);
  `src/App.tsx` and `src/components/VideoStage.tsx` (wiring only, below).
- Store design is recorded in [ARCHITECTURE.md](ARCHITECTURE.md#session-ownership).
  Implementer choices for the Step 8 reviewer:
  - A loaded clip in any status blocks admission (`busy`, "Remove the current clip
    before choosing another."); the user removes it to choose again. This follows
    the plan's one-clip rule and Task 4's "admission disabled while loaded".
  - The job object itself is the operation token (identity comparison).
  - `createSessionStore(deps)` is exported so tests get fresh ownership state and
    can supply the video element, URL functions, and (in one test) a fake engine.
    `useSessionStore` is the app's single instance with browser defaults.
  - The hidden decoder keeps the old store's `preload`, `muted`, `playsInline`,
    and `crossOrigin` settings; the legacy `waitForMetadata` is gone.
- Wiring outside the store, kept minimal and marked interim where Step 6 will
  change it: App always uses bench press (the "Choose your lift" step is no longer
  rendered because `setExercise` no longer exists), calls `startClip`, and shows a
  rejected selection's message in a `role="alert"` paragraph. `VideoStage` takes a
  required `retainMedia` prop, leases the URL in an effect, sets the video source
  there instead of through the `src` prop (so a StrictMode remount re-attaches it),
  pauses and detaches on cleanup, and shows a short no-pose message.
- Test-first: the 12 store tests first failed with `createSessionStore is not a
  function` (a missing-API failure, not assertion-level evidence of the old store's
  defects). After implementation: `npm test -- src/store/useSessionStore.test.ts`
  **12/12**; whole `npm test` **147/147**, exit **0**, with no jsdom
  "not implemented" or unhandled-rejection messages; `npm run lint` exit **0**
  after replacing two unused mock parameter names; `npm run build` exit **0**,
  399 modules; `git diff --check` passed.
- Not done: no manual browser check of the rewired app yet (plan Step 7, after
  part 3). `VideoStage`'s lease/source effect has no component test (its tests
  are Task 3). The dropzone still offers an angle selector and accepts any
  `video/*`; the copy still overclaims (part 3).

## Task 2 part 3: bench-only interface (Step 6)

- Implemented by Claude Code (Opus 5.5) on 2026-11-03 after the user confirmed
  starting this part.
- Changed paths: new `src/components/ClipDropzone.test.tsx`; rewritten
  `src/components/ClipDropzone.tsx`; `src/App.tsx`; `src/components/VideoStage.tsx`.
- `ClipDropzone` now takes `onSelect(file): SelectionIssue | null` and `disabled`.
  It runs `validateSelection` on the chosen or dropped files (so a multi-file drop
  is rejected instead of silently using one), hands exactly one file to
  `onSelect`, and shows any rejection, including the store's `busy`, in a
  `role="alert"` named "Video not accepted" through `aria-labelledby`. The camera
  selector is gone; `accept` is `.mp4,video/mp4`. A visible "Choose video" button
  replaces the old click-anywhere label, because the old hidden input could not
  be reached by keyboard. Drops are always `preventDefault`ed so the browser never
  opens a dropped file, even while disabled. The limits text is derived from
  `M1_LIMITS`. framer-motion was dropped from this component.
- App: header subtitle is now the tagline "Your second set of eyes."; the header
  chip says "On-device processing" (narrowed from "100% on-device", since the page
  loads web fonts); the hero describes pose-landmark estimation in sampled frames
  and states that the app does not count reps, track the bar, or judge technique;
  Bench Press and Side view labels; a recording guide (side-on steady camera,
  shoulders/elbows/wrists in frame, bar path in frame for the user's own review,
  one lifter, adequate light, landmarks are estimates and not a form judgment).
  The dropzone is disabled while a clip is loaded or `processingState` is not
  `idle`. The remove button's accessible name says it cancels while processing.
  The legacy `EXERCISES`/`ANGLES` taglines and descriptions are not shown.
- VideoStage: a failure covers the video with a kind-specific title
  (`role="alert"`) and "Remove the clip to try another."; a no-pose result shows a
  non-covering notice (`role="status"`) with recording advice and "not a
  judgment of your form", and playback controls stay enabled so the clip can be
  replayed. The overlay still renders only for `ready`.
- Test-first: the 9 dropzone tests first failed against the old component for
  behavioral reasons (it called the absent `onAdd`, had no labelled drop area,
  rendered three `aria-pressed` angle buttons, and had no picker button). After
  the change: **9/9**; whole `npm test` **156/156**, exit **0**, with no `act`
  warnings or unhandled errors; lint exit **0**; build exit **0**, 399 modules.
- Not done: the App copy and VideoStage changes have no automated tests (component
  tests for VideoStage are Task 3); nothing has been checked in a real browser
  yet (Step 7). Coverage badges still say `fps` and color-grade the rate (Task 3).

## Task 2 Step 7: verification and real-browser check

- Done by Claude Code (Opus 5.5) on 2026-11-03, after committing and pushing Task 2
  Steps 1–6 (`008a088`). Automated: whole `npm test` **156/156**, exit **0**;
  lint exit **0**; build exit **0**, 399 modules.
- Real browser: a Chromium-based browser reporting `Chrome/156` on Windows, driven
  through the Playwright MCP plugin, against `npm run dev -- --host 127.0.0.1
  --port 5177 --strictPort`. Correction found during Step 8: stopping the
  background task ended only the `npm` wrapper; the `vite.js` process kept
  listening on 5177 until it was identified and stopped after the review fixes.
  Observed:
  - The page shows the tagline, Bench Press / Side view, the recording guide, the
    labelled drop area, and a "Choose video" button; no exercise or angle choices.
  - A `.mov` chosen through the button: alert "Video not accepted — Choose an .mp4
    video…"; no clip created.
  - A two-file drop (real `DragEvent` with a `DataTransfer`): alert "Choose only one
    video at a time."; drop default prevented; no clip created.
  - A 4,096-byte random file named `.mp4`: admitted, then the error panel "The video
    could not be read / The browser could not load this video. / Remove the clip to
    try another."; playback controls and "Choose video" disabled.
  - Remove: clip and video gone, dropzone enabled again, and `fetch` of the clip's
    former `blob:` URL failed, confirming revocation. Choosing the junk file again
    was admitted and failed the same way (remove/reselect flow).
  - A synthetic H.264 MP4 recorded in the page with `MediaRecorder`
    (`video/mp4;codecs=avc1.42E01E`, 640x360, 3.002 s, 8,125 bytes, moving shapes,
    no person), delivered by drop: real decoding, the real MediaPipe runtime and
    model on the **GPU** delegate (WebGL 2), 91 retained samples at 30/s, result
    **no-pose** with the notice, no overlay canvas, enabled controls, and real
    playback (reached 0.71 s). MediaPipe logged "Graph finished closing
    successfully" and destroyed its WebGL context after the job, which is evidence
    for review concern U3 that the per-job GPU context is released. Console
    timestamps put detection at about 9 s for 91 samples (roughly 100 ms per sample
    at 640x360 on GPU); one rough observation on one machine, not a benchmark.
  - Network: all 41 requests were `GET` to the dev server or Google Fonts; no
    request carried the video anywhere.
  - Console: only the default `/favicon.ico` 404 (no icon is linked), MediaPipe's
    own info/warning lines, and one error caused by the revocation check itself.
- Found and fixed during the check: `index.html`'s title ("AI Barbell Form
  Analysis") and description (squat/deadlift, multiple angles, "100% private")
  still overclaimed; now "GymBro AI — Your second set of eyes." and an honest
  bench/side-view description. Added `.playwright-mcp/` (the browser tool's output
  folder inside the project) to `.gitignore`.
- Tool notes: the Playwright plugin only uploads files from inside the project, so
  test inputs were copied into the ignored `.playwright-mcp/` folder. An early
  refused upload left stacked file-chooser dialogs that closed the page twice; a
  clean retry and an idle test showed this was the tool, not the app.
- Not verified: any bench-press footage, overlay alignment, landmark quality, the
  CPU delegate, portrait video, phone browsers, or a 60 s clip's timing (U1).

## Task 2 review and fixes (Step 8)

- Reviewer: a fresh-context Claude Code subagent (Opus 5.5), launched from the
  implementing session on 2026-11-03 with no access to its conversation; a
  same-provider review under D-016. Read-only. It ran `npm test` (156/156), lint
  (exit 0), and build (exit 0), and drove eight jobs in a real Chromium browser on
  its own dev server (port 5178, stopped afterwards) with synthetic no-person
  H.264 clips: removal after completion (`cancelling` 321 ms, then `idle`, URL
  revoked), during detection (15 ms), and 22 ms after admission (about 790 ms; the
  orphaned MediaPipe graph closed and destroyed its WebGL context, then the
  replacement completed). Network: only `GET`s; no request carried the video.
  A process commit (`2ca2dac`, documents only) landed during the review.
- Verdict: **no significant findings** (nothing Critical, High, or Medium).
  Findings, all evaluated by the implementer (Claude Code, Opus 5.5) and fixed
  after the user confirmed the explanation:
  - L1: keyboard focus fell to `<body>` when the removed clip's section unmounted.
    Fixed: the remove button moves focus to the "Add your bench press video"
    heading (`tabIndex={-1}`).
  - L2: during release the dropzone said "Remove the current clip" with no clip
    left. Fixed: optional `disabledMessage` prop; App passes "Releasing the
    previous clip…" while `cancelling` with no clips. Tested.
  - L3: file drops outside the drop area were not claimed, so the browser could
    open the file and unload the app. Fixed: while mounted, the dropzone claims
    `dragover`/`drop` events carrying files anywhere on the window; other drags
    are untouched; the listeners are removed on unmount. Tested.
  - L4: `engineDelegate` stayed set after removal and its comment claimed a UI
    consumer. Fixed: `removeClip` clears it; comment corrected. Tested.
  - D1–D3: ARCHITECTURE said removal clears the screen "at once" (the exit
    animation keeps the player and its lease for about 0.3 s, which delays
    admission) and that drops were "always" claimed; HANDOFF still said the app was
    never checked in a browser. All corrected, plus the ARCHITECTURE date line and
    the store README's test description.
- Also changed on the reviewer's observations: removed the unsourced "at about
  bench height" advice; overlay subtitle says "during playback" instead of "synced
  to playback" (unverified until Tasks 3–4); the processing overlay says
  "Preparing…" instead of "Loading model…" while metadata is still read; the store
  creates the engine before the URL and creates the hidden video inside the `try`,
  so an unexpected throw cannot strand a URL or leave the job `processing`.
- Tests added: two dropzone cases (disabled message; page-wide file-drag claim,
  ignoring non-file drags and released on unmount) and store assertions (delegate
  cleared on removal; one `createFromOptions` call per admitted clip). Mutation
  check: removing the page-level `drop` listener fails 1 dropzone test; keeping the
  delegate on removal fails 1 store test; both files were restored byte-for-byte.
- Checks after the fixes: `npm test` **158/158**, exit **0**; lint exit **0**;
  build exit **0**, 399 modules. Real browser (Chromium `Chrome/156`, dev server on
  5177): after "Remove clip" focus moved to the heading, the dropzone read
  "Releasing the previous clip…" 60 ms later and "Drop an MP4 video here" with
  "Choose video" enabled 1.5 s later. That server turned out to be the Step 7
  `vite.js` process still running (see the correction in the Step 7 section); it
  served the current files, and it was stopped afterwards with port 5177 confirmed
  free. A server on 5176 from an earlier session was left running.
- Queued for Task 3 (VideoStage controls, now reachable for no-pose clips): the
  scrubber has no accessible name; speed buttons show the selection by color only
  (no `aria-pressed`); coverage badges say `fps` and color-grade the rate;
  `NoPoseNotice` is inserted already filled, which some screen readers do not
  announce.
- Unverified, carried to Task 4 or the phone prototype: an orphaned model start
  can overlap the replacement's start on slower devices (two WebGL contexts);
  screen-reader announcements; real drops onto the page (synthetic events cannot
  trigger the browser's default action); `cancelling` lasting while a tab is
  hidden. The reviewer once saw two file-chooser dialogs open after an Enter
  press; it did not reproduce under instrumentation and is attributed to the tool
  unless it reproduces manually.

## Task 3 calculation helpers (Steps 1–2)

- Implemented by Codex on 2026-11-03 after the user confirmed the three calculation
  responsibilities. Exact served model identifier was not exposed. Started from
  clean `feat/task3-overlay-playback` at `03185f5` (also the reviewed Tasks 1–2 base).
- Added only `src/components/poseDisplay.ts` and `poseDisplay.test.ts` as production/
  test source. API-only placeholders gave **56 failing tests** before implementation;
  all 56 now pass. No placeholder remains. No dependencies or existing component
  behavior changed. Updated affected instructions, READMEs, architecture, handoff,
  and plan progress.
- Sampling preserves exact missing observations, uses only adjacent detected
  neighbors within two target intervals, and holds endpoints for at most one.
  Output records actual sample time or requested interpolation time, copies point
  objects, and never mutates stored observations. Visibility is interpolated only
  when both endpoint values are known/in range; otherwise it stays unknown.
- Drawing eligibility requires finite image-bound x/y and known visibility at the
  supplied floor. The configured floor remains 0.3 when wired later, a heuristic.
  Centered contain geometry uses CSS pixels, handles letterboxing and fractional
  layout, and leaves DPR scaling to the canvas step.
- A named four-machine-epsilon, timestamp-scaled allowance handles subtraction
  roundoff at timing boundaries; it does not add a sampling interval or bridge
  missing poses. Tests just 1 microsecond beyond the limit still hide the gap.
- Verification: whole `npm test` **214/214**, lint exit **0**, build exit **0**
  (399 modules; existing Browserslist warning); zero Markdown files in `dist`.
  Own dev server on `127.0.0.1:5179` returned HTTP **200** with GymBro AI title
  before implementation, then was stopped; the port was verified free. The older
  `5176` server was not stopped.
- Fresh read-only Codex review: **no significant findings**. Reviewer inspected
  the scoped implementation/spec and independently ran **56/56** helper tests.
  Its model identifier was unavailable; it did not repeat full-suite/lint/build
  checks or browser rendering. No cross-provider review is claimed.
- Task 3 remains incomplete. The new helpers are not yet used by the existing
  overlay/player, so sampling/drawing/playback defects there remain open until
  Steps 3–4. No real-media alignment, bench-press accuracy, or mobile claim follows
  from these pure tests. Commit Steps 1–2 together under D-019; do not merge the
  unfinished feature to `master`.

## Task 3 component tests and wiring (Steps 3–4)

- Implemented by Codex on 2026-11-03 after the user answered the teaching
  checkpoint. Exact served model identifier is unavailable. Source scope is
  `SkeletonOverlay.tsx`, `VideoStage.tsx`, and their two new component test files;
  no dependencies, engine/store behavior, or production debug controls changed.
- Test-first run: **22 tests, 20 failed / 2 passed** against the old components.
  Failures exposed parent-box projection, missing-data carry-forward, continuous
  paused RAF, stale seek/restart/source state, missing control semantics, rejected
  play promises, no-pose live-region replacement, and ambiguous badges. The RED
  run also exposed the old unhandled play rejections; GREEN has none.
- Overlay now calls the tested pure helpers at actual media time. It positions
  its canvas over the video element, projects centered contain content in CSS
  pixels, and applies DPR once to the backing store/transform. Unknown or invalid
  visibility and off-image points are hidden, without changing raw observations.
  Missing samples, large gaps, seeking and not-ready media clear existing marks.
  Media/layout events redraw paused frames; only playback owns a recurring RAF.
  Unmount/effect replacement releases RAF, ResizeObserver, and listeners.
- Player listens to seek completion and real playback events, resets state for a
  replacement source, uses finite browser/processing duration, exposes the seek
  control's name and selected speed, and catches rejected play/restart attempts.
  Request identity and attachment guards prevent late errors from older media.
  Restart updates its time immediately even if play fails. StrictMode tests show
  the source detached and media paused before releasing the store URL lease.
- Task 2's queued controls/badges/live-region issues are addressed: sampling is
  explicitly a target, sampled detection uses neutral text/styling, and an empty
  status region exists before a no-pose result populates it. Actual screen-reader
  announcements remain unverified; no claim is made for initially completed clips.
- Plan adaptation: removal belongs to App, not VideoStage. Component checks cover
  player unmount/lease cleanup instead of adding a fake removal control. Existing
  App removal/focus checks remain historical Task 2 evidence; Task 4 checks them
  again through actual browser controls.
- Verification: focused **22/22**, whole **236/236**, lint exit **0** with no
  warnings, build exit **0**, 400 modules (existing stale Browserslist warning).
  The first full build caught missing `this` annotations in test doubles; those
  were corrected. An effect-cleanup lint warning was resolved by invalidating old
  playback requests on setup and guarding attachment on cleanup.
- Own dev server `127.0.0.1:5179` returned HTTP **200** before feature edits.
  After checks, verified its Vite command/process identity, stopped it, and
  confirmed the port free. Earlier `5176` server left alone. No real browser
  rendering, bench footage, new inference, or phone check was run in this step.
- Fresh whole-Task-3 read-only Codex review returned **no significant findings**.
  Steps 3–4 form one green commit under D-019; record final verification and
  review handoff in their own step commits before merging Task 3.

## Task 3 final verification (Step 5)

- Steps 3–4 are committed and pushed as `62486db`. On that committed source,
  repeated required checks: `npm test` **236/236** in eight files; lint exit **0**,
  no warnings; build exit **0**, 400 modules and the existing Browserslist warning.
  Controlled tests verify RAF/observer/media listener and URL-lease cleanup.
- `git diff --check` passes; build output contains no Markdown. This is a
  verification/documentation step with no further application changes. Fresh
  review handoff is next; actual browser/bench-press acceptance remains Task 4.

## Task 3 fresh review and handoff (Step 6)

- Fresh context, read-only Codex review of the whole Task 3 change against base
  `03185f5`, the current specification (M1-05/M1-06), and the plan. The reviewer
  saw committed helpers plus the then-uncommitted component diff, tests, scoped
  rules, surrounding App controls, and ownership references. No implementation
  conversation was inherited. Its exact served model identifier was unavailable.
- Result: **no significant findings**. The reviewer independently ran helper,
  overlay, and player suites: **78/78** across three files, exit **0**; scoped
  whitespace check passed. It did not repeat full-suite/lint/build, use a browser,
  edit files, or spawn other agents. No second-provider review is claimed.
- No review fix or deferred code finding remains. The coordinator's full checks
  are recorded above. Simulated DOM/canvas tests do not prove actual rendering,
  monitor/DPR transitions, screen-reader announcements, media presentation timing,
  bench-lifter inference, or anatomical accuracy; Task 4 owns that acceptance.
- Updated shared instructions, root/components/planning READMEs, architecture,
  status, compact handoff, and plan progress. Task 3 is complete; D-019 calls for
  pushing this final step and fast-forwarding/pushing `master`, retaining the
  feature branch. Verify Git refs rather than treating an earlier hash as current.
- Next: Task 4 fixture gate after its understanding checkpoint. The user has no
  personal recording; previously inspected public candidates did not meet side
  view. Missing footage blocks real-video acceptance, and must remain explicit.

## Planning handoff

- User authorization: [D-012](DECISIONS.md#d-012-draft-the-first-milestone-implementation-plan).
- Created a four-task plan with exact file boundaries, producer/consumer interfaces, failing-test cycles, failure cases, commands, and a map covering M1-01 through M1-12. Added local guidance to both new authored planning directories.
- Self-reviewed requirement coverage, interface consistency, the five review-focus classes, and plan proportion. This is a planning self-review, not another Goldfish specification verdict or a code review.
- Inspected npm compatibility metadata for the proposed test tools and found an installed Edge executable. No dependencies were installed, browser launched, fixture obtained, or application files changed in this step.
- Runtime tests were not repeated for a documentation-only plan. The preceding lint/build results remain historical baseline evidence, not proof of the proposed features.
- Handoff checks passed: **14** maintained directories have guidance, **23** Markdown files have valid local links/anchors, and the plan has **4** tasks with all **29** steps unchecked. Dependency files and unrelated application source are preserved; no proposed feature file was created. The existing one-line source cleanup remains the last application-code change.
