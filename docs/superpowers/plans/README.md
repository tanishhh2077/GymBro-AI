# Implementation plans

Current: [Task16 saved routines](2026-11-05-saved-routines.md), explicitly approved
by the user under D-034. Implementation,494tests,17browser cases,fresh reviews and
hosted browser8/native15 pass on source4c1b519. User transfers to Claude Code after
Codex limit; finish Step3 documentation/master/original-checkout integration and
cleanup from the Task16 worktree. No dependency or account service.

Completed: [Task15 manual rest timer](2026-11-04-rest-timer.md), D-033.458tests,
14local/hosted browser cases,guarded sync,fresh review and native13 compile/visible
simulator startup pass; reviewed source9eef2fb pushed to master. Q8/Q9 decisions
are recorded; Q10 waits until Q&A resumes. Phone/bench acceptance stays separate.

Completed: [Task14 local workout logging](2026-11-04-workout-logging.md), D-030.
Implementation/local checks/review fix and final hosted browser/native checks
pass. Codex resumed after the cancelled Claude handoff; final integration follows
D-018. Read current HANDOFF for Q&A and remaining phone/bench acceptance.

Current PC work: [Task 13 browser smoke](2026-11-04-browser-smoke.md), approved
under D-029 while the user's hotspot/video are deferred. Read HANDOFF for actual
progress and keep pending phone/bench acceptance separate.

Latest completed feature: [Task 12 legacy cleanup](2026-11-04-legacy-cleanup.md)
under D-028: unrendered legacy code, unused analysis types and template assets
removed; screens unchanged. All 4 steps, 385 tests and a fresh review pass;
fast-forwarded to master.

Preceding feature: [Task 11 config type-check](2026-11-04-config-typecheck.md)
under D-027. The build checks `vite.config.ts`/`vitest.config.ts` with Node types
and the unused template `tsconfig.app.json` is deleted; no application source
changes. All 3 steps, 383 tests and a fresh review pass; fast-forwarded to master.

Preceding feature: [Task 10 observed processing time](2026-11-04-processing-time.md)
under D-026: one completed run's measured time, not a benchmark. All 3 steps,
381 tests and a fresh review pass; it is fast-forwarded/pushed to master. Task 8's
branch holds the phone preparation and has merged this master (`aec3cb2`).

Preceding feature: [Task9 elbow summary](2026-11-04-elbow-summary.md),
observed counts/extrema navigation under D-025. All3 steps,366 tests, fresh review
and native run5 pass; source is merged/pushed to master. Task8 phone work stays
deferred on its preserved branch and must incorporate this reviewed master before
resuming. No rep/ROM/technique validity claim is added.

The reviewed [phone/video acceptance plan](2026-11-04-phone-video-acceptance.md)
completes Task 7's planning deliverable, authorized on 2026-11-04. Available device:
iPhone12ProMax, no Android phone or paid Apple membership. It proposes free
Safari checks first and keeps installed-native/bench gates separate. Execution
is coordinated with the user under D-024; no phone cases have run. Task8's branch
retains preparation and PC-preflight evidence while the user is away.

The latest completed plan is [2026-11-03-mobile-prototype.md](2026-11-03-mobile-prototype.md),
authorized by D-022 for both platforms with iPhone first. All five steps are
complete: 320 tests, native cloud builds, visible iPhone-simulator startup and
fresh whole-feature review pass. Reviewed code is merged/pushed to master, whose
run4 also passes. The follow-on planning checkpoint is now approved above.

The preceding plan is [2026-11-03-elbow-timeline.md](2026-11-03-elbow-timeline.md),
authorized as bounded follow-on work by D-021 despite missing bench footage.
All four Task 5 steps are complete: deterministic measurements, timeline/player
integration, 287 passing tests, real no-person browser checks, explicitly synthetic
visual checks, and fresh review without significant findings. Its completion flow
advances master to the reviewed feature; it does not complete original M1.
The earlier [2026-11-02-video-landmarks.md](2026-11-02-video-landmarks.md) remains
the milestone-one plan; Task 4 browser tooling is on its separate branch at
`34538e4`, with real bench acceptance still incomplete. Consult HANDOFF for branch
boundaries and actual tests; do not restart completed work from historical notes.
Tasks 1–3 are complete, each including its fresh review. D-019 integrates each
reviewed task into `master` by fast-forward and push; check Git refs for current
pointers. Task 4's checkpoint and continued development were approved later;
its permitted side-view bench-press fixture remains unavailable.

Follow [local rules](AGENTS.md). Check the [current handoff](../../HANDOFF.md)
before executing: accepted decisions and the current specification take precedence
where a plan narrative is stale. Preserve unrelated working-tree edits.
