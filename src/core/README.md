# Media and pose processing

`workouts.ts` separately validates Task 14's manual workout schema, units, bounds,
IDs and media-free storage shape. It does not derive anything from pose data.
`workouts.test.ts` has 29 boundary cases; see D-030 and the tracking design.
Task16 extends strict validation to schema2 routines/target snapshots and accepts
strict legacy v1 with size-preserving/no-write normalization. `routines.test.ts`
adds target/count/unknown-data/legacy boundaries; storage remains media-free.

- `PoseEngine.ts`: MediaPipe coordinator. Runs one bounded job at a time:
  validates metadata before model work, owns a per-job detector, keeps only
  forward media times, copies and validates landmarks, and cleans up on every path.
- `video.ts`: bounded metadata reading, duration recovery, and frame-ready seeking.
- `processingLimits.ts`: `M1_LIMITS`, the spec's input bounds and time budgets.
- `processingErrors.ts`: shared typed error, also re-exported by the engine.
- `clipPolicy.ts`: `validateSelection`, the one-`.mp4`, 100 MiB admission check run
  before any URL or model work. Called by the store's `startClip`.
- `video.test.ts` (58 cases), `PoseEngine.test.ts` (55), and `clipPolicy.test.ts`
  (22): all pass as of 2026-11-03, using simulated media and a mocked MediaPipe SDK.
- `landmarks.ts`, `math.ts`: topology and provisional math.
- `exercises.ts`: display names and accent for the one supported lift and view
  (bench press, side); `exercises.test.ts` (2 cases) keeps it to those entries.
- `elbowAngles.ts`: Task 5 image-pixel shoulder/elbow/wrist estimates, explicit
  per-side unavailable reasons, raw observation selection, gap-separated segments,
  and sample navigation. Forty synthetic-geometry cases verify the calculations;
  this does not establish anatomical accuracy or real bench landmark identity.
- `elbowSummary.ts`: Task9 counts measurable/unavailable samples per side and
  preserves earliest raw extrema with media times/observation indices. Its 34
  synthetic-contract cases cover endpoints, ties, malformed input and immutability.
  Availability is not confidence; extremes are not per-rep range of motion.

The engine's lifecycle and time contracts are described in
[ARCHITECTURE.md](../../docs/ARCHITECTURE.md#pose-engine-lifecycle). Passing tests
show coordination behavior only; they do not establish real decoding or pose
accuracy. Preserve raw timestamps, missingness, and uncertainty.

Read [local rules](AGENTS.md), [handoff](../../docs/HANDOFF.md), and the active
[plan](../../docs/superpowers/plans/2026-11-02-video-landmarks.md).
From the repository root: `npm test -- src/core/video.test.ts src/core/PoseEngine.test.ts`.
