# Milestone 1: real bench-press video with synchronized pose landmarks

Status: execution approved by [D-013](docs/DECISIONS.md#d-013-execute-the-reviewed-first-milestone-plan), with exercise changed by [D-014](docs/DECISIONS.md#d-014-first-supported-exercise-is-bench-press). The [earlier review](docs/GOLDFISH_REVIEW.md) covered squat; the [bench review](docs/GOLDFISH_BENCH_REVIEW.md) identified acceptance clarifications now incorporated below. Initial engineering limits are configurable guardrails, not scientific validation. Date: 2026-11-02.

## Source of truth and scope

Read the user's unchanged [product brief](docs/PRODUCT_BRIEF.md), later accepted [decisions](docs/DECISIONS.md), and [current architecture](docs/ARCHITECTURE.md). This specification describes only the first technical milestone, not the full initial MVP.

Goal: a user selects a real side-view barbell bench-press clip, receives actual MediaPipe pose observations, and can inspect estimated body landmarks aligned with the original video during playback and seeking. Invalid input and processing failure must terminate with understandable feedback.

Initial workflow: one local video, one target lifter, standardized side view, stable camera, and a clearly framed upper body. Shoulders, elbows, wrists and the bar's movement should remain in frame for visual review. Hidden lower-body landmarks are not required to be visible. Recording guidance and selection do not constitute automatic verification of the exercise, view, target person, or landmark accuracy. The human pose model does not detect the bar.

No rep counting, phase segmentation, depth/joint-angle/tempo findings, bar detection/tracking or bar-path measurements, numeric form scores, saved workouts, accounts, backend uploads, database, mobile packaging, other exercises/views, multi-camera fusion, or custom model training in this milestone.

Bench-specific limits: the bench/rack, supine posture, occlusion and other visible people can undermine pose estimates or target selection. Display only supported estimated landmarks and explicit missingness; this milestone does not certify the subject/view or establish validated bench biomechanics. A real fixture must demonstrate usable observations before acceptance; failure to detect them is investigated and reported, not hidden by fabricated output or an assumed accuracy claim.

For acceptance, manual inspection of the fixture's reference samples must confirm that useful visible shoulder/elbow/wrist observations belong to the bench lifter. Wrong-person tracking or an unusable upper-body overlay blocks acceptance even if data-shape/projection checks pass. This is qualitative fixture validation, not automatic identity detection or a numerical biomechanics benchmark.

## Existing work to reuse

Keep React/TypeScript/Vite, MediaPipe, bundled assets, and the existing player/overlay/engine/store boundaries where practical. Current implementation already has local files, a reusable detector, pose frames, coverage, progress, and a canvas overlay. It also has incomplete input/lifecycle handling and unverified real-video behavior. See [STATUS.md](docs/STATUS.md).

Do not rewrite the stack or create a second production analysis implementation. Future interfaces can evolve after this vertical slice is verified.

## Proposed pilot defaults

The following began as specification-author engineering choices and were accepted as initial configurable pilot guardrails with D-013. They are not measured performance or calibrated scientific thresholds. Keep them named/configurable, include boundary tests, and explain revisions supported by evidence.

- One loaded clip and one active processing operation. Require removal of the current clip before selecting another; no multi-clip queue in this milestone.
- Baseline support: an MP4 file the selected browser can decode; real acceptance fixture uses H.264 in MP4. Do not infer codec support from the extension alone or advertise untested MOV/WebM/HEVC support.
- Maximum file size: 100 MiB (104,857,600 bytes); maximum duration: 60 seconds; duration must be finite and positive.
- Decoded dimensions must be positive, long edge no greater than 1920 pixels, and total pixels no greater than 2,073,600. Both landscape 1920x1080 and portrait 1080x1920 fit these bounds.
- Retain a target sampling rate of 30 observations/second initially. This is not a claim of source FPS or processing speed.
- Asynchronous stage budgets: metadata 10 seconds; model initialization 60 seconds; each seek/frame-ready wait 10 seconds; total processing 300 seconds. These are failure bounds, not latency benchmarks.
- Preserve existing detector configuration until a change is justified and recorded. Display visibility thresholds must be named and described as heuristics, not calibrated correctness probabilities.

## User flow and input eligibility

1. Explain the supported lift/view and provide plain recording guidance: one target lifter, visible upper body/arms, stable side view, adequate light, and bar movement inside the frame for human review. Missing/occluded landmarks and other people can undermine observations; do not certify footage or imply bar tracking.
2. Choose one local MP4. Empty files, multiple-file drops, non-MP4 containers, and files over the byte bound produce visible, accessible rejection messages before model work starts. MIME/extension are preliminary hints; require decoded media, finite metadata, and a drawable frame before inference.
3. Validate duration and decoded dimensions against the pilot limits. Reject corruption, unsupported decoding, unavailable duration, and invalid metadata clearly. Do not silently accept only the first file or leave invalid input without feedback.
4. Start one processing job, expose progress, and keep removal available as cancellation. Prevent a second job from entering the shared detector while the first is active or cleaning up.
5. After processing, show the video, estimated landmarks where available, playback/seek/speed controls, and accurately labeled descriptive coverage. No detections produces a clear "no pose detected" result with recording advice, not a form judgment.
6. Removing/resetting cancels active work, clears the result, releases media resources, and allows a new clip. A cancelled/old job cannot update a replacement session.

## Observation and time contract

- Reuse explicit `PoseFrame`/`PoseResult` concepts: observation order, video-relative time in seconds, normalized landmarks or `null`, optional inferred world landmarks, decoded dimensions, target sample rate, runtime delegate, and descriptive coverage.
- Record the resulting video playback position for each sample rather than inventing it from sample index divided by assumed source FPS.
- Seek-based browser sampling does not establish original decoded presentation timestamps. Describe these as video-time sample positions; do not claim exact source-frame extraction or validated variable-frame-rate measurement precision.
- Stored times must be finite, ordered, and inside the clip. Retain only one observation when repeated seeks resolve to the same video time; sample count/coverage denominators must reflect retained observations.
- Detector input timestamps must follow its monotonic/lifecycle contract across clips. Isolate/reset tracker state appropriately or use a distinct detector clock; do not alter stored video-relative times merely to satisfy the detector.
- Keep missing poses explicit. Coverage counts retained observations with detections; it does not certify body framing, technique, or measurement accuracy. Do not render placeholder scores or analytic claims.
- Required raw coordinate values must be finite; retain finite off-image estimates without clamping them. Video-relative times must be in range. Only drawing requires x/y within the image bounds; hidden/off-image lower-body estimates do not by themselves invalidate useful visible bench-lifter observations.

## Playback and overlay contract

- Align normalized coordinates to the actual rendered video content rectangle, accounting for aspect ratio, resizing, and supported orientation. Do not map them to letterbox padding or an unrelated container.
- Select overlay samples from the visible player's current time. Playback, backward/forward seeking, restart, and slow motion must refresh the correct pose while paused as well as while playing.
- Draw only landmarks/edges meeting the named visibility policy. Missing visibility is unknown, not automatically perfect confidence.
- Do not carry a detected pose across a missing-pose observation. Optional visual interpolation is allowed only between adjacent retained, detected observations at most two target-sampling intervals apart; otherwise hide the overlay for the gap. Interpolated display is not a measured observation.
- Before the first/after the last sample, hold an endpoint only within one target-sampling interval; hide beyond that. At an exact missing sample, show no skeleton.
- These timing tolerances govern sample selection/display, not the scientific accuracy of pose estimates. Record manual alignment observations honestly; do not fabricate pixel-accuracy results.
- Ensure playback/seek/removal controls have accessible names and keyboard operation. Mobile layout should remain usable, but no installed-mobile compatibility claim is part of this milestone.

## Lifecycle and failures

- All asynchronous metadata, initialization, duration-resolution, and seek/frame-ready waits have explicit settlement and cleanup on success, failure, timeout, or cancellation.
- Handle seeking to an already-current time without relying on an event that may never fire; require the frame to be drawable.
- Wire the engine's abort support through session ownership. Synchronous inference may finish its current call before cancellation is observed; do not promise preemption. Pending asynchronous waits must settle on cancellation.
- An operation token or equivalent ownership check prevents stale progress/results/delegate updates. Ignore or dispose of late initialization results after cancellation; do not leak an orphan detector.
- Serializing jobs includes the cleanup phase. Removing then immediately adding must not make two operations share mutable tracker state.
- Release object URLs, hidden video sources, listeners, timers, and obsolete results when their owner is removed/reset. Do not close a detector another active operation still owns.
- Distinguish validation rejection, model/runtime initialization failure, decoding failure, timeout, cancellation, and no detected pose in user-facing behavior. Cancellation need not appear as a frightening processing error.
- Partial results from a failed job must not appear as a successful complete result. Any retained diagnostic observations are labeled incomplete and excluded from success/coverage claims.
- UI language describes pose visualization only. Remove or narrow existing unsupported claims about coach-grade judgment, tailored exercise analyzers, and measured angles/depth/tempo/symmetry. Keep GymBro AI branding and the tagline "Your second set of eyes." consistent where touched; the identity amendment in [D-010](docs/DECISIONS.md#d-010-current-product-identity) supersedes the original brief's historical name.

## Privacy and fixture prerequisite

Processing remains local to the device. Do not send user media, extracted images, or pose data to a new service, analytics SDK, or paid AI API. Bundled model/runtime asset requests are separate from video transfer. Do not claim the entire page is network-free while external fonts remain.

Real-video acceptance needs a short side-view bench-press recording with documented permission/license. Record origin, redistribution/retention permission, checksum, duration/dimensions, and reference inspection timestamps. Do not download arbitrary personal gym videos or commit identifiable private footage without permission. A locally supplied private fixture may remain outside Git with an explicit setup path and checksum; a licensed public fixture may be obtained with attribution and any adaptations documented. Inspect candidate framing; do not change camera requirements silently to fit a convenient sample.

Fixture availability is an explicit prerequisite. If a permitted real clip is unavailable, record the blocked acceptance check; mocked landmarks or synthetic plumbing tests cannot substitute for real inference.

## Acceptance and verification

| ID | Required behavior | Evidence |
| --- | --- | --- |
| M1-01 | Fresh development setup and declared tooling are reproducible | Document install/dev/build/lint commands actually run, environments, and failures; repair declared tooling within the approved implementation task |
| M1-02 | One supported clip, scoped workflow, and truthful UI | Inspect controls and copy; exercise duplicate/unsupported selection and recording guidance |
| M1-03 | Input bounds enforced before costly work | Automated zero/over-size, invalid/over-duration, dimension-boundary, multiple-file, and undecodable cases |
| M1-04 | Real MediaPipe inference produces usable timestamped observations of the bench lifter | Browser integration on the permitted H.264 MP4 fixture: actual nonempty pose data, finite raw coordinates, ordered in-range video times; drawing hides off-image/unsupported points. Manual reference-sample inspection must confirm useful visible upper-body observations belong to the intended lifter; structural checks alone cannot pass this gate. No inference stub |
| M1-05 | Overlay remains tied to video time | Automated sample/gap-selection tests and browser/manual checks at documented start/middle/end positions, backward seeking, paused seeking, restart, slow motion, and resizing |
| M1-06 | Missing detections and visibility stay honest | Automated missing-neighbor/exact-null/large-gap/unknown-visibility cases; no stale skeleton over unobserved gaps |
| M1-07 | Failure paths terminate | Automated metadata/seek/init/duration timeouts, same-position seek, corruption and model-load failure; no indefinite processing spinner |
| M1-08 | Remove/reset cancels safely | Automated cancellation during waits, stale result rejection, repeated replacement, and cleanup; allow current synchronous inference call to return |
| M1-09 | No shared-detector overlap or cross-clip state leakage | Targeted consecutive/repeated-upload integration tests and ownership checks |
| M1-10 | No-pose footage produces helpful feedback | Controlled detector-empty test; include a permitted no-person clip in real-browser checks when available |
| M1-11 | Video stays local | Inspect processing/network code and record browser network behavior during the real fixture run; exclude unrelated asset/font requests from video-transfer conclusions |
| M1-12 | Handoff is reproducible and honest | Run instructions, fixture provenance/setup, test commands/results, model/runtime settings, sampled timestamps, processing time on the named test machine, and known limitations |

Use a small appropriate automated test setup, not a large evaluation platform. Mock media events/detector failures for lifecycle tests, use pure unit tests for timestamp/overlay decisions, and a real-browser path for actual media decoding and model inference. Record what each test proves. The exact runner, test filenames, and supported initial desktop browser can be settled in the implementation plan and must be documented.

No accuracy/F1/latency targets are invented here. Landmark accuracy evaluation and robust rep/measurement benchmarks require a separate labeled dataset and methodology. The first mobile benchmark is a later milestone with a named real device; an emulator or desktop viewport is not equivalent evidence.

## Delivery and next boundary

Deliver only this working vertical slice, appropriate tests, run/fixture instructions, and an evidence-backed handoff. Obtain an independent critical review of the code and resolve acceptance-blocking findings. Document untested formats/devices and incomplete checks.

Do not start rep detection, persistence, mobile scaffolding, or a backend in the same change. The next architecture check is a small real-phone prototype after the basic pipeline is demonstrated; further measurement work gets its own specification.
