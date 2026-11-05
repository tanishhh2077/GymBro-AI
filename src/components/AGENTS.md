# Interface components

Inherit [source guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- Components present inputs and results; keep pose processing and measurement
  algorithms outside React rendering and event handlers.
- Present the active side-view bench-press milestone honestly. Do not add
  exercise or view choices that imply unimplemented analysis capabilities.
- Align overlays with the video's displayed image, accounting for aspect ratio,
  letterboxing, resizing, and orientation. Use media time when playing or seeking.
- Clear stale overlays when clips change or observations are unavailable. Treat
  interpolation as a display estimate; do not show it as an observed pose.
- Distinguish loading, processing, invalid input, no detected pose, insufficient
  evidence, cancellation, and successful output in understandable language.
- Explain filming requirements and visible limitations before interpretation.
  Pose coverage is not a form-quality score or proof of biomechanical accuracy.
- Describe upload selection as local processing while that remains true.
- Give controls accessible names, keyboard operation, and visible focus. Do not
  communicate status or uncertainty through color alone.
- D-030 adds Home and manual workout logging/history. Logging names are separate
  from the bench-only analysis scope. Keep storage failure, unsaved inputs, units,
  confirmation for destructive workout actions, and actual saved status clear.
- D-033 adds an active-workout-ID-keyed, root-mounted manual rest timer. Retain
  time across navigation, use clock deadlines, release handlers and state the
  reload/in-app-completion limits. Do not imply background notifications.
- D-034 adds local routine CRUD/editor and planned targets. Capture source and
  opening revision together; preserve failed drafts and reject stale edits after
  reload. Keep targets visibly separate from actual-set rows/counts and retain
  active workout/timer/analysis when templates change. Confirm saved-routine deletion.
