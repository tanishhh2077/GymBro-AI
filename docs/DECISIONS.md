# Product and development decisions

Updated: 2026-11-02 (America/Chicago).

The [original brief](PRODUCT_BRIEF.md) is preserved as received. The decisions below capture explicit conversation clarifications; they are not inferred from the existing prototype. The user confirmed the revised direction with "clear" on 2026-11-02.

## Accepted direction

### D-001: Narrow the initial supported workflow

- One uploaded side-view barbell back-squat video, one lifter, standardized recording guidance.
- First milestone: real pose estimation and a synchronized landmark overlay, input validation, basic failure handling, run instructions, and practical automated verification.
- Rep detection, phases, movement measurements, evidence-backed findings, saved sessions, and comparison follow incrementally.
- Existing deadlift/bench/multiple-view choices and unvalidated claims are legacy prototype behavior. Their existence does not broaden the approved MVP.

### D-002: Evidence and uncertainty are product requirements

- Findings must be traceable to observations, measurements, and video time. Decline unsupported conclusions.
- No invented metrics, arbitrary numeric form scores, LLM-invented technique feedback, medical claims, or claims of verified 3D biomechanics.
- Pose coverage and model visibility have narrower meanings than accuracy or movement quality.
- This supersedes legacy required score fields and comments that imply view-invariant measured biomechanics. Those types remain unchanged until an approved implementation task revises them. (D-028 removed them on 2026-11-04.)

### D-003: On-device processing for the first milestone

- Reuse the existing browser pipeline as the initial implementation baseline.
- Measure actual behavior on a real phone before adding a video-processing backend.
- A backend remains an option if demonstrated device limitations or another concrete product requirement justify uploads and operational costs.
- The brief's Python/FastAPI/NumPy preference remains relevant for later analysis experiments, evaluation, or services; it does not require a server in milestone one.
- Centralized deployment can control versions; it does not establish measurement validity or eliminate decoder/runtime differences.
- Saved analysis data and raw-video upload are separate decisions. No video upload or retention policy has been approved.

### D-004: Installed mobile app is the intended release direction

- Keep the browser implementation useful for early validation; do not build a second polished public frontend as part of the first milestone.
- Capacitor is the first candidate for a small mobile prototype because it can reuse the React application. Its video, overlay, device-integration, and performance behavior must be tested before treating the approach as production-ready.
- A React Native rewrite is deferred, not ruled out. An installed-app target does not determine processing location.
- No Android/iOS project has been scaffolded. Initial test platform, available devices, distribution tooling, and release requirements remain to be established before mobile implementation.

### D-005: Elephant-Goldfish specification review

- Elephant has broad context and writes a bounded `spec.md`.
- A fresh Goldfish receives the original approved brief, accepted amendments, specification, and relevant read-only repository access. It receives no Elephant conversation or argument defending the design.
- Goldfish assesses fidelity, ambiguity, consistency, and implementability. A specification alone cannot prove fidelity to an unseen request.
- Use this for consequential specifications and architectural changes; routine wording edits do not require another full cycle.
- A favorable review is not scientific validation, implementation approval, or evidence that code works.

### D-006: Independent judgment and implementation review

- Agreement and criticism both need reasons. Treat reviewer feedback and the author's assumptions skeptically and fairly.
- After code implementation, use a fresh critical reviewer with concrete evidence-based findings. No hostility, invented issues, or required finding count.
- Resolve acceptance-blocking findings before completion; record fixes, reasoned disagreements, and verification limits.

### D-007: Teaching and documentation-stage authorization

- Before each meaningful step: explain what, why, and the obvious alternative; ask "Is this clear?" and wait. An explicit task-specific request can authorize a larger step.
- The initial documentation-stage approval covered project documentation, scoped instructions, a proposed first-milestone specification, and its independent review.
- That approval did not authorize implementing milestone one, adding dependencies, moving inference to a server, scaffolding mobile apps, or creating persistence.
- No commit attribution trailers of any kind.

### D-008: Reproducible environment verification

- On 2026-11-02 the user confirmed the next step: verify the declared development environment before feature work.
- Use a temporary clean copy to install the existing locked dependencies and check install/build/lint/dev behavior without replacing the working repository's `node_modules` or altering source.
- Record actual failures and verification limits. A failing check is not permission to expand scope silently; explain the proposed tooling repair at the next understanding checkpoint.
- This step does not authorize new dependencies, feature implementation, a test-framework setup, backend work, or mobile scaffolding.

### D-009: Restore declared lint tooling

- On 2026-11-02 the user confirmed adding the six missing lint tools as development dependencies, updating the lockfile, and checking a clean install, lint, and build.
- Use the maintained ESLint 10 line with compatible JavaScript, TypeScript, React Hooks, React Refresh, and browser-globals packages. The verified Node 20.20.2 baseline meets their engine requirements. This does not establish support for older Node versions.
- Retain existing lint configuration/rules and application code. Report any source findings separately before changing code; do not disable a rule merely to obtain a passing result.
- The repair adds only development tooling. Existing dependency specifications and existing locked package records remain unchanged.
- Tooling support/reference: [ESLint version support](https://eslint.org/version-support/), [Node requirements](https://eslint.org/docs/latest/use/getting-started#prerequisites), and [typescript-eslint compatibility](https://typescript-eslint.io/users/dependency-versions/).

### D-010: Current product identity

- On 2026-11-02 the user changed the app name to **Gym Bro AI** and confirmed applying the rename to app branding, package metadata, and current project instructions.
- The user subsequently corrected the display spacing to **GymBro AI**. Current display name and brand: **GymBro AI**. Technical package name remains `gym-bro-ai`.
- This supersedes the **Spotter AI / spotter.** identity in the original brief. The existing tagline, **Your second set of eyes.**, remains unchanged.
- Preserve the original user-supplied brief and completed review records as historical sources. Read them with this amendment; do not rewrite them to imply the new identity existed earlier.
- The identity change does not alter the supported exercise/view, processing architecture, review process, or pending source lint cleanup.

### D-011: Remove unused detector-result initializer

- On 2026-11-02 the user confirmed the one-line source cleanup and lint/build verification.
- Remove only the unused initial `null` assignment in `src/core/PoseEngine.ts`; retain the declared type, detection call, and existing catch/throw path.
- Keep the lint rule enabled. This cleanup does not authorize broader pose-processing changes or implement the first feature milestone.
- The next stage is the bounded first-milestone implementation plan, with the proposed engineering defaults kept explicit before feature work.

### D-012: Draft the first-milestone implementation plan

- On 2026-11-02 the user confirmed writing a bounded implementation plan before feature code.
- The [plan](superpowers/plans/2026-11-02-video-landmarks.md) proposes four dependent deliverables: bounded extraction, one-clip admission/ownership, honest overlay/playback, and permitted real-video acceptance.
- Test tools, per-job detector ownership, numeric pilot limits, and execution steps remain proposals for review. No test packages, feature files, or fixtures were installed or created by the planning step.
- The existing teaching checkpoints remain in effect. Drafting or reviewing the plan does not silently authorize feature implementation or waive later checkpoints.

### D-013: Execute the reviewed first-milestone plan

- On 2026-11-02 the user said "ok i like this plan, go ahead" after reviewing the plan and pilot limits.
- Execute the bounded video-to-landmarks milestone, including test setup, configurable engineering limits, per-job detector ownership, and fresh task reviews. The subsequent exercise amendment in D-014 takes precedence.
- Initial pilot values are not calibrated scientific thresholds or performance guarantees. Explain and record revisions supported by evidence.
- Approval does not provide a fixture or authorize publishing private footage. Teaching and review requirements remain in effect.

### D-014: First supported exercise is bench press

- The user changed the first exercise to **barbell bench press** before analysis implementation began. This supersedes the back-squat-first scope in D-001 and the original brief; keep those historical sources unchanged.
- The first milestone remains local video decoding, actual human-pose observations, and synchronized playback/overlay. No bench repetition counting, technique verdicts, bar detection/tracking, or bar-path measurements are added.
- Retain a standardized side view as the initial camera assumption. Guide framing toward the lifter's upper body with shoulders, elbows, wrists and the moving bar in frame; do not assume visibility of hidden lower-body landmarks or claim automatic view verification. Bar framing helps human review but does not imply the model tracks the bar.
- Bench/occlusion performance must be established on real footage. Low visibility or missing poses remain explicit; do not invent confidence or anatomical measurements.
- The user has no fixture available. An openly licensed clip may be used with recorded provenance/attribution and appropriate adaptation rights; inspect framing and decoding before treating a candidate as an acceptance fixture.
- The earlier Goldfish review covered the squat specification. Record a fresh bench-revision review separately rather than rewriting that completed review.

### D-015: Portable Claude Code and Codex workflow

- The user wants to use both subscriptions and, after reporting Codex usage limits,
  explicitly requested a repository handoff to continue in Claude Code.
- Maintain shared root/scoped `AGENTS.md` instructions, short adjacent `CLAUDE.md`
  imports, and a purpose-specific README in each maintained project directory.
  Dependencies, Git internals, build output, and generated scratch are excluded.
- Keep a compact current handoff separate from detailed verification history.
  Preserve teaching checkpoints, independent judgment, fresh critical review,
  working-tree changes, and the user's manual commit/push workflow across tools.
- Record the actual assistant used. Cross-tool review is useful when available;
  fresh same-provider review is acceptable when honestly identified. Do not add
  API-key services or spend another provider's allowance implicitly.
- This documentation handoff does not begin the pending engine implementation.
- D-016 supersedes this decision's provider-specific review and role guidance.

### D-016: Provider-neutral, documentation-first continuity

- On 2026-11-02 the user stated that implementation and review will run in
  whichever assistant, Claude Code or Codex, has more unused allowance at the
  time. The relevant question is never which provider suits a task; it is whether
  the Markdown documents let any new agent understand the project unaided.
- Neither provider owns a role. A review is independent because it starts in a
  fresh session with no access to the implementer's conversation. Record the
  actual tool and model that implemented or reviewed each change.
- The Markdown files are the only handoff. After each work chunk, update every
  document whose facts changed (handoff, status, architecture, plan progress,
  affected READMEs and rules) before reporting the chunk done. A new session must
  not need chat history to learn the structure, current state, or next task.
- Teaching checkpoints, the manual Git workflow, and the ban on API-key services
  that bypass usage limits are unchanged.

### D-017: Repository structure fixes

- On 2026-11-02 the user approved three structure fixes after an audit of the
  repository layout:
  1. Vite copies everything in `public/` into the built site, so the guidance
     files there were being published. Their rules moved into a "Static files in
     `public/`" section of root `AGENTS.md`, and `public/` now holds no Markdown.
     This is an exception to the per-directory guidance rule in D-015.
  2. Ignore generated `*.tsbuildinfo` files. The root `tsconfig.json` is the
     configuration `tsc -b` actually builds, and it writes its cache beside itself.
  3. Pin `@mediapipe/tasks-vision` to the exact installed version (0.10.35), so a
     fresh install cannot resolve a JavaScript library that differs from the
     vendored `public/wasm/` runtime.
- Deferred, not approved here: wiring the unused `tsconfig.app.json` and
  `tsconfig.node.json` into the build (a separate configuration task), removing
  unreferenced template assets (with Task 2's scope cleanup), and splitting
  `src/core/` into subfolders (when measurement work begins).

### D-018: Regular commits and reviewed merges to master

- On 2026-11-03 the user asked agents to keep committing and pushing, to practise
  good development, and chose the feature-branch model and grouped first commits.
  This supersedes the earlier rule that only the user commits and pushes.
- After each work chunk whose relevant tests, lint, and build pass and whose
  documents are updated: stage only that chunk's paths, check the staged diff for
  secrets, private media, and personal paths, commit on
  `feat/gymbro-video-landmarks`, and push it. Do not commit a failing state.
- When a plan task is complete and its fresh review is resolved, fast-forward
  `master` to the feature branch and push `master`. `master` therefore holds only
  finished, reviewed tasks whose documents match the code.
- Never force-push or rewrite published history. Never add `Co-Authored-By` or any
  attribution trailer. If a push fails (authentication, network), report it; do
  not change credentials or remote settings.
- The repository's first branch is named `master`; no `main` branch exists. The
  GitHub CLI is not installed, so merges are local fast-forwards rather than pull
  requests unless that changes.
- D-019 refines the branch and commit granularity.

### D-019: One branch per feature, one commit per step

- On 2026-11-03 the user asked that each new feature be built on a new branch,
  every new step be its own commit, and good coding practices be followed.
- A feature is one plan task. Each starts on its own branch named
  `feat/task<N>-<short-name>` (for example `feat/task3-overlay-playback`),
  created from an up-to-date `master` after the previous task was merged. Tasks 1
  and 2 predate this rule and share `feat/gymbro-video-landmarks`; their pushed
  history is not rewritten.
- Each plan step is its own commit, made once its checks pass and its documents are
  updated, and is pushed right away. Exception: a step that only writes failing
  tests is committed together with the step that makes them pass, so that every
  commit builds and passes (any commit can be checked out or bisected safely).
  Fixes for review findings get their own commit.
- Commit subjects are imperative and name the plan task and step, for example
  "Add selection check (plan Task 2 Steps 1-2)"; the body says what changed and
  what was verified.
- When the feature's fresh review is resolved: fast-forward `master` to the branch,
  push `master`, then create the next feature's branch from it. A merged branch is
  deleted only with the user's agreement.
- On 2026-11-03 `master` was pushed to GitHub for the first time, still at the
  scaffold commit. GitHub's default branch is still the feature branch; the user
  changes it under Settings > General > Default branch once `master` holds the
  reviewed work, because no GitHub CLI or token is available to agents. The user
  made that switch on 2026-11-05; the default branch is now `master`.

### D-020: Continue independent work when a prerequisite is blocked

- On 2026-11-03 the user requested continuing other tasks when a dead end occurs.
- Task 4's implementation and detailed verification live on
  `feat/task4-browser-acceptance` at `34538e4`: ten browser checks and 254 total
  unit/component/fixture cases pass there; full bench acceptance is still open.
- That branch is not merged into this Task 5 branch or `master`. Those tools and
  test counts must not be claimed as present in another checkout automatically.

### D-021: Begin bounded post-pipeline work before bench acceptance

- On 2026-11-03 the user explicitly requested "do some more tasks that would
  come after the bench press video thing, dont stop at this blocker."
- This authorizes proceeding with a bounded later-feature batch, explaining
  choices as work progresses, without treating the missing recording as a stop
  for all product development. It does not establish milestone-one acceptance.
- Builder choice: estimated left/right image-space elbow angles and a video-linked
  evidence timeline, from the brief's measurement/transparency requirements.
  See the [design](superpowers/specs/2026-11-03-elbow-timeline-design.md) and
  [Task 5 plan](superpowers/plans/2026-11-03-elbow-timeline.md). The user did not
  prescribe the algorithm or threshold. Keep these choices explicit and testable.
- This narrowly supersedes earlier sequencing guidance to validate real bench
  extraction before any measurement implementation. Preserve the real-media
  accuracy/identity/synchronization gate before claiming validated bench results.
  No automatic reps, technique verdicts, storage/backend, or mobile scaffold is
  included in this batch. Use the ordinary teaching checkpoint for later scope.

### D-022: Build both mobile prototypes, prioritizing iPhone

- The user requested "ok then build the mobile app" and clarified both platforms,
  first preference iPhone, with no MacBook available. This authorizes native
  prototype implementation, superseding earlier mobile deferrals for this batch.
- Builder choice: reuse the current React app via Capacitor 8.6.0; target
  `com.gymbroai.app`. Node 22.23.2 is already installed and will be selected only
  within task processes, keeping the user's global Node selection unchanged.
- Use local assets/processing and no backend. Native iOS builds require macOS;
  prepare/use standard GitHub public-repo build runners without signing or store
  publication. A simulator app is not an installable/signed iPhone app.
- Apple signing/enrollment and real iPhone/Android media verification remain
  separate requirements; no paid account/service or automatic release is allowed.
- [Design](superpowers/specs/2026-11-03-mobile-prototype-design.md) and
  [plan](superpowers/plans/2026-11-03-mobile-prototype.md) bound this batch.
- The user subsequently confirmed the packaging explanation was clear. Preserve
  their latest explicit understanding checkpoint between meaningful steps;
  environment/plan verification does not automatically approve Step 2 execution.
- The user approved Step 2 with "ok cool" and answered "clear" to the explicit
  Step 3 explanation, then "clear" to Step 4's cloud-build explanation. On
  2026-11-04 the user answered "clear" to Step 5's whole-feature review and
  reviewed merge explanation, authorizing that bounded step under D-019.
- Step 4's run3 verifies native compilation and visible iPhone-simulator startup.
  Xcode's ARM64 linker generates an ad-hoc signature despite disabled Xcode
  signing; no Apple team/identity/provisioning is used. This does not authorize
  signed physical-iPhone installation, store delivery or unverified device claims.

### D-023: Plan phone/video acceptance with the available iPhone

- On 2026-11-04 the user answered "clear" to planning installation prerequisites
  and video import/processing/cancellation checks before store-release work.
  This authorizes the planning document, not execution of its future commands.
- The user reports an **iPhone 12 Pro Max**, no Android phone access and no Apple
  Developer Program membership. iOS version was not supplied. Earlier no-MacBook
  constraint remains; temporary Mac access is unconfirmed.
- Builder proposal: first verify the shared pipeline in Safari from a Windows
  private-LAN preview, using already-owned synthetic non-human fixtures. This
  costs no enrollment and can expose real phone decoding/inference issues, but
  cannot pass native lifecycle, packaging or fresh offline-launch acceptance.
  The intended product remains an installed app.
- The [phone test plan](superpowers/plans/2026-11-04-phone-video-acceptance.md)
  keeps Safari, installed-native and real-bench gates separate. Its first
  execution step retains the next teaching checkpoint. No fixture export,
  server listener, phone install, paid enrollment/service, signing credentials
  or release action is approved by this planning checkpoint.
- Known first-party synthetic fixtures can later be exported by exact checksum
  from Task4's commit without merging its incomplete branch. These assets do
  not replace the still-missing permitted bench footage; do not ask the user to
  record again. Physical Android acceptance remains blocked on device access.

### D-024: Explain and proceed without routine "Is this clear?" checkpoints

- On 2026-11-04, after confirming Task 8's Safari-preparation explanation, the
  user said: "everything is clear, you dont need to ask me everytime if it is
  clear. just build". This supersedes the routine stop-and-wait checkpoint in
  D-007 and root `AGENTS.md`.
- Agents still explain each meaningful step briefly (what, why, why not the
  obvious alternative) at first/second-year CS level, then proceed without asking
  "Is this clear?".
- Still stop for the user when: a material decision or missing requirement is
  theirs to make; an action needs the user's phone, accounts, or devices; or a
  step would spend money, publish, upload human media, or change firewall, VPN,
  router, or repository settings. Those limits are unchanged.
- Task 8 (the phone plan's free Safari slice) is the first task run this way.

### D-025: Continue PC development with an observed-elbow summary

- On 2026-11-04 the user requested "Let’s do the pc side dev" while the phone
  session was deferred until they returned home. D-024's "just build" instruction
  continues to waive routine approval stops, not actual device/settings decisions.
- Builder-selected next feature: summarize measurable elbow samples and lowest/
  highest observed 2D angles with links to their evidence timestamps. This reuses
  Task5's angle measurements and its explicit ordering exception under D-021.
  The user delegated PC work; they did not prescribe this algorithm or UI.
- No reps, phases, per-rep ROM, confidence/technique scores, smoothing, new model,
  backend, storage or dependencies. Bench accuracy and native/phone acceptance
  remain open; summary extremes may reflect tracking errors.
- Task9 uses its own branch from reviewed master26a831f. Preserve Task8 at
  `feat/task8-safari-phone-test` (`7198ec1`) and Task4 at `34538e4`; do not merge
  either unfinished task to obtain tooling. Carry only accepted D-024 guidance
  and accurate continuity records into this branch.
- See the [design](superpowers/specs/2026-11-04-elbow-summary-design.md) and
  [plan](superpowers/plans/2026-11-04-elbow-summary.md). Existing single-writer
  checkout/feature branches are retained; a fresh reviewer is read-only.

### D-026: Show the observed processing time for a completed clip

- On 2026-11-04 the user, away from the PC, asked the builder to "Find other
  tasks to do for the next few hours" while the phone session waits. D-024 still
  applies. The user delegated the choice; they did not prescribe this feature.
- Builder-selected Task 10: measure the time from clip admission to a completed
  result (pose found or no pose, including model start-up) with a monotonic
  clock, keep it on the
  clip, and show it as one neutral badge. Reason: phone Safari has no developer
  console without a Mac, the phone plan asks for elapsed time "if observed", and
  mobile performance is listed as unverified. An on-screen observation replaces
  a hand-held stopwatch.
- The value is a single-run observation on one device, not a benchmark, speed
  rating or performance claim. Background suspension, thermal limits and other
  apps can change it; whether the clock counts during iOS suspension is
  unverified. Failed and cancelled jobs record no time; an invalid or throwing
  clock reading leaves the value absent rather than showing zero.
- No engine, limit, model, dependency, storage or native change. Task 10 uses its
  own branch from reviewed master `3209025`. Task 8 (`feat/task8-safari-phone-test`)
  and Task 4 (`34538e4`) stay open and unmerged. Task 8 merges the reviewed
  result if it is ready; Task 10 never delays the phone session, which otherwise
  runs on the current Task 8 build without the badge.
- See the [design](superpowers/specs/2026-11-04-processing-time-design.md) and
  [plan](superpowers/plans/2026-11-04-processing-time.md).

### D-027: Type-check the build configuration files

- On 2026-11-04 the user, still away, asked the builder to "keep working, don't
  ask me too much, just do the stuff that you can to achieve completion of the
  project". The builder selected Task 11: the configuration task D-017 deferred.
- Measured before the change: `npm run build` checks `src/` (root `tsconfig.json`)
  and `capacitor.config.ts` (`tsconfig.mobile.json`), but nothing checks
  `vite.config.ts` or `vitest.config.ts`. Both already pass when checked by hand,
  so this adds protection against future errors and fixes no current defect.
- `tsconfig.node.json` will include both files, and the build will run it.
- `tsconfig.app.json` is an unreferenced Vite-template file. Its settings fail
  on the real source (it cannot resolve the `@/` import alias and omits strict
  mode), so wiring it in would either break the build or check `src/` more
  weakly than `tsconfig.json` already does. Task 11 deletes it; Git history keeps it.
- No application source, dependency, Vite/Vitest behavior or native change.
  Task 8 and Task 4 stay open and unmerged. The other D-017 deferrals (template
  assets, `src/core/` subfolders) stay deferred.
- See the [plan](superpowers/plans/2026-11-04-config-typecheck.md).

### D-028: Remove unrendered legacy code and template assets

- On 2026-11-04, under the same request as D-027 ("just do the stuff that you
  can to achieve completion of the project"), the builder selected Task 12: the
  scope cleanup D-001, D-002 and D-017 left for an approved task.
- Delete files nothing imports or links: `src/components/ExercisePicker.tsx`,
  `src/App.css`, the Vite template images in `src/assets/` (`hero.png`,
  `react.svg`, `vite.svg`) and the template SVGs in `public/` (`favicon.svg`, a
  Vite logo, and `icons.svg`, social-media icons). Vite copied the two public
  SVGs into every build and both native copies although no page used them.
- Remove the unused analysis types (`Rep`, `FormFlag`, `ClipAnalysis`,
  `SessionReport`, `ExerciseAnalyzer` and their helpers), which carry the
  arbitrary `score`/`overallScore` fields and view-invariant comments D-002
  supersedes. Narrow `Exercise` to `"bench"`, `CameraAngle` to `"side"` and
  `ClipSource` to `"upload"`, the only values the app produces, and keep only the
  bench/side names and accent in `src/core/exercises.ts`; the squat/deadlift and
  front/45° entries and every tagline/focus/description claim measurements the
  app does not make. Future analysis contracts get their own design.
- The rendered interface, store behavior, model/runtime, dependencies and native
  configuration do not change; existing tests that render the names and accent
  must keep passing. Git history keeps every deleted file. The app still has no
  favicon (the browser's `favicon.ico` request returns 404); adding a GymBro icon
  is a separate visible change.
- See the [plan](superpowers/plans/2026-11-04-legacy-cleanup.md).

### D-029: Reproducible non-human browser checks

- On 2026-11-04 the user asked Codex to audit Claude's changes and continue PC
  work while hotspot access and a video wait. They approved the explanation of
  automated browser checks, then said "Clear just start working". Proceed with
  routine implementation; retain D-024's device/account/settings boundaries.
- The builder selects Task 13: maintained Playwright/Chromium checks of actual
  decoding, no-person inference, input failures, playback and cleanup. Port
  selected synthetic assets/tests from `34538e4`, not the incomplete Task 4
  branch or human-fixture tooling. Pin development runner 1.64.1, verify fixed
  pattern hashes and add standard hosted checks without captures/uploads.
- No product/runtime feature change or bench/native acceptance claim. The user
  now expects to supply a video later, superseding the earlier availability
  constraint; permission, encoding, framing and useful lifter landmarks still
  need verification when it arrives. Do not request it again now.
- See the [design](superpowers/specs/2026-11-04-browser-smoke-design.md) and
  [plan](superpowers/plans/2026-11-04-browser-smoke.md). Exact harness choices
  are builder decisions within that scope, not user-prescribed architecture.

### D-030: Begin personal workout tracking from the accepted Q&A

- On 2026-11-04 the user answered Q1-Q7 as recorded in
  [PRODUCT_DIRECTION](PRODUCT_DIRECTION.md): tracking and AI equally central,
  mixed experience levels, set-linked/standalone analysis, combined Home actions
  and dashboard, full personal tracking with community deferred, bench-only AI
  at first release, and post-video analysis now with live analysis a future goal.
- They then explicitly said "start building for now and ask me questions in an
  hour". This authorizes bounded workout-tracking development while the remaining
  questions wait; routine implementation proceeds without new checkpoints.
- Builder selects Task 14: manual rep/weight workout logging, local resume/history
  and the combined Home alongside the existing standalone bench workflow. This
  narrowly supersedes earlier generic-fitness/persistence deferrals for workout
  records only. No AI/media persistence, backend/account/cloud service, social,
  new AI lift, live analysis or validated form claim is authorized by this slice.
- IndexedDB/versioned records, explicit per-workout lb/kg, initial lb, engineering
  bounds and provisional existing visual tokens/navigation are builder choices.
  Future unit preference, capture/retention, routines, timers, charts/PR definitions,
  account/sync and final design remain Q&A topics. The complete wish list is not
  a claim of present implementation.
- Follow the [design](superpowers/specs/2026-11-04-workout-logging-design.md) and
  [plan](superpowers/plans/2026-11-04-workout-logging.md). Task 8 and bench M1 stay
  open; actual phone/network/settings/media actions remain coordinated.

### D-031: Guest use with optional accounts for backup and syncing

- In the resumed Q&A the user answered Q8 "A", selecting guest logging with
  optional account sync, then confirmed "Clear" after the explanation. Sign-up
  must not block a first workout; users may choose an account for backup and
  syncing later.
- This accepts a product direction, not a claim of working accounts or sync.
  The current app still stores workout records locally with no account or
  server transfer. What sync includes, guest-data migration, conflicts,
  authentication and the service design still need explicit definitions.
- No cloud provider, paid service, account/settings action, or human-media upload
  is authorized by this answer. Existing media/privacy boundaries remain.
  Continue the product Q&A at Q9 before selecting a bounded implementation.

### D-032: Sync workout records without uploading videos

- User answered Q9 "A" (workout records only, no video uploads), then confirmed
  "Clear bro now work" after the explanation. Future optional account backup/sync
  from D-031 must exclude video files. Local video handling/retention and any
  future sync of derived analysis require separate definitions, not an inference
  from "workout records". Accounts/sync are still unimplemented.

### D-033: Continue tracking development with a manual rest timer

- After Q9 the user said "Clear bro now work". Together with Q5's accepted timer
  wishlist and prior build authorization, this directs continued development;
  resume questions at Q10 later, without routine understanding stops.
- Builder selects Task15: a manual rest timer tied to the active workout, with
  start/pause/resume/reset and preset durations. It survives screen navigation,
  resets on reload/restart and when its workout finishes/discards, and displays
  completion in-app. This limitation is explicit, not a native alarm guarantee.
- Default90 seconds and presets30/60/90/120/180/300 are builder choices, not rest
  recommendations. No persistence schema, external service, automatic set trigger,
  sound, notification permission, phone/settings action or AI behavior changes.
- See the [design](superpowers/specs/2026-11-04-rest-timer-design.md) and
  [plan](superpowers/plans/2026-11-04-rest-timer.md). Phone/bench acceptance remains
  open; Task8 and Task4 stay separate and unmerged.

### D-034: Saved workout routines with fresh actual-set logging

- The builder proposed: create/edit/delete routines, save exercise order and
  optional set/rep targets, and start a fresh workout from a routine with only
  sets actually logged counted as complete. The user replied "Yes create all of
  that". This explicitly authorizes those routine features. Charts/personal
  bests were proposed as following this slice; they are not implemented here.
- Builder selects Task16: local routines in the validated workout library,
  immutable target snapshots on starting a new workout, explicit per-routine
  lb/kg and independently optional integer targets. No automatic set completion,
  copied historical loads, account/cloud/native/media or AI-scope changes.
- Schema2 normalization accepts strict legacy records without writing on load;
  preserving existing data, size limits and atomic revision protection is required.
  Optional root routines and target bounds are builder choices in the separate
  [design](superpowers/specs/2026-11-05-saved-routines-design.md) and
  [plan](superpowers/plans/2026-11-05-saved-routines.md).
- User approval of the concrete feature and prior "Clear bro now work" direct
  implementation without routine understanding stops. Real device/media/account
  settings remain coordinated; Task8/Task4 and physical-bench acceptance stay open.

### D-035: Bench analysis should work from any camera view (direction, not built)

- On 2026-11-05 the user said the bench analysis must not be limited to a side
  view: a top view, side view, diagonal top view or other angle may be given, and
  the model should judge the lift in that view's own frame of reference and point
  out what is being done wrong. The user agreed that a video stays at most one
  minute long (the existing 60-second limit).
- This changes the direction set by D-001/D-014 (one standardized side view). It
  is accepted as the product goal, but nothing is implemented: the current app,
  its guidance and the phone test plan still describe the side view until a
  separately approved design changes them.
- Constraints that still apply (D-002): a form finding must name the view it came
  from, its supporting measurements, timestamps and uncertainty, and the app must
  abstain when the view is unclear or a measurement cannot be seen from it. The
  pose model gives 2D image positions; what each view can and cannot show (a top
  view hides elbow and bar heights, for example) must be defined and validated
  with permitted footage per view before any finding is shown. No unvalidated
  coach-grade, medical or perfect-form claim.
- The user's own videos stay outside the repository folder (not merely
  git-ignored), because the development server can serve any file under the
  project folder, and during a phone test that server listens on the network.

### D-036: Lean documentation updates

- On 2026-11-05 the user said too much effort went into Markdown changes after
  every prompt and asked to speed up feature work. Documents are updated once per
  task (or at a tool handover), not after each request; answers and small chat
  actions change no files. HANDOFF stays current and short; STATUS gets one brief
  entry per task. Decisions, privacy rules, tests and reviews are unchanged. This
  supersedes the wording that every work chunk updates every affected document.
- On 2026-11-05 the user explicitly requested faster delivery of the functioning
  app and less premature security/process work. The root Development pace rules
  now extend this decision. Ordinary work uses a chat outline and self-review,
  with focused checks during implementation and full tests/lint/build at feature
  completion. Fresh independent review is reserved for data format/storage changes, import,
  account/network, media and analysis changes. Separate design/review files and
  speculative hardening require a concrete need. This supersedes the earlier
  sentence preserving all review/check cadence requirements. Core data safety,
  local-video privacy and evidence requirements continue to apply.

### D-037 Workout progress follows saved routines

- After the handoff and discussion of the pending manual browser rerun, the user
  said "ok keep building the next things". This directs further development
  from the accepted Q5 charts/personal-bests roadmap while the rerun is pending.
- Builder selects Task17, a Progress screen derived from saved completed workouts
  with source-linked records and a per-workout heaviest-load chart.
- Builder choices are exact stored exercise-name/unit groups, heaviest-set and
  most-reps summaries, rep records at each logged load, deterministic ties,
  evenly spaced workouts in finish order and 20-row table pagination.
- Recorded values provide the metrics. Existing local storage supplies the
  validated history. D-035 retains its own design/per-view validation requirements.
- The old file-chooser incident follows the user's repeat-failure condition.
  Any supported repeat receives a reproducing test before a fix.
- Follow the [design](superpowers/specs/2026-11-05-workout-progress-design.md) and
  [plan](superpowers/plans/2026-11-05-workout-progress.md). Phone actions require
  the user's presence and private recordings are kept outside the repository.

### D-038 Local workout backup and restore

- The user chose the recommended workout/routine export/import feature with
  "start with recommended". Task18 implements manual JSON backup and restore.
- Builder choices are a version 1 envelope, 4 MiB file cap, ID-based additive
  merges, conflict rejection and revision-bound preview confirmation. Existing
  validation, count/size limits and atomic destination revisions govern writes.
- Native export uses pinned Filesystem/Share plugins and the system share sheet.
  Successful export cache files stay available for asynchronous recipient reads,
  managed by the OS. Manual workout records alone cross the backup boundary.
- Physical picker/share behavior and phone performance require the user-present
  session. Follow the [design](superpowers/specs/2026-11-05-workout-backup-design.md)
  and [plan](superpowers/plans/2026-11-05-workout-backup.md).

### D-039 Set-linked bench-press video analysis

- On 2026-11-05 the user asked for Task19: open analysis from a logged
  bench-press set, process the video with the existing local pipeline and return
  to that set, alongside standalone analysis, defining bench-set identification,
  reload, deleted sets and wrong-link protection first.
- Builder choices: an exact list of flat barbell bench names, a link of three
  IDs fixed at admission, and session-only links with no workout-schema change;
  nothing about analysis is saved, backed up or uploaded.
- In-session set-linked analysis replaces the "set-linked analysis remains
  future" statements in ARCHITECTURE, PRODUCT_DIRECTION and HANDOFF (updated at
  task end). Saving analysis results with a set remains future work needing its
  own decision. See the [design](superpowers/specs/2026-11-05-set-linked-analysis-design.md)
  and [plan](superpowers/plans/2026-11-05-set-linked-analysis.md).

### D-040 Faster everyday workout logging

- On 2026-11-05 the user selected Q10–Q13 A, then said "start" for previous-set
  values, faster set entry and optional automatic rest timers. Task21 implements
  this workout-convenience slice using existing records and save methods.
- Builder choices use the latest completed workout at or before today's workout
  start, exact exercise names/units, stable ID ties and the first logged matching
  exercise block. Copying previous values fills editable fields. Repeat last set
  logs a fresh set with the latest actual values and retains any typed draft.
- Auto-rest starts off per workout, uses the selected timer duration and restarts
  only after a new manual/repeated set saves. Edits, removals and reloads do not
  trigger it. Timer/option state ends on reload or a new workout. This supersedes
  D-033's manual-only boundary. Q11 theme controls and Q12 catalog remain planned.

### D-041 Searchable exercise library

- Q12 A selects built-in exercise search plus custom entries. The user then
  directed continued implementation. Task22 adds a shared picker to workout and
  routine editors, with 57 bundled rep-based exercise names and search by name,
  equipment, muscle group and common aliases.
- Builder choices derive reusable custom names from existing active/history/
  routine records, preserving exact spelling and case. A name stays available
  while a saved record contains it. Selecting a suggestion fills the name field;
  the existing Add/Save action confirms it. Results expand eight at a time.

### D-042 System appearance and manual override

- Q11 A and the user's continued-development instruction authorize Task23's
  System/Light/Dark choice on Home. System follows live device changes. Shared
  color tokens cover tracking, pickers, charts and video controls.
- Builder choices persist one raw enum string under `gymbro-ai:appearance` in
  device localStorage. Unknown values resolve to System without writing on read.
  A failed read/write uses an honest session-only notice and an operable theme.
  Preference ownership is independent of workout records, backup and media.

### D-043 Integrate on-demand analysis loading

- Under the user's continuing-development instruction, Task24 integrates the
  committed Task20 runtime work from 8b336f4 with Tasks21–23. The original Task20
  branch/worktree retains its implementation history.
- App loads the analysis screen when Analyze opens, with loading status and
  reload recovery. PoseEngine loads MediaPipe inside bounded initialization,
  checks abandonment before acquiring the runtime and reports typed init errors.
- The entry chunk changes from 519.13 to 245.39 kB. Production request checks
  confirm staged local loading and cancellation recovery. Phone startup timing
  still belongs to the user-present test.

### D-044 Optional Supabase accounts and manual workout sync

- On 2026-11-06 the user authorized building accounts/sync and selected Supabase
  with email codes. This implements Q8/Q9's optional workout-record service.
- Builder choices are explicit Preview/Confirm sync, separate guest/account
  IndexedDB libraries and explicit additive guest copying. A three-way merge
  propagates independent edits/deletes and asks for a choice on concurrent record
  changes. Different active workouts require finishing one before sync.
- The server restricts reads by authenticated user ID and writes through a
  validated revision-checked RPC. The client pins requests to that identity's
  token and commits merged local records and shared baseline atomically.
- Cloud project/email configuration belongs to the user. Task25 supplies client,
  SQL migration, setup instructions and local tests. Hosted service and physical
  iPhone verification remain pending. Automatic sync and account deletion are
  follow-on work. See the [Task25 plan](superpowers/plans/2026-11-06-account-sync.md).

## Specification-author defaults and later acceptance

The numeric input bounds, timeouts, and sampling/display tolerances in [spec.md](../spec.md) were specification-author proposals, accepted as initial configurable guardrails with D-013. They remain engineering choices, not performance measurements or validated confidence thresholds.

## Open prerequisites

- A real side-view bench-press fixture with permission/license and privacy handling is needed before real-video acceptance can be demonstrated.
- The available first phone is recorded in D-023; its OS and actual Safari/native
  acceptance remain to be established. A broader supported-device matrix is unverified.
- Exact measurement definitions, quality thresholds, evaluation references, and dataset methodology belong to later bounded specifications.
- D-044 authorizes the bounded Supabase accounts/sync implementation. Cloud
  project configuration, email delivery and real device testing remain open.
  Backend video processing, video retention, database deployment, custom
  training and multi-camera work remain unapproved future work.
