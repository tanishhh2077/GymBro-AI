# Interface components

Task 14: root App now owns provisional Home/Workout/Analyze navigation and keeps
the native lifecycle registration mounted. `AnalysisWorkspace.tsx` contains the
previous video UI. `WorkoutHome.tsx` presents equal entry actions, real counters
and recent history; `WorkoutEditor.tsx` logs/edits manual sets with per-workout
units and confirmations; `WorkoutHistory.tsx` reopens/deletes finished records.
The repository commit completes before saved rows/notifications appear. Root
storage errors/reload remain visible even when standalone analysis is open.

`WorkoutRestTimer.tsx` (Task15/D-033) mounts once per active workout ID in root
App, so screen navigation retains it and successful finish/discard removes it.
Manual presets/start/pause/resume/reset use a Date.now deadline, not callback
counts. Interval/focus/visibility handlers clean up on pause/expiry/unmount.
Session-only: reload/restart resets the timer; completion appears in-app without
a background notification. No saved-workout schema, media or native API changes.

Task16 adds `WorkoutRoutines.tsx` and `RoutineEditor.tsx`: named local templates,
ordered exercise rows, independent optional numeric targets and CRUD/start actions.
App adds Routines navigation plus Home Manage routines. Editor captures its source
routine and expected revision together at open, preserves failed inputs, and
requires reopening after a stale-editor reload. Saving/deleting is confirmed by
the repository before success UI; deletion requires confirmation. WorkoutEditor
shows copied targets above actual sets; template edits cannot rewrite snapshots.

Task17 adds `WorkoutProgress.tsx` through Home's View progress. It selects exact
exercise/unit groups, displays heaviest and most-reps actual sets, and links back
to their saved workouts. History and per-weight rep-record tables begin with 20
rows each. Group/revision changes reset paging. `WorkoutProgressChart.tsx` draws
an accessible SVG with readable HTML axes and a visible single-workout marker.
Completed workouts are evenly spaced in finish order. The existing root timer
keeps its state through Progress navigation.

- `ClipDropzone.tsx`: local file selection and drop area. It applies
  `validateSelection`, hands one file to `onSelect`, shows rejections in a named
  alert, blocks every input path while `disabled` (showing `disabledMessage`), and
  claims file drags anywhere on the page while mounted. Tested in
  `ClipDropzone.test.tsx` (11 cases, React `createRoot`/`act` in jsdom).
- `VideoStage.tsx`: player and playback controls. It leases the clip's URL from
  the store while mounted (`retainMedia` prop), sets the video source in an effect,
  shows kind-specific failures, and keeps no-pose clips replayable with a persistent
  live region. Seek events synchronize controls; rejected play/restart requests
  show retry guidance. Source identity resets player state. A completed clip
  with `processingMs` adds the badge "Processing took N seconds on this device"
  (one decimal; no badge or placeholder when absent; Task 10, D-026). Its 18
  tests cover these behaviors, selected speed, finite duration, and StrictMode
  lease cleanup.
- `ElbowTimeline.tsx`: versioned raw-observation angle series from `core/elbowAngles`,
  independent left/right estimates, unavailable reasons, gap-separated SVG lines,
  and previous/next measured-sample navigation through the player's existing seek
  handler. Twelve component tests plus two added player integration cases cover
  synthetic geometry, paused seeks, no-pose output, malformed input, and source
  reset. No new media resources, timers, persistence, or technique verdicts.
- `ElbowSummaryPanel.tsx`: Task9's per-side measurable counts and lowest/highest
  observed angle buttons call the existing player seek callback. Nine component
  cases cover missing/empty sides, endpoint values, raw timestamps and replacement.
  The parent derives summary/series once per pose and retains its invalid-result
  fallback. Visible value/time descriptions are associated with each action for
  screen readers, with unique IDs per panel. The UI explains tracking-error and
  per-rep ROM limits.
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
