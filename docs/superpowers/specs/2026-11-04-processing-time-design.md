# Observed processing time

Authorization: the user asked the builder to find PC-side tasks while phone
testing waits. D-026 records the builder-selected scope; D-024's
explain-and-proceed instruction applies. This adds one observation to the
existing result view; it is not a benchmark or phone acceptance.

## Purpose and boundaries

When a clip finishes processing, show how long this run took on this device,
measured from admission to the completed result. The phone plan asks for elapsed
time "if observed", and iPhone Safari has no developer console without a Mac, so
the measurement must be readable on screen. README lists mobile performance as
unverified; repeated observations from real devices are the first evidence.

The value is one run on one device, from admission to result (including model
start-up). Background suspension, thermal throttling, other apps and the GPU/CPU
delegate all change it. It is not a speed rating,
expected duration, frame rate or inference-speed promise, and it must not be
compared across devices as if controlled. No progress estimate, "time remaining",
history, storage, analytics or upload. No engine, limit, model, native or
dependency change.

## Store contract

- `SessionDeps` gains `now: () => number`, a monotonic millisecond clock. The
  default is `() => performance.now()`. `Date.now()` is not used, because the
  system clock can jump during a run when it is synchronized or changed.
- `startClip` reads `now()` once after the busy and selection checks pass and
  before any engine, URL or video is created, and gives the reading to that
  clip's own job (never shared store state). The job reads `now()` once more when
  `processVideo` resolves and the job still owns the session.
- The interval therefore includes reading video metadata and starting the model
  (loading the WebAssembly runtime, plus any GPU-to-CPU fallback), because each
  clip gets a fresh engine. It is time-to-result, not inference speed.
- Both readings go through one guard: a reading that throws, or is not finite,
  counts as invalid. A throwing clock therefore cannot strand a URL or turn a
  completed result into an error.
- `Clip` gains optional `processingMs?: number`: elapsed milliseconds from that
  admission reading to the completed result. Set it only with status `ready` or
  `no-pose`, in the same patch as `pose`, so a result never appears without its
  time or with a stale one.
- Record no time for failed, cancelled, removed or replaced jobs; their late
  callbacks are already ignored by the job ownership check. A replacement clip
  starts without `processingMs`.
- If either reading is not finite, or the end is earlier than the start, leave
  `processingMs` absent. Never substitute zero or another default, and never let
  a bad clock reading turn a completed result into an error.
- Keep the raw floating value; round only for display.

## UI contract

- `CoverageBadges` in `VideoStage.tsx` adds one badge after the existing ones
  when `clip.processingMs` is present: **Processing took N seconds on this
  device**, with N = `(processingMs / 1000).toFixed(1)` (for example 4123.4 ms
  shows `4.1`; 0 ms shows `0.0`; 123456 ms shows `123.5`). "seconds" is written
  in full so screen readers do not read a bare "s". Use the same chip style; no
  existing icon represents time, so the chip is text only, with no new icon.
- Absent value: no badge, no placeholder and no zero.
- The badge is plain text in the existing badge row, so screen readers read it
  with the other result details. No live announcement, timer or animation.
- No-pose results show the badge too: they are completed observations, and the
  time to reach "no pose" is the same kind of evidence.

## Verification

- Store tests with a supplied fake clock: ready and no-pose results record the
  exact difference; a failure records nothing; a late result arriving after
  removal sets no time; a clip admitted after cleanup records only its own
  interval from its own start reading. (The store refuses a new clip until the
  old job has settled, so "late result after replacement" cannot occur.)
  Non-finite, backwards and throwing readings leave the value absent while the
  result still completes, and a throwing start reading creates no URL leak.
- Same-update rule: a store subscription asserts that every emitted state whose
  clip has `pose` also has `processingMs` (with a valid clock), so a separate
  later patch would fail the test.
- Component tests: the badge text and rounding for several values, including
  0 ms; no badge when the value is absent.
- Existing 366 tests stay green. Real no-person inference in an isolated PC
  browser shows a plausible badge after processing, at wide and narrow (phone)
  widths. No phone, benchmark or accuracy claim follows.
- Whether `performance.now()` keeps counting while iOS suspends Safari is
  unverified; the phone record must say the value may then differ from a
  stopwatch.

Task 10 does not gate the phone session: if it is not reviewed and merged when
the user is available, the Safari cases run on the current Task 8 build without
the badge.
- Fresh independent design and code review, full tests/lint/build and guarded
  mobile sync are required. Record exact results and limits in STATUS/HANDOFF.
