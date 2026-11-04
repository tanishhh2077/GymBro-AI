# Clip elbow measurement summary

Authorization: the user requested PC-side development while phone testing waits.
D-025 records the builder-selected scope; D-024's explain-and-proceed instruction
applies. This extends Task5's observed-angle tool, not bench validation.

## Purpose and boundaries

Make the existing measurements easier to inspect: for each elbow show how many
sampled positions are measurable, the lowest/highest observed angle, and a jump
to each supporting video timestamp. Counts help expose missing evidence before
later repetition analysis. Preserve the existing plot, sample navigation and
player ownership. No new model, dependency, upload, storage or backend.

These are observed image-space extremes, not per-rep range of motion, confidence,
technique scores or anatomical truth. A tracking error can create an extreme.
No rep detector, smoothing, interpolation, new visibility threshold or form claim.
Task4 bench and Task8 phone acceptance remain incomplete on their own branches.

## Core contract

- New `src/core/elbowSummary.ts` exports
  `summarizeElbows(series: Readonly<ElbowSeries>): ElbowClipSummary`.
- Consume the existing `measureElbows` output. Do not recalculate geometry or
  infer new angles; keep left/right independent and preserve raw floating values.
- `ElbowExtremum`: `degrees`, `time`, `frameIndex` (stored observation identity,
  never a decoded source-frame number).
- `ElbowSideSummary`: `measurableSamples`, `unavailableSamples`, `lowest`, `highest`.
  Each extremum is `ElbowExtremum | null`.
- `ElbowClipSummary`: `totalSamples`, `left`, `right`.
- Count all stored sampled positions, including missing ones, in total. Each
  side's measurable + unavailable count equals total. This is sample availability,
  not fraction of video duration or accuracy. Never fill gaps or join movements.
- Empty/all-missing side: zero measurable, null extremes. One valid sample:
  both extremes identify that sample. Legitimate 0° and 180° remain measurable.
- Strictly smaller/larger raw values replace extremes; ties retain the earliest
  actual observation. Never compare rounded display strings or index/FPS times.
- Defensively reject incompatible version/unit/coordinate system, nonpositive
  duration, non-array samples, invalid/nonincreasing times or frame indices,
  out-of-duration samples, invalid angle values or contradictory/unknown reasons
  with RangeError. The originating measurement function owns source geometry and
  visibility validation; the aggregator adds no new geometry interpretation.
- Do not mutate source series/samples/measurements. Return copied extrema.

## UI contract

- Add `ElbowSummaryPanel` inside the existing Estimated 2D elbow angles region,
  below its plot/navigation. It accepts `summary: ElbowClipSummary` and the existing
  `onSeek(time: number): void`; it owns no media element, timer, store or detector.
- Label the group **Clip measurement summary**. Each side shows
  **N of T sampled positions measurable** and buttons **Lowest observed** /
  **Highest observed**, with whole-degree values and three-decimal media times.
  Accessible names identify side/action, e.g. **Jump to lowest left elbow angle**.
  Associate the visible angle/time or Unavailable as the action's accessible
  description; IDs must remain unique when multiple panels are rendered.
  Buttons pass the unrounded raw timestamp to onSeek, including time0.
- Null extrema show Unavailable and disable their jump buttons. An invalid pose
  retains the existing readable fallback and replay/removal behavior; summary
  failure must not crash the player or display stale/zero replacement values.
- Derive series + summary once per pose result, not per playback time change.
  Replacing the result updates counts/extrema and their callbacks atomically.
- Match the existing dark panel/system font, left-green/right-blue trace identity,
  compact responsive spacing and visible focus. Use one column on narrow screens
  and two on wider screens; no new dashboard, animation or decorative cards.
- Explain that missing samples are excluded and extremes may reflect tracking
  error; these values are not a per-repetition range-of-motion assessment.

## Verification

Use supplied synthetic observations for deterministic counts, independent sides,
missingness, 0/180°, ties, irregular timestamps, malformed values, immutable input
and result replacement. Component tests assert disabled states and actual seek
callback values. Existing player integration tests must stay green.
Check real local no-person inference: zero measurable samples/null extrema remain
honest. Inspect narrow/wide layouts with explicitly synthetic positive geometry.
No human footage, fabricated positive inference or benchmark/phone claims.
Fresh independent design/code review and full tests/lint/build/guarded mobile
sync are required. Record exact results/limits in STATUS and HANDOFF.
