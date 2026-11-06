# GymBro AI: project instructions

## Start here

- Start with this file and the compact [current handoff](docs/HANDOFF.md). Read applicable ancestor/local `AGENTS.md`, local README, and relevant sections of the sources below before code changes. Load detailed historical evidence only when needed; do not repeatedly ingest every document. Do not assume nested guidance was automatically loaded.
- [Original product brief](docs/PRODUCT_BRIEF.md) preserves the user's supplied requirements unchanged.
- [Accepted decisions](docs/DECISIONS.md) records later clarifications and identifies proposals separately.
- [Current status and next task](docs/STATUS.md) describes observed implementation and verification limits.
- [Architecture](docs/ARCHITECTURE.md) distinguishes existing behavior from intended boundaries.
- [Workflow and reusable review prompts](docs/WORKFLOW.md) defines Elephant, Goldfish, and implementation review.
- [Current milestone specification](spec.md) is a reviewable design, not permission to implement it.
- [Implementation plan](docs/superpowers/plans/2026-11-02-video-landmarks.md) defines the approved execution boundaries and initial guardrails. [D-014](docs/DECISIONS.md#d-014-first-supported-exercise-is-bench-press) changes the initial exercise to bench press.

## Work with the user

- Teach at a first- or second-year CS level. Define unfamiliar terms, use concrete scenarios, and show why an obvious alternative can fail.
- Before each meaningful step, briefly explain what it does, why it exists, and why this approach rather than the obvious alternative, then proceed. Do not ask "Is this clear?" routinely ([D-024](docs/DECISIONS.md#d-024-explain-and-proceed-without-routine-is-this-clear-checkpoints)). Stop for the user only for decisions that are theirs, actions on their phone/accounts/devices, spending, publishing or uploading human media, and firewall/VPN/router/repository settings changes.
- An understanding checkpoint is not a request to choose build options. Ask separate clarification questions only when a material requirement is missing.
- Get a working development environment running before feature code. Treat an existing `node_modules` folder or an old build result as insufficient evidence of a reproducible setup.
- Preserve unrelated and preexisting uncommitted work. Report failures, skipped checks, and mistaken assumptions plainly.
- Git practice ([D-018](docs/DECISIONS.md#d-018-regular-commits-and-reviewed-merges-to-master), [D-019](docs/DECISIONS.md#d-019-one-branch-per-feature-one-commit-per-step)):
  - Build each feature (plan task) on its own branch, `feat/task<N>-<short-name>`, created from an up-to-date `master`.
  - Make each plan step its own commit once its checks pass and its documents are updated, and push it. A step that only writes failing tests is committed together with the step that makes them pass, so every commit builds and passes. Review fixes get their own commit.
  - Stage only the step's paths; check the staged diff for secrets, private media, and personal paths. Write an imperative subject naming the task and step, and a body saying what changed and what was verified.
  - When the feature's fresh review is resolved, fast-forward `master` to the branch, push `master`, and start the next feature's branch from it. Delete a merged branch only with the user's agreement.
  - Never commit a failing state, force-push, or rewrite published history; if a push fails, report it rather than changing credentials.
- Never add `Co-Authored-By` lines or attribution trailers of any kind to commits.

## Product boundaries

- Product and brand: **GymBro AI**. Package: `gym-bro-ai`. Tagline: **Your second set of eyes.** The original brief retains its historical name; [D-010](docs/DECISIONS.md#d-010-current-product-identity) supersedes that identity.
- Initial scope: one uploaded video of a lifter performing barbell bench press from a standardized side view. The original squat-first brief is superseded by D-014.
- The first milestone is real video -> timestamped estimated landmarks -> synchronized playback/overlay, with bounded input handling, failures, and practical verification. It does not include repetition analysis or saved workouts.
- Keep raw observations, derived measurements, and interpretations distinct. A finding must carry its supporting measurements, timestamps, uncertainty, and unavailable/abstention reason where applicable.
- Do not invent analysis, benchmark results, form scores, or confidence. Model visibility is not a calibrated probability of biomechanical correctness. Inferred world coordinates are not measured ground-truth 3D biomechanics.
- Avoid medical, injury-prevention, perfect-form, and unvalidated coach-grade claims. Do not use an LLM to invent movement findings.
- Do not expand into other exercises, camera views, multi-camera fusion, or generic fitness features during the initial milestone.
- Start with on-device processing. Mobile is the intended release direction; a Capacitor prototype is a candidate to test, not a verified deployment. No server video transfer, mobile scaffold, or database is approved by these documents alone.
- D-021 authorizes Task 5's bounded follow-on measurement/timeline work despite
  unfinished Task 4 acceptance. Read its separate design/plan; do not treat it as
  a validated bench assessment or declare milestone one complete.
- D-022 explicitly authorizes iOS/Android mobile prototypes, iPhone first, despite
  the earlier scaffold deferral. Follow the mobile design/plan; no paid service,
  signing-secret request, store release or claim of device validation is implied.
- D-025 selects Task9's PC-side observed-elbow summary while phone work waits.
  Use its separate design/plan. Sample availability and 2D extremes do not establish
  confidence, per-rep ROM or validated bench technique.
- D-026 selects Task10's observed processing-time badge. One run's measured time
  is not a benchmark, rating or phone-performance validation.
- D-030 now authorizes a bounded manual workout log, local IndexedDB persistence
  of workout records, and Home navigation alongside the existing bench workflow.
  Read PRODUCT_DIRECTION and its separate Task 14 design/plan. Earlier generic
  fitness/persistence deferrals are superseded only for that slice. Do not persist
  media/pose data or infer new analysis capabilities from logging exercise names.

## Independent judgment

- D-039 links a video analysis to a logged bench-press set for the session only.
  Follow Task19's three-ID link, permanent detach and no-persistence rules.

- D-038 authorizes manual JSON backup/restore of validated workout records and
  routines. Follow Task18's additive/conflict rules, revision-bound previews,
  bounded file reads and browser/native export ownership.

- D-037 adds derived workout progress and personal records from completed actual
  sets. Follow Task17's exact name/unit groups, source-linked metric definitions,
  chronological workout order and deletion/reload behavior.

- D-034 explicitly authorizes saved routine CRUD, exercise order/optional set-rep
  targets and starting fresh empty-set workouts. Follow the Task16 design/plan:
  preserve strict legacy data, atomic revisions and target/actual separation.

- D-031/D-032 select guest access with optional workout-record sync only; videos
  must not be uploaded. This remains a future product direction, not a service.
- D-033 authorizes Task15's manual session-only rest timer. Read its design/plan;
  keep timer state independent of saved workout/media data and state reload and
  in-app-completion limits honestly. Continue routine work after "Clear bro now work".

- Accuracy matters more than agreement. Evaluate the user's idea and your own earlier idea by the same evidential standard.
- Explain concrete failure cases and meaningful tradeoffs. Offer a better approach when one is justified; do not praise, agree, disagree, or criticize without a reason.
- Separate observations, assumptions, proposals, and accepted decisions. Admit uncertainty and change your conclusion when stronger evidence warrants it.
- Do not silently turn a preferred technology, an old placeholder, or a reviewer suggestion into a requirement.

## Context and delegation

- `AGENTS.md` is the shared instruction source for Codex and Claude Code. Adjacent `CLAUDE.md` files import it with `@AGENTS.md`; edit shared rules here rather than maintaining a second copy. Check actual instruction loading in a fresh tool session.
- Use native tools available in the active assistant. Codex-specific skill paths, scratch scripts, or agent tools are not dependencies Claude must install. Preserve the approved contract when using an equivalent command or workflow.
- Any task, implementation or review, may run in Claude Code or Codex. The user picks whichever has more remaining usage at the time; no provider owns a role ([D-016](docs/DECISIONS.md#d-016-provider-neutral-documentation-first-continuity)). A review is independent because it runs in a fresh session that never saw the implementer's conversation, not because of which provider runs it.
- The Markdown files are the only handoff between sessions. A new agent must be able to learn the project's structure, current state, and next task from them alone.
- Keep documentation lean ([D-036](docs/DECISIONS.md#d-036-lean-documentation-updates)): update documents once at the end of a task (or when handing over to another tool), not after every request. Questions, explanations and small chat actions change no files. Keep `docs/HANDOFF.md` current and short; add one brief STATUS entry per task with its checks and limits. Prefer building features over recording process.
- Respect the user's subscription constraints. Do not introduce API-key services to bypass a usage limit, and do not spend a provider the user did not choose. Record which tool and model actually implemented or reviewed a change.
- Use one writer at a time in a shared working tree. A reviewer reads only; parallel implementation needs separate ownership and isolation.
- Elephant has the broad context and maintains the approved brief, decisions, status, and bounded task specification. Goldfish starts without the Elephant conversation and reviews the specification against the approved source material and repository.
- Give workers explicit goals, allowed paths, interfaces, acceptance criteria, and verification expectations. Delegate only work within the approved step; workers return material blockers to the coordinator.
- Keep durable facts in the documents, rather than relying on chat memory. Update the status/handoff after a milestone; avoid copying the entire brief into every directory.
- Keep `docs/HANDOFF.md` concise and current after each approved work chunk; keep detailed command evidence/history in `docs/STATUS.md`. A handoff must identify the next task and whether its teaching checkpoint was approved.
- Add concise local `AGENTS.md` guidance when creating an authored project directory. Exclude `.git`, dependencies, build output, generated caches, and `public/` (see the next section). Local guidance adds responsibilities; it must not silently weaken product or privacy requirements.

## Static files in `public/`

Vite copies every file in `public/` into the built site unchanged, where anyone can request it. For that reason `public/` holds no Markdown or instruction files; these rules replace its former local guidance ([D-017](docs/DECISIONS.md#d-017-repository-structure-fixes)).

- Keep only files the running app serves: `public/models/pose_landmarker_full.task` (the local pose model), `public/wasm/` (the MediaPipe JavaScript loaders and WebAssembly runtime), and static SVG files. Images imported by source code belong in `src/assets/`.
- Never place workout footage, personal data, credentials, or secrets here.
- Treat the model and runtime as vendor files and never hand-edit them. `@mediapipe/tasks-vision` is pinned to an exact version in `package.json`, and `public/wasm/` must be a byte-identical copy of that package's `wasm/` folder. Upgrade the package, the runtime copy, and the model compatibility check together in one reviewed change, recording source, version, license, and checksum.
- Keep runtime loading local. A remote model or runtime URL changes network and privacy behavior and needs an accepted decision.
- A filename or a successful file request does not show that model initialization, inference, or phone support works. Validate a replacement with real footage, including missing poses.

## Coding practice

- Keep each change to one plan step. Do not mix in refactors, reformatting, or unrelated fixes; record those as separate follow-ups.
- Before changing behavior, write or update a test and watch it fail for the right reason. Fake only what the test environment cannot provide (MediaPipe, real media decoding, object URLs) and use the real modules otherwise.
- Match the surrounding code's naming, comment density, and idiom. Comments explain why, not what. Remove placeholders, dead code, and debugging output before committing.
- Validate inputs at module boundaries and fail with typed, actionable errors; never substitute zeros or defaults for missing or invalid data.
- Release everything a job acquires (timers, listeners, object URLs, detectors, video sources) on every exit path, and test that release.
- Run `npm test`, `npm run lint`, and `npm run build` before every commit.

## Verification and code review

- Run checks appropriate to the change. State exact results and checks not run; never claim that source inspection, mocks, or successful compilation proves real-video accuracy.
- After code implementation and the relevant checks, obtain a fresh critical review against the approved specification. Review rules and a reusable prompt are in [WORKFLOW.md](docs/WORKFLOW.md).
- Each review finding needs a severity, location, realistic trigger, consequence, and supporting evidence. Keep speculative concerns separate. No issue quotas or performative hostility.
- Evaluate findings independently. Fix supported defects, document evidence-backed disagreements, and verify affected behavior after fixes. Do not report a milestone complete with unresolved acceptance-blocking defects.
- Before handoff, record changed paths, actual verification, limitations, review disposition, remaining prerequisites, and the next concrete action in [STATUS.md](docs/STATUS.md).

## Existing commands

- Development: `npm run dev`.
- Use Node 22+ for mobile tooling (`.nvmrc`: 22.23.2). Preserve the user's global
  Node selection; on this Windows host select the installed version per process.
- Build/type check: `npm run build` (source, mobile, Node-tool and browser-test
  configuration checks, then Vite).
- Native copy/update: `npm run mobile:sync` builds and syncs both platforms;
  it is not native compilation. Branding: `npm run mobile:assets`.
- `ios/` and `android/` have scoped guidance covering their generated native
  subdirectories; do not add Markdown to asset catalogs or copied public assets.
- Lint: `npm run lint` passes after the declared-tooling repair and unused-initializer cleanup; see [STATUS.md](docs/STATUS.md) for verification and remaining prototype limitations.
- Tests: `npm test` runs source tests in jsdom and packaging/fixture tests in Node
  with the app's Vite settings. Task13 adds 6 fixed-pattern integrity cases to
  Task12's 385 tests in 17 files. Consult STATUS
  for current evidence; fake bridge/media/pose data do not
  prove native behavior or bench accuracy. `npm run test:browser` owns the
  maintained non-human smoke suite; install its pinned browser with
  `npx playwright install chromium`. Read `tests/AGENTS.md` and scoped guidance.
  No human inputs/captures/uploads. Task 4's separate branch still owns its
  incomplete human-fixture/bench-acceptance tooling; do not merge it for tests.
- Task14's baseline was 448 tests / 22 files; manual workout boundaries,
  transactional storage, state ordering and App UI are separate from pose tests.
  Browser smoke also uses synthetic manual logs, never real user workout data.
- Task15 added the manual session-only rest timer at 458 tests in 23 files and
  14 browser cases. Use STATUS for actual local/hosted/device evidence.
- Task16's current baseline is494tests/26files and17 browser cases. Schema2
  routines/targets preserve strict legacy data and actual logged-set semantics.
- Task17 adds derived Progress and source-linked records. Its current local
  checks pass 511 tests in 28 files and 19 browser cases. Read STATUS for hosted and
  physical-device evidence.
- Task18's completed baseline was 562 tests in 34 files and 22 browser cases,
  with three native plugins. Task19 (D-039, session-only set-linked bench
  analysis) brings it to 597 tests in 36 files and 23 browser cases. Read STATUS
  for actual hosted/device evidence.
