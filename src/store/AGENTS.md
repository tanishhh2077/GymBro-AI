# Session state and media lifecycle

Inherit [source guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- Own clip state, processing orchestration, cancellation, and resource ownership
  here. Keep pose algorithms and form interpretation in the processing layer.
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
- Retain missingness and quality information from processing rather than reducing
  it to a ready/error boolean or an arbitrary quality score.
