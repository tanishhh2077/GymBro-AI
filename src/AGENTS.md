# Application source

Inherit [root guidance](../AGENTS.md). Read the [product brief](../docs/PRODUCT_BRIEF.md)
with the approved amendments in [decisions](../docs/DECISIONS.md).

- The active milestone is one locally selected, standardized side-view barbell
  bench-press video with synchronized pose landmarks and useful failure handling.
- Keep React presentation in `components`, processing in `core`, session lifecycle
  in `store`, and shared data contracts in `types`.
- Keep three concepts separate: observations are model outputs; measurements are
  quantities calculated from observations; findings interpret those measurements.
- The existing pipeline runs on the device. Selecting an uploaded file currently
  creates local access to it; it does not transfer the video to a server.
- Reuse the existing pipeline before adding infrastructure. Backend services,
  and persistence remain deferred. D-022 now authorizes bounded mobile prototypes;
  consult the mobile design/plan before native integration work.
- Keep uncertainty and missing observations visible through every layer. A
  rendered skeleton does not establish measurement accuracy or good lifting form.
- Existing multi-lift, multi-angle, and score declarations are legacy scaffolding,
  not permission to activate features beyond the agreed milestone.
- Put concise local `AGENTS.md` guidance in each new authored source directory.
  Do not add guidance inside dependencies, build output, or generated caches.
- Task 5 adds a separate, explicitly limited image-space measurement layer under
  D-021 while Task 4 acceptance stays incomplete; consult its design/plan.
