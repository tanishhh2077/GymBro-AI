# Elbow-angle timeline implementation plan

> For agentic workers: use `superpowers:executing-plans` inline; test before behavior changes, then obtain a fresh read-only code review.

**Goal:** Calculate and display traceable image-space elbow estimates without blocking on licensed bench footage.
**Architecture:** Pure TypeScript derives a separate measurement series from raw pose observations. A compact React panel follows existing player time and delegates sample seeks to the player.
**Tech stack:** Existing React, TypeScript, Vitest, SVG and media controls; no new dependency.
**Spec:** [Elbow timeline design](../specs/2026-11-03-elbow-timeline-design.md).

## Global constraints and review focus

- Raw media times, decoded source aspect ratio, explicit missingness, independent left/right sides.
- Visibility cutoff 0.5 is an engineering default, not accuracy confidence.
- No fabricated observations, smoothing, 3D/technique claims, persistence or backend.
- Review absent joints/unknown visibility; nonsquare sources; gap boundaries;
  paused seek/source replacement; malformed results that must leave replay usable.
- Task 4 acceptance stays open on its own branch. Base this Task 5 branch on
  reviewed `master` at `680201d`; do not merge unfinished Task 4 merely for tooling.

## Task 5: bounded measurements and timeline

Files: new `src/core/elbowAngles.ts`/`.test.ts`,
`src/components/ElbowTimeline.tsx`/`.test.tsx`; modify `VideoStage.tsx` and its
test, applicable READMEs/AGENTS, architecture, decisions, status and handoff.

Interfaces: `measureElbows(pose, minVisibility = .5)` produces versioned metadata
and `{frameIndex, time, left, right}` samples with `{degrees, reason}` results.
`nearestElbowSample(series, time)` returns an observed sample or null;
`elbowSegments(series, side)` splits raw lines at missingness/large gaps;
`adjacentElbowSample(series, time, direction)` returns a measured neighbor or null.
`ElbowTimeline({pose, time, onSeek})` renders the panel and delegates navigation.

- [x] Step 1: Read applicable rules; obtain independent design/builder review;
  verify baseline tests/lint/build/dev server; commit the design/plan/context.
- [ ] Step 2: Write core tests, observe intended failure against API stubs,
  implement the four pure functions. Test every measurement/temporal constraint
  above, preserve raw input, and run whole tests/lint/build before commit/push.
- [ ] Step 3: Write component and player integration tests first; implement the
  accessible panel, discontinuous SVG plot, missing reasons and sample navigation.
  Reuse player `scrub` and time events. Test paused seeks, no-pose and source reset.
  Verify whole tests/lint/build, update docs, commit/push.
- [ ] Step 4: Obtain fresh whole-feature critical review and fix supported defects.
  Verify browser behavior using real no-person media and explicitly synthetic
  component samples; do not claim real positive bench validation. Record checks,
  limits and exact next action; commit/push. Merge only this reviewed feature per
  D-019 if all its bounded acceptance is met, leaving Task 4 incomplete.
