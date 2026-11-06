# Feature designs

[Set-linked analysis](2026-11-05-set-linked-analysis-design.md) defines Task19
under D-039: bench-set identification, session-only three-ID links, deleted-set
detachment and wrong-link protection. Its design and code reviews sit alongside.

[Workout backup](2026-11-05-workout-backup-design.md) defines Task18 under D-038,
with bounded JSON export/import, additive ID merges and atomic confirmation.
Its fresh design/code reviews and implementation evidence are recorded alongside.

[Workout progress](2026-11-05-workout-progress-design.md) defines Task17 under
D-037. Exact exercise/unit groups supply completed-set personal records,
finish-order charts and source-workout links. Its
[design review](2026-11-05-workout-progress-design-review.md) and
[code review](2026-11-05-workout-progress-code-review.md) found no significant issues.

[Saved workout routines](2026-11-05-saved-routines-design.md) defines completed
Task 16 (D-034): local named routines with optional set/rep targets that start
fresh workouts with no actual sets, stored as schema 2 in the same IndexedDB
document. Its [design review](2026-11-05-saved-routines-design-review.md) found
no findings and its [code review](2026-11-05-saved-routines-code-review.md) found
no significant findings.

[Manual rest timer](2026-11-04-rest-timer-design.md) defines completed Task 15
(D-033): a session-only timer kept apart from saved workout and media data. See
its [code review](2026-11-05-rest-timer-code-review.md).

[Local workout logging/Home](2026-11-04-workout-logging-design.md) defines Task14,
with accepted direction in PRODUCT_DIRECTION/D-030 and fresh design/code reviews.
This slice is separate from the remaining tracking wishlist and live-analysis goal.

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
