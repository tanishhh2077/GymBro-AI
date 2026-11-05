# Task15: manual active-workout rest timer

## Source and bounded result

Q5 requested rest timers. After Q9 the user explicitly said "Clear bro now work";
D-033 selects this next slice. Use existing React/TypeScript and UI tokens, add
no dependency. Initial90-second duration and30/60/90/120/180/300-second presets are
builder defaults, not exercise advice. Q8/Q9 define future guest/optional sync
and workout-only contents; this task implements neither accounts nor sync.

The timer exists only while a saved active workout exists. Mount it once in root
App, keyed by workout ID, outside conditional screen content. It stays visible
on Home, Workout, history and Analyze while that workout exists. Starting/logging
a set does not automatically start it. Finishing/discarding successfully removes
it; failed saves do not. A new workout gets a fresh idle90-second timer.

## Timing and actions

`WorkoutRestTimer` is a focused component with local React state, no IndexedDB,
session storage, global store or schema change. States: idle, running, paused;
completion is derived when remaining time reaches0. The selected duration is
disabled while running/paused; reset unlocks it. Completed timers can choose a
duration or start again. Reset returns to the full selected duration without
starting. Pause preserves milliseconds; resume uses the remaining portion.

Store an absolute Date.now() finish time. Display max(0, finish-now), bounded by
the selected duration, rounded up to whole seconds as m:ss. Recompute from the
clock on an approximately1-second interval and immediately on window focus or
document visibility changes. Never subtract one second per callback: browsers
delay timers in the background. Pause takes a fresh clock reading, not the last
render. Clear every interval/listener on pause, expiry and unmount. A system-clock
change may affect this first version; no stopwatch-grade claim.

Reload/restart resets the timer; workout records remain separately durable.
State this visible limitation and that completion appears in-app without a
background alert. No sound, notification permission, native plugin, automatic
start, reload persistence, cloud/media/network change or physical-phone claim.

## Interface and acceptance

Use existing card/button styles; no theme redesign. A labelled Rest timer region,
duration select and clear Start/Pause/Resume/Reset actions must fit390px. Give the
remaining-time output an accessible name without announcing each second; a
separate polite status announces resting/paused/completed. No focus stealing.

React tests use the real component and controlled clock: initial/manual start,
presets, delayed callbacks, visibility catch-up, sub-second pause/resume, expiry,
reset/duration rules and interval/listener cleanup including StrictMode. App tests
cover navigation survival, workout finish/discard/new ID and failed-save retention.
Add a real Chromium clock-driven synthetic-workout flow for navigation, completion,
reload reset and390px overflow, preserving all13 existing browser cases. No human
data/captures/uploads. Unit tests are not evidence of physical-iPhone timing.

Clean environment/baseline before feature code; test-first, full tests/lint/build
before each green commit. Guarded mobile sync verifies bundle copies, not native
timing. Fresh read-only whole-feature review after implementation; fix supported
findings and record exact evidence before reviewed master integration under D-018.
