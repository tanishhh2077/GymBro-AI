# GymBro AI: current handoff

Updated 2026-11-03. Start here in Claude Code or Codex; no prior chat is needed.

## Current work and authorization

The user explicitly requested building later tasks instead of stopping at the
missing bench recording. D-021 authorizes this bounded batch. The builder chose
estimated left/right 2D elbow angles with a video-linked timeline, from the
original brief's measurement and evidence requirements. Explain work as it
proceeds; do not reopen the already-authorized batch's understanding checkpoint.
For new scope afterwards, preserve the normal teaching checkpoint.

Read root AGENTS.md, scoped source rules, the
[design](superpowers/specs/2026-11-03-elbow-timeline-design.md), and
[Task 5 plan](superpowers/plans/2026-11-03-elbow-timeline.md). Raw pose observations,
derived measurements and technique findings must remain separate. No form score,
automatic reps, medical claims, backend/storage or mobile scaffold in this batch.

## Branches and actual implementation

- Current branch: `feat/task5-elbow-measurements`, based on reviewed local/remote
  `master` at `680201d`. Design review returned "nothing important left". Core
  measurement functions are implemented: 40 tests failed first against API stubs,
  then passed. Next: panel/player tests first, then integration and fresh review.
- Tasks 1-3 are implemented/reviewed on master: bounded media engine, one local
  clip, lifecycle/selection errors, timestamped poses, player and overlay.
- Task 4 tooling is separately committed/pushed at `34538e4` on
  `feat/task4-browser-acceptance`. That branch has Playwright/Edge tooling, ten
  passing independent browser cases, a fixture gate and 254 passing total unit/
  component/fixture tests. It is not merged here; this checkout has the reviewed
  236-case application baseline and no Playwright test files/dependency.
- No suitable permitted side-view barbell bench recording has been established.
  The user cannot arrange one; do not ask them to record again. Search evidence
  is preserved on the Task 4 branch in `docs/FIXTURE_SEARCH.md`.
- Real bench identity, landmarks/anatomical accuracy, positive overlay alignment,
  60 s worst-case processing, rotated media and physical-phone performance remain
  unverified. Beginning Task 5 does not complete milestone-one acceptance.

## Verification and development

Baseline after branch creation: `npm install --no-audit --no-fund` succeeded and
removed the three Task 4-only tooling packages. Original baseline: 236 cases.
Task 5 core adds 40 cases (276 total); see STATUS for the latest verification.
Lint and build exited 0; build transformed 400 modules with the existing stale
Browserslist warning. Own strict-port dev server 5191 returned HTTP 200 before
feature code. No new dependency is planned.

Own Task 5 server uses `127.0.0.1:5191` with `--strictPort`. Earlier server 5176
belongs to an old session; leave it alone. Stop only the server you started and
verify its port free at handoff. Automated browser checks need their own profile;
never save private-video screenshots/traces or upload user media.

One writer; use a fresh read-only reviewer after implementation. Either provider
may implement/review. Record the actual provider/model if exposed. No paid API
workaround for subscription limits. Shared guidance is AGENTS.md, imported by
adjacent CLAUDE.md; preserve all unrelated work and the original PRODUCT_BRIEF.

Use one feature branch per task and commit/push green steps. Before each commit,
run whole tests/lint/build and inspect staged paths. No attribution trailers,
force pushes or history rewrites. Do not merge incomplete Task 4 just to obtain
its tooling; Task 5 can advance independently from the reviewed app baseline.
