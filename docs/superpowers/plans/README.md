# Implementation plans

The reviewed [phone/video acceptance plan](2026-11-04-phone-video-acceptance.md)
completes Task 7's planning deliverable, authorized on 2026-11-04. Available device:
iPhone12ProMax, no Android phone or paid Apple membership. It proposes free
Safari checks first and keeps installed-native/bench gates separate. Its Step 1
is in progress as Task 8 on `feat/task8-safari-phone-test`: baseline and verified
fixture export are done; the phone transfer waits on the user. No phone cases
have run.

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
