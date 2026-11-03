# System architecture

Status: observed prototype plus accepted direction; not a claim of completed MVP behavior. Updated 2026-11-02.

## Existing implementation

The repository is a React/TypeScript/Vite browser application. There is no Python service, database, account system, mobile project, or persistence layer.

Current data flow:

```text
Local file selection
  -> browser object URL and in-memory session store
  -> hidden HTML video element for decoding and seeking
  -> MediaPipe Pose Landmarker (GPU attempted, CPU fallback)
  -> timestamped normalized landmarks and inferred world landmarks
  -> visible HTML video plus canvas skeleton overlay
```

"Upload" currently means choosing a local file. The inspected processing path does not send that file to a server. This is a source observation, not a completed runtime network/privacy audit. The page requests external Google Fonts; local inference does not mean the entire page makes no network requests.

## Current ownership

| Area | Responsibility |
| --- | --- |
| `src/App.tsx` | Page composition, exercise selection, and starting processing after file selection |
| `src/components/ClipDropzone.tsx` | File selection and camera-angle UI |
| `src/store/useSessionStore.ts` | In-memory clips, object URLs, processing state, and engine invocation |
| `src/core/PoseEngine.ts` | Runtime/model initialization, video sampling, pose estimation, progress, coverage |
| `src/components/VideoStage.tsx` | Playback, seeking, speed controls, progress/errors, and video layout |
| `src/components/SkeletonOverlay.tsx` | Landmark lookup/interpolation at video time and canvas rendering |
| `src/core/landmarks.ts` | Landmark indices and skeleton topology |
| `src/core/math.ts` | Geometry/signal helpers; no implemented exercise analyzer consumes them yet |
| `src/types/index.ts` | Shared data shapes; includes provisional future-analysis types |
| `public/models/`, `public/wasm/` | Bundled model and MediaPipe runtime assets |

## Data and time contracts

- `PoseFrame.time` is video playback position in seconds. `index` is sample order, not a guaranteed source-frame number.
- `PoseResult.fps` currently records the target sampling rate, not the video's original frame rate.
- Normalized image coordinates are used for overlays. Inferred world landmarks are model estimates with different units and semantics; do not mix them silently.
- Detector timestamps must satisfy the runtime's sequencing contract without changing the original video-relative times used for display.
- A missing pose is represented by `null`. Missing observations must not be silently converted into successful detections, zero angles, or scientifically supported interpolated evidence.
- Coverage summarizes pose detections over sampled observations. It is not a calibrated confidence estimate or a technique score.

## Observed gaps and risks

Source inspection found unbounded seek waits, a metadata timeout path that can remain pending, unwired cancellation, and a shared engine with no per-clip concurrency guard. Overlay sampling can substitute a neighboring pose when one is missing. These are inspection findings to reproduce and address, not claims that every failure has been demonstrated at runtime.

The UI currently exposes exercises/views outside the accepted first milestone. Copy and future types also imply analyzers, view-invariant biomechanics, and numeric scores that are not supported by the implementation. [STATUS.md](STATUS.md) tracks the gaps. Local source files are intentionally unchanged by the documentation step.

## Intended boundaries for the first milestone

- File eligibility/metadata validation runs before expensive processing.
- Session orchestration owns one active job, cancellation, stale-result protection, and media cleanup.
- Pose estimation produces observations and descriptive processing metadata. It does not produce bench-press judgments or bar-tracking output.
- Playback/overlay consumes video-relative observations and presents missing/uncertain data honestly.
- Future measurement functions consume explicit observations and output measurements with units and validity. A later findings layer attaches interpretations and supporting evidence.
- A small real-video verification path distinguishes actual inference and alignment from mocked orchestration tests.

Keep analysis logic independent of React. Reuse existing working boundaries instead of migrating stacks solely because a preferred technology was listed in the brief.

## Mobile direction and deferred services

The intended release is an installed mobile app. After the initial browser milestone is demonstrated, a small Capacitor prototype is the first candidate for exercising the same file-selection, analysis, and replay workflow on a real phone. Packaging does not convert browser inference into a native MediaPipe implementation or establish acceptable performance.

Record the tested device, OS, runtime, model, delegate, clip characteristics, processing time, failure/cancellation behavior, and available resource measurements. Do not choose the processing architecture from an App Store target alone. Prototype evidence determines whether local processing remains suitable or another implementation/service is justified.

Python/NumPy may support evaluation or a later analysis implementation. FastAPI and PostgreSQL remain possible later services for demonstrated needs such as saved sessions. Saving measurements and retaining/uploading raw videos are separate privacy decisions. Do not introduce accounts, object storage, queues, or distributed infrastructure into milestone one.

## Runtime reference sources

These sources establish available platform capabilities, not GymBro AI's measured performance or approval for distribution:

- [MediaPipe Pose Landmarker for iOS](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/ios): native support includes stored videos.
- [MediaPipe Pose Landmarker for Python](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python): a future evaluation/implementation option.
- [Capacitor documentation](https://capacitorjs.com/docs): a candidate for packaging the existing web application and native device integration.
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality): distribution requires a useful, complete experience; a framework choice does not guarantee review outcomes.
