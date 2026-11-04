# Implementation plans

Current feature: [Task 10 observed processing time](2026-11-04-processing-time.md)
under D-026, on `feat/task10-processing-time` from master `3209025`. It shows one
completed run's measured time; it is not a benchmark. Task 8's branch has merged
master `3209025` and holds the phone preparation; it merges Task 10 after review.

Latest completed feature: [Task9 elbow summary](2026-11-04-elbow-summary.md),
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
