# Non-human browser checks

Read [test rules](../AGENTS.md). Own a strict loopback test server; never reuse
or stop the user's servers. Use event/state waits and final media assertions.
Do not fake decoding, MediaPipe, frames or successful positive detections.
Fixed fixture checksums must pass before inference. No private-video options,
page/media/pose attachments, traces, retained test output or CI artifact uploads.
Playwright can create transient error/source diagnostic attachments on failures;
`preserveOutput: 'never'` removes them afterward. Last-run metadata may remain.
Store inspection is allowed through existing dev modules; no production globals.
Report browser/version/delegate and evidence limits without treating them as a
benchmark. Pattern no-pose output cannot complete milestone-one acceptance.
