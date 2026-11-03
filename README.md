# GymBro AI

**GymBro AI — Your second set of eyes.**

GymBro AI is being developed as an evidence-backed strength-training video
analysis product. The initial scope is **one uploaded side-view barbell
bench-press video**.

The existing browser prototype contains local video selection, MediaPipe pose
estimation, and a skeleton overlay with playback controls. Repetition detection,
joint-angle/depth/tempo findings, saved sessions, and comparisons are not yet
implemented. Real-video acceptance and mobile performance remain to be verified.
The current UI still contains broader exercise/view choices; these are legacy
prototype behavior, not the approved first milestone's supported scope.

Processing currently happens on-device using WebAssembly/WebGL. Choosing a local
video does not upload it to a server. An installed mobile app is the intended
release direction; a Capacitor prototype is planned for evaluation after the
initial pipeline is demonstrated. No mobile project or backend exists yet.

## Project context and development

- [AGENTS.md](AGENTS.md): working agreements and directory guidance.
- [Original product brief](docs/PRODUCT_BRIEF.md): preserved user requirements.
- [Accepted decisions](docs/DECISIONS.md): later clarifications and deferred work.
- [Current status](docs/STATUS.md): implementation facts, verification limits, and next task.
- [Architecture](docs/ARCHITECTURE.md): existing data flow and intended boundaries.
- [Workflow](docs/WORKFLOW.md): Elephant-Goldfish specification review and critical code review.
- [First-milestone specification](spec.md): proposed scope and acceptance criteria; not implementation approval.
- [Implementation plan](docs/superpowers/plans/2026-11-02-video-landmarks.md): four proposed deliverables, file/interface boundaries, tests, and the real-video acceptance prerequisite.

## Stack

- **Vite + React + TypeScript**
- **@mediapipe/tasks-vision** `PoseLandmarker` — produces normalized landmarks
  for the overlay and inferred world landmarks. These are estimates, not
  measured ground-truth biomechanics. GPU initialization with CPU fallback.
- **Tailwind CSS + Framer Motion** for the animated, dark athletic-tech UI
- **Recharts** for metric visualizations
- **Zustand** for state

## Architecture

```
src/
  core/
    PoseEngine.ts     # Runs PoseLandmarker over a video, yields per-frame landmarks
    landmarks.ts      # BlazePose indices + skeleton topology
    math.ts           # Vector/angle math + signal smoothing helpers
    exercises.ts      # Exercise & camera-angle metadata
  components/
    SkeletonOverlay.tsx  # Reusable canvas overlay synced to video playback
    VideoStage.tsx       # Video player + overlay + controls + coverage stats
    ExercisePicker.tsx
    ClipDropzone.tsx
  store/
    useSessionStore.ts   # Session: exercise, clips, processing
  types/
    index.ts             # Shared domain types
```

The pose engine and geometry helpers are separate from React. Types for future
analyzers and multi-angle reports exist in `src/types/index.ts`, but the analyzers
and fusion are not implemented. These provisional types include legacy score
fields and will need revision before evidence-backed findings are built.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

A temporary clean copy passed `npm ci --no-audit --no-fund` and `npm run build`
on Node 20.20.2 / npm 10.8.2; development-server HTTP checks also passed during
the initial baseline. ESLint and its plugins are now declared. `npm run lint`
and `npm run build` pass after removing an unused initializer in `PoseEngine.ts`.
There is currently no automated test command. These checks do not establish
successful real-video inference. See [current status](docs/STATUS.md).

### Model & WASM assets

The MediaPipe pose model and vision WASM runtime are vendored under `public/`
so the app has **no runtime dependency on any third-party CDN**:

- `public/models/pose_landmarker_full.task`
- `public/wasm/*`

If you upgrade `@mediapipe/tasks-vision`, refresh the WASM files:

```bash
# from the project root
cp node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/
```

## Privacy

The inspected processing path keeps selected videos on the device. There is no
backend, analytics service, or account system. The page loads external fonts;
local inference does not imply that the page makes no network requests. Any
future upload/storage behavior needs an explicit privacy decision.

## Build status

The first milestone is partly implemented in the prototype and has not yet
passed real-video acceptance. Documentation and specification review come first.

1. Establish a reproducible environment and verify one real bench-press clip with an
   aligned overlay, bounded failures, input validation, and appropriate tests.
2. Evaluate that workflow on a real phone using a small mobile prototype.
3. Build reliable bench-press repetition detection and evidence-backed measurements
   in separately specified, evaluated increments.
4. Add saved sessions and comparisons when their requirements are established.

Other lifts, additional views, and multi-camera fusion remain outside the initial
scope. No accuracy scores, benchmark results, or production-readiness claims have
been established.
