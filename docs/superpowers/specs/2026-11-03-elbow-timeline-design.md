# Estimated 2D elbow angles and evidence timeline

Date: 2026-11-03. Authorization: the user explicitly requested tasks after the
bench-video work and said not to stop at that blocker. The builder selected this
bounded feature from the brief's measurement/evidence/timeline requirements.
This is not an assertion that the user prescribed the algorithm or threshold.

## Purpose and scope

Add an actual measurement layer and a video-linked timeline while bench recording
acceptance remains open. Work on a separate Task 5 branch from reviewed `master`;
Task 4 tooling remains on `feat/task4-browser-acceptance` at `34538e4`.
No new runtime dependency, backend, storage, mobile scaffold, repetition detector,
form verdict, or change to the pose engine/store/input limits.

## Measurement contract

- Consume the engine's `PoseResult`, preserving its actual media timestamps and
  observation indices (`PoseFrame.index`, not decoded source-video frame IDs).
  Never infer sample time from array index or requested FPS.
- Independently compute left and right interior shoulder–elbow–wrist angles,
  in degrees [0,180], from normalized image landmarks scaled to decoded source
  width/height in pixels. Normalized x/y axes have different scales in nonsquare
  videos; calculating directly in normalized space gives incorrect angles.
- Use existing `angleAt` with image-pixel x/y and z=0; neither inferred world
  coordinates nor model z contributes. Label the output `elbow-2d-v1`, degrees,
  image-pixel coordinate system, source dimensions, sampling target, and threshold.
- Default minimum visibility is 0.5, matching the current overlay's engineering
  cutoff. It is configurable in [0,1] and is not a calibrated confidence level.
  Metadata, duration, sampling target and threshold must be finite/in range;
  dimensions are positive integers. Malformed/nonincreasing/out-of-range frame
  timestamps or invalid frame indices reject the series with a readable error.
- Per-side absence stays explicit: no pose, missing joint, invalid x/y,
  out-of-image coordinate, unavailable/invalid visibility, visibility below the
  cutoff, or degenerate geometry. Return null degrees plus the reason; never 0
  or an invented neighboring value. A legitimate zero-degree angle is retained.
- Preserve the raw inputs. No smoothing, interpolation, gap filling, chosen
  target-person identity, inferred 3D biomechanics, or camera/view certification.

## Playback and presentation

- Show a compact panel for completed pose or no-pose results; hide it during
  processing/failure. The original video stays central and replayable.
- Reuse the current dark player styling, existing typefaces and accent colors.
  One shared plot with degree/time axes and text labels distinguishes left/right;
  no additional dashboard, decorative cards, or form-quality colors.
- Display nearest raw sample within one sampling interval of player time, ties
  choosing the earlier observation. Exact missing samples remain missing even if
  adjacent samples are valid. Display its actual timestamp and observation index.
  Outside that interval show no nearby observation; do not hold a value across gaps.
- Draw separate line segments at missing samples or time gaps greater than two
  sampling intervals (allow only floating subtraction roundoff). No smoothed
  curves or lines spanning missing data. Show singleton valid samples as dots.
- Existing video scrubbing updates the panel on media-time events, including
  paused backward/forward seeks. Previous/next measured-sample buttons seek to
  actual raw sample times where at least one elbow is measurable; do not create
  new playback/timer ownership. Disable controls when no candidate exists.
- Explain visible unavailability in plain language. Keep a concise label:
  "Estimated 2D angles" and "Image-space estimates; not a technique assessment."
  A details disclosure explains the shoulder/elbow/wrist definition, threshold,
  unvalidated bench landmark accuracy, possible occlusion/wrong-person estimates,
  and lack of measured 3D biomechanics. Do not reuse legacy score/flag types.
- An invalid result disables this measurement panel with a readable message;
  measurement failure must not prevent replay/removal of the underlying clip.

## Acceptance and honest limits

Prove geometry with known triangles, correct nonsquare/portrait scaling, bilateral
independence, unknown/low visibility, absent/degenerate points, zero degrees,
timestamp validation, immutable input, gap segmentation, sample selection, and
bounded navigation. Component checks prove rendering, disabled/missing states,
callbacks, source replacement, and integration with paused seek events.
Verify real no-person UI when feasible without inventing a positive pose.
Positive-pose component fixtures are synthetic and explicitly labeled as such.

Geometry and UI tests establish calculations on supplied observations. Real bench
identity/landmark accuracy, anatomical angle accuracy, frame-perfect playback,
phone performance, and original Task 4 acceptance remain unverified. The feature
can be delivered as an explicitly limited image-space measurement tool; it must
not be presented as a validated bench assessment or completion of milestone one.
