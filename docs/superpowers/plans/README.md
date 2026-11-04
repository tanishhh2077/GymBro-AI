# Implementation plans

The active plan is [2026-11-03-mobile-prototype.md](2026-11-03-mobile-prototype.md),
authorized by D-022 for both platforms with iPhone first. Steps1–4 are implemented:
320 tests, native cloud builds and visible iPhone-simulator startup pass. Step5's
whole-feature review/handoff/integration was approved on 2026-11-04 and is active.

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
