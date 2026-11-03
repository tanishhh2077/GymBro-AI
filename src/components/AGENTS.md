# Interface components

Inherit [source guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- Components present inputs and results; keep pose processing and measurement
  algorithms outside React rendering and event handlers.
- Present the active side-view bench-press milestone honestly. Existing exercise
  and angle choices do not establish implemented analysis capabilities.
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
