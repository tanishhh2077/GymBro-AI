# Non-human browser checks

Read [test rules](../AGENTS.md). Own a strict loopback test server; never reuse
or stop the user's servers. Use event/state waits and final media assertions.
Do not fake decoding, MediaPipe, frames or successful positive detections.
Fixed fixture checksums must pass before inference. No private-video options,
captures, attachments, traces, retained output or CI artifact uploads.
Store inspection is allowed through existing dev modules; no production globals.
Report browser/version/delegate and evidence limits without treating them as a
benchmark. Pattern no-pose output cannot complete milestone-one acceptance.
