# GymBro AI

**GymBro AI — Your second set of eyes.**

GymBro AI is being developed as an evidence-backed strength-training video
analysis product. The initial scope is **one uploaded side-view barbell
bench-press video**.

The existing browser prototype contains local video selection, MediaPipe pose
estimation, and a skeleton overlay with playback controls. Repetition detection,
depth/tempo findings, saved sessions, and comparisons are not yet
implemented. Real-video acceptance and mobile performance remain to be verified.
The player now includes estimated left/right 2D elbow-angle traces, explicit
unavailable reasons, observation timestamps, and sample navigation. These are
image-space measurements, not validated bench biomechanics or technique findings.
The UI offers only the supported workflow: one side-view bench-press MP4, with
recording guidance and no exercise or camera-angle choices. Legacy multi-lift code
remains in the source but is not rendered.

Processing currently happens on-device using WebAssembly/WebGL. Choosing a local
video does not upload it to a server. An installed mobile app is the intended
release direction; a Capacitor prototype is planned for evaluation after the
initial pipeline is demonstrated. No mobile project or backend exists yet.

## Project context and development

- [Current handoff](docs/HANDOFF.md): start here in Claude Code or Codex; includes the exact test baseline and next task.
- [AGENTS.md](AGENTS.md): working agreements and directory guidance.
- [Original product brief](docs/PRODUCT_BRIEF.md): preserved user requirements.
- [Accepted decisions](docs/DECISIONS.md): later clarifications and deferred work.
- [Current status](docs/STATUS.md): implementation facts, verification limits, and next task.
- [Architecture](docs/ARCHITECTURE.md): existing data flow and intended boundaries.
- [Workflow](docs/WORKFLOW.md): Elephant-Goldfish specification review and critical code review.
- [First-milestone specification](spec.md): proposed scope and acceptance criteria; not implementation approval.
- [Implementation plan](docs/superpowers/plans/2026-11-02-video-landmarks.md): four proposed deliverables, file/interface boundaries, tests, and the real-video acceptance prerequisite.

## Continue in a new session

Work continues in Claude Code or Codex, whichever has more remaining usage; the
Markdown documents are the only handoff, so no chat history or plugin is needed.
`AGENTS.md` holds the shared rules. Codex reads it directly; in Claude Code each
maintained directory's `CLAUDE.md` imports the adjacent rules with `@AGENTS.md`.
Folder READMEs explain responsibilities without duplicating the project context.

Paste this as the first message in either tool:

```text
Read AGENTS.md and docs/HANDOFF.md, then the relevant project instructions.
Follow the "First response in a new session" section: explain the next step,
why it exists and its alternative, ask "Is this clear?", and wait before acting.
Preserve all existing modified and untracked work.
```

In Claude Code, `/context` lists the loaded instruction files. Instruction-loading
reference: [Claude Code memory documentation](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools).

## Stack

- **Vite + React + TypeScript**
- **@mediapipe/tasks-vision** `PoseLandmarker` — produces normalized landmarks
  for the overlay and inferred world landmarks. These are estimates, not
  measured ground-truth biomechanics. GPU initialization with CPU fallback.
- **Tailwind CSS + Framer Motion** for the animated, dark athletic-tech UI
- **Recharts** for metric visualizations
- **Zustand** for state

## Architecture

The repository layout, per-file responsibilities, and the pose engine's lifecycle
and time contracts are maintained in one place:
[ARCHITECTURE.md](docs/ARCHITECTURE.md#repository-layout). In short, `src/core/`
holds media and pose processing, `src/components/` the React interface,
`src/store/` session state, and `src/types/` shared data contracts.

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
and `npm run build` pass as of 2026-11-02.
These checks do not establish successful real-video inference. See
[current status](docs/STATUS.md).

### Automated tests

```bash
npm test
```

Vitest runs `src/**/*.test.{ts,tsx}` once using jsdom's simulated browser
objects and the app's existing Vite settings, including the `@` source alias.
All 287 tests pass: 40 elbow-measurement cases, 9 timeline component cases,
58 media-helper cases, 55 pose-engine contract cases, 22
selection-check cases, 12 session-store cases, 11 dropzone component cases, and
56 pure display-calculation cases, 10 overlay cases, and 14 player cases.
See [current status](docs/STATUS.md) for exact results. The canvas uses bounded
display sampling and video-content geometry. Player tests cover seeks, playback
failures, source replacement, leases, and accessible control state. These simulated
checks do not establish actual browser alignment or bench-press landmark accuracy.
Metadata-helper tests cover already-available details, event-driven loading,
unknown-duration recovery, invalid loaded values, one deadline under repeated
events, cancellation, media errors, and listener cleanup on terminal paths.
Seek-helper tests also cover already-current frames, seek completion versus
frame readiness, browser-reported times, failures, and resource cleanup.
Unknown-duration tests cover a single recovery attempt, original-position
restoration, one shared deadline, cancellation, and cleanup. Success confirms
restoration has finished. Failure requests restoration best-effort and returns
promptly; the caller still owns the underlying video's teardown.
Engine tests cover metadata limits before model loading, one shared
initialization budget with GPU-to-CPU fallback, late-model disposal, busy
rejection, seek and total deadlines, cancellation, forward-only sample times, and
copied, validated landmarks. The engine uses the `src/core/video.ts` helpers.
Store tests drive the real engine with a mocked SDK and cover one-clip admission,
selection rejection before any URL is created, cancellation on removal/reset,
blocked admission until cleanup, ignored late callbacks, no-pose versus typed
failure, and URL leases revoked exactly once.
An empty suite exits 1 rather than appearing to pass.
jsdom does not decode real videos or establish MediaPipe inference accuracy;
real-browser checks remain part of the later milestone acceptance.

### Model & WASM assets

The MediaPipe pose model and vision WASM runtime are vendored under `public/`
so the app has **no runtime dependency on any third-party CDN**:

- `public/models/pose_landmarker_full.task`
- `public/wasm/*`

`@mediapipe/tasks-vision` is pinned to exactly **0.10.35**, and the six files in
`public/wasm/` are byte-identical to that package's `wasm/` folder (checked
2026-11-02). To upgrade, change the pinned version, reinstall, and refresh the
runtime copy in the same reviewed change:

```bash
# from the project root
cp node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/
```

Vite publishes everything in `public/` unchanged, so that folder holds no
Markdown; its rules are in [AGENTS.md](AGENTS.md#static-files-in-public).

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
