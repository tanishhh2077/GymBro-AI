# Feature designs

[Non-human browser checks](2026-11-04-browser-smoke-design.md) defines Task 13
(D-029), making real-decoder/no-person checks repeatable locally and in hosted
CI while phone and bench acceptance wait. No private footage enters this suite.

[Observed processing time](2026-11-04-processing-time-design.md) defines completed
Task 10 (D-026): one completed run's admission-to-result time shown as a
neutral badge. It is a single-device observation, not a benchmark.

[Clip elbow summary](2026-11-04-elbow-summary-design.md) defines completed Task9's
observed counts/extrema and evidence jumps. It extends Task5 without rep detection
or a validated range-of-motion claim; D-025 records the PC-development scope.

[Mobile prototype](2026-11-03-mobile-prototype-design.md) defines Task 6:
both native platforms, iPhone first, reusing the current local pipeline. Native
build/startup checks pass; physical-device/video validation remains a separate
gate. See [HANDOFF.md](../../HANDOFF.md) for current integration evidence.

[Elbow-angle timeline](2026-11-03-elbow-timeline-design.md) defines the first
post-pipeline measurement feature. The original milestone remains in
[spec.md](../../../spec.md); its missing bench-video acceptance is not erased.
