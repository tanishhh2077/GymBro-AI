# Current project status

Updated: 2026-11-02 (America/Chicago).

## Current stage

The current product is **GymBro AI** (`gym-bro-ai`). The user approved the [implementation plan](superpowers/plans/2026-11-02-video-landmarks.md), then changed the first exercise to **bench press** before feature edits began; see [D-013/D-014](DECISIONS.md#d-013-execute-the-reviewed-first-milestone-plan). Task 1 is starting on a feature branch with an authored-file snapshot. The [bench-specific Goldfish review](GOLDFISH_BENCH_REVIEW.md) is complete, with its two acceptance clarifications adopted. Test dependencies are installed; the test command/configuration and application tests do not exist yet. Execution now follows the user's explanation-and-understanding checkpoint before each meaningful step.

## Observed implementation

- React/TypeScript/Vite application with Zustand state and a video-centered UI.
- Local video selection, browser decoding, MediaPipe pose estimation, timestamped observations, progress/errors, and GPU-to-CPU initialization fallback.
- Playback, scrubbing, slow motion, and a canvas landmark overlay.
- Locally bundled pose model and vision WASM runtime.
- Geometry and smoothing helpers plus provisional analysis types.

These are source-inspection observations. They do not establish that real-video pose alignment, accuracy, mobile performance, or every failure path has been tested successfully.

## Not implemented or not demonstrated

- Verified first-milestone result on a real, permitted side-view bench-press clip.
- Bench-press/side-view-only product scope and accurate capability copy in the application.
- Robust bounded validation, cancellation, sequential processing, and missing-data presentation.
- Rep detection/counting, descent/bottom/ascent segmentation, angle/depth/tempo measurements, evidence-backed findings, or validated quality/abstention behavior.
- Saved sessions, comparisons, authentication, backend services, or a database.
- Installed mobile project, device performance results, or store submission.
- Automated test suite, fixture manifest, evaluation dataset, or measured accuracy benchmarks.

## Known inspection findings

- `src/core/PoseEngine.ts`: `seekTo` waits for `seeked`/`error` without timeout/abort handling; seeking an already-current position needs care.
- `src/store/useSessionStore.ts`: metadata's timeout can leave a promise pending; engine abort support is not wired to clip removal/reset.
- The shared detector can be called by multiple uploads; detector timestamps restart per clip without an explicit lifecycle policy.
- Input size/duration/dimension bounds are absent. One detected frame can currently mark a whole clip ready.
- `SkeletonOverlay.tsx` and `math.ts` contain gap interpolation/filling behaviors that must not be mistaken for measured evidence.
- UI copy and exercise/angle controls exceed the accepted scope. Future analysis types include arbitrary score fields and lack the required finding-evidence contract.
- The build's TypeScript check includes application source, but does not reference `tsconfig.node.json` or type-check `vite.config.ts` through that configuration. `@types/node` is now installed for the planned test setup. Wiring a configuration check remains separate work.
- No test script or test files were found during inspection.

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

## One next task

Explain and then configure Task 1's test harness: add the `npm test` command and Vitest configuration for source tests in a simulated browser environment. Wait for the user's understanding checkpoint before making those changes. The generated-backup lint exclusion is repaired and independently reviewed. Keep new measurements, rep counting, mobile scaffolding, and backend work outside scope.

The user has no personal fixture available. A licensed public bench-press candidate has been found but has not been downloaded, inspected for framing, converted, or run through inference. Before acceptance, establish a permitted suitable side-view fixture and record provenance/changes; do not claim a candidate or a mock is a validated result.

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

## Planning handoff

- User authorization: [D-012](DECISIONS.md#d-012-draft-the-first-milestone-implementation-plan).
- Created a four-task plan with exact file boundaries, producer/consumer interfaces, failing-test cycles, failure cases, commands, and a map covering M1-01 through M1-12. Added local guidance to both new authored planning directories.
- Self-reviewed requirement coverage, interface consistency, the five review-focus classes, and plan proportion. This is a planning self-review, not another Goldfish specification verdict or a code review.
- Inspected npm compatibility metadata for the proposed test tools and found an installed Edge executable. No dependencies were installed, browser launched, fixture obtained, or application files changed in this step.
- Runtime tests were not repeated for a documentation-only plan. The preceding lint/build results remain historical baseline evidence, not proof of the proposed features.
- Handoff checks passed: **14** maintained directories have guidance, **23** Markdown files have valid local links/anchors, and the plan has **4** tasks with all **29** steps unchecked. Dependency files and unrelated application source are preserved; no proposed feature file was created. The existing one-line source cleanup remains the last application-code change.
