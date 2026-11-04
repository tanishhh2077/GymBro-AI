# Interface components

- `ClipDropzone.tsx`: local file selection and drop area. It applies
  `validateSelection`, hands one file to `onSelect`, shows rejections in a named
  alert, blocks every input path while `disabled` (showing `disabledMessage`), and
  claims file drags anywhere on the page while mounted. Tested in
  `ClipDropzone.test.tsx` (11 cases, React `createRoot`/`act` in jsdom).
- `ExercisePicker.tsx`: legacy exercise/view controls, no longer rendered.
- `VideoStage.tsx`: player and playback controls. It leases the clip's URL from
  the store while mounted (`retainMedia` prop), sets the video source in an effect,
  shows kind-specific failures, and keeps no-pose clips replayable with a persistent
  live region. Seek events synchronize controls; rejected play/restart requests
  show retry guidance. Source identity resets player state. Its 14 tests cover
  these behaviors, selected speed, finite duration, and StrictMode lease cleanup.
- `ElbowTimeline.tsx`: versioned raw-observation angle series from `core/elbowAngles`,
  independent left/right estimates, unavailable reasons, gap-separated SVG lines,
  and previous/next measured-sample navigation through the player's existing seek
  handler. Twelve component tests plus two added player integration cases cover
  synthetic geometry, paused seeks, no-pose output, malformed input, and source
  reset. No new media resources, timers, persistence, or technique verdicts.
- `ElbowSummaryPanel.tsx`: Task9's per-side measurable counts and lowest/highest
  observed angle buttons call the existing player seek callback. Seven component
  cases cover missing/empty sides, endpoint values, raw timestamps and replacement.
  The parent derives summary/series once per pose and retains its invalid-result
  fallback. The UI explains tracking-error and per-rep ROM limits.
- `SkeletonOverlay.tsx`: canvas overlay using `poseDisplay` at actual media time.
  It follows the video box and centered contain content, applies DPR once, clears
  missing/not-ready/seeking data, and animates only while playing. Its 10 tests
  check canvas calls, paused updates, portrait resize, and lifecycle cleanup.
- `poseDisplay.ts`: pure sampling, drawing eligibility, and centered video-content
  geometry. Its 56 tests cover missing samples, bounded interpolation/endpoint
  holds, unknown visibility, input preservation, and CSS-pixel letterboxing.
- `icons.tsx`: shared interface icons.

Task 3 is implemented, verified, and freshly reviewed. Sampling and detection badges use neutral wording
without source-frame-rate or form-quality claims. Component tests simulate media,
layout, and canvas calls. PC no-person and supplied-synthetic rendering checks are
recorded in STATUS; real bench acceptance remains Task4 and phone checks Task8.
Follow [local rules](AGENTS.md) and [current scope](../../docs/HANDOFF.md).
Processing belongs in [core](../core/README.md).
