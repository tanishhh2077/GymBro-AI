# Interface components

- `ClipDropzone.tsx`: local file selection and drop area. It applies
  `validateSelection`, hands one file to `onSelect`, shows rejections in a named
  alert, blocks every input path while `disabled` (showing `disabledMessage`), and
  claims file drags anywhere on the page while mounted. Tested in
  `ClipDropzone.test.tsx` (11 cases, React `createRoot`/`act` in jsdom).
- `ExercisePicker.tsx`: legacy exercise/view controls, no longer rendered.
- `VideoStage.tsx`: player and playback controls. It leases the clip's URL from
  the store while mounted (`retainMedia` prop), sets the video source in an effect,
  shows kind-specific failures, and keeps no-pose clips replayable with a notice.
- `SkeletonOverlay.tsx`: canvas overlay.
- `poseDisplay.ts`: pure sampling, drawing eligibility, and centered video-content
  geometry. Its 56 tests cover missing samples, bounded interpolation/endpoint
  holds, unknown visibility, input preservation, and CSS-pixel letterboxing.
- `icons.tsx`: shared interface icons.

Task 3 Steps 1–2 are complete: the pure helpers are tested, but the existing
overlay does not use them yet. Wiring, coverage labels, and playback/accessibility
are next. VideoStage and SkeletonOverlay have no component tests yet; existing
rendering is not verified by the helper tests.
Follow [local rules](AGENTS.md) and [current scope](../../docs/HANDOFF.md).
Processing belongs in [core](../core/README.md).
