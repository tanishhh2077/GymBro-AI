# Session state and media lifecycle

Inherit [source guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- Own clip state, processing orchestration, cancellation, and resource ownership
  here. Keep pose algorithms and form interpretation in the processing layer.
- D-042 permits `useAppearance` to store the device's System/Light/Dark choice
  under its own localStorage key. Keep preference failures independent of workout
  recovery and release its media-query listener and document changes on unmount.
- Task18 restore uses the existing library transaction and destination revision.
  Reject stale previews and conflicts before writing. Identical imports are no-ops.
- D-044 permits an account-namespaced IndexedDB library with an atomic shared
  sync baseline in the same object store. Remote failures permit local logging.
  An uncertain local commit requires reload. Preserve guest/account isolation
  and require preview revisions plus explicit choices for concurrent conflicts.
- Coordinate access to a shared pose engine; do not let independent clip jobs
  interleave tracker state or violate the detector's timestamp requirements.
- Cancel work when its clip is removed, replaced, or the session resets. Ignore
  late progress/results from an old job so they cannot overwrite newer state.
- Give every processing path a clear terminal outcome; stalled metadata or seek
  events must not leave a clip processing indefinitely.
- Pair each object URL with cleanup after its consumers and processing finish.
  Revoking a URL is not a substitute for canceling the job that uses it.
- Clear stale errors, progress, and results when beginning a replacement job.
- State is currently in memory on the device. Do not add storage, server transfer,
  accounts, or persistence implicitly; those boundaries remain deferred.
- Exception D-030: the separate workout repository/store persists validated manual
  workout records locally, with atomic revision checks and save-before-state
  updates. Keep the pose session in memory; never persist clips, URLs or landmarks.
  Failed reads/writes/conflicts must preserve existing data and offer recovery.
- D-034 extends the same local document to schema2 routines. Never write during
  legacy normalization or add defaults that exceed the old size cap. Whole-
  routine editors retain their opening revision; starts copy fresh IDs/empty
  actual sets, with targets and units independent of later template edits.
- Retain missingness and quality information from processing rather than reducing
  it to a ready/error boolean or an arbitrary quality score.
