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
- Reuse the existing pipeline before adding infrastructure. Backend services
  and persistence remain deferred. D-022 now authorizes bounded mobile prototypes;
  consult the mobile design/plan before native integration work.
- D-030 authorizes Task 14's separate manual workout contracts, local IndexedDB
  repository/store and Home/log/history UI. Cloud/accounts and media persistence
  remain deferred; keep workout entries separate from bench-analysis IDs/types.
- D-034 adds local saved routines and separate planned targets in document schema2.
  Preserve strict legacy reads without writes/size growth, atomic revision checks
  and actual-set counts. New routine workouts copy fresh IDs/order/unit/targets.
- D-037 adds readonly progress views derived from validated completed history.
  Keep exact name/unit groups and source-set identity with every record.
- Keep uncertainty and missing observations visible through every layer. A
  rendered skeleton does not establish measurement accuracy or good lifting form.
- The legacy multi-lift, multi-angle and score declarations were removed (D-028).
  Do not reintroduce them without an accepted decision beyond the agreed milestone.
- Put concise local `AGENTS.md` guidance in each new authored source directory.
  D-033 additionally permits a root-mounted manual active-workout rest timer,
  separate from saved records and analysis; use its bounded design/plan.
  Do not add guidance inside dependencies, build output, or generated caches.
- Task 5 adds a separate, explicitly limited image-space measurement layer under
  D-021 while Task 4 acceptance stays incomplete; consult its design/plan.
