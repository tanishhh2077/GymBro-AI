# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. Follow D-036, update docs at task end
or tool handover. Root Development pace now sets focused checks, lightweight
planning and risk-based independent review. Detailed history is in [STATUS.md](STATUS.md).

## Completed Task21

Workout convenience is implemented under D-040 on
`feat/task21-workout-convenience` by Codex (runtime model ID unavailable).

- Previous workout shows the latest completed session before the active workout
  began, matching exact exercise names and units. **Use values** fills editable
  fields. **Repeat last set** logs a fresh actual set without replacing a draft.
- **Start rest automatically after logging a set** is opt-in per workout. New
  set saves restart the full selected duration. Edits/removals do not restart it.
  Navigation retains timer state; reload/new workouts reset the timer and option.
- Local checks pass 612 tests in 37 files, lint, build, guarded native sync
  (13 files per platform, 3 plugins) and all 24 Chromium cases in 3.7 minutes.
  The new flow fits 390 px. Ordinary UI/helper changes were self-reviewed.
- The production build reports a 509.51 kB main-chunk advisory. Physical iPhone
  behavior remains unverified. See GitHub Actions for hosted results on the
  integrated commit. Task19's completed session-only set links and earlier
  feature evidence are recorded in STATUS.

## Next work

Q13's workout-convenience slice is complete. The next recommended feature is
Q12's searchable exercise catalog plus custom entries. Q11 selects system-following
light/dark mode with an override. Q10 selects familiar Hevy-style flows with
GymBro's own design. See PRODUCT_DIRECTION for all 13 answers.

An existing `feat/task20-faster-start` branch contains on-demand video-analysis
loading (`8b336f4` observed). Check its current ownership/integration before
assigning another task number. Phone testing needs the user present. Accounts/sync, persisted analysis
results and live analysis remain future work.

The old master browser run 41985529794 failed at input-validation.spec.ts:53.
Cause remains unknown. The same case passes locally and in both new hosted runs
(1.3 seconds hosted). No repeat-triggered fix was made. A future observed repeat
requires a reproducing test, including checking keyboard focus, before a fix.

## Phone and video boundaries

- The user will provide hotspot/video later. iPhone 12 Pro Max, reported iOS 26.5.2,
  no Android phone, paid Apple Developer membership or owned Mac.
- Use the reviewed phone plan only with the user present. Agree a trusted private
  connection, re-detect the PC address, and bind 5195/5196 to that address.
  Settings changes require coordination. Physical Safari/native tests remain open.
- The app must feel smooth and responsive. Record scrolling, screen changes,
  playback and video-processing feel/timings on the phone. Any native/React Native
  migration requires a separate decision.
- Private bench videos exist outside the repository. Never upload/commit footage,
  frames or pose traces. D-035's any-view bench direction requires its own design
  and per-view validation. Current analysis remains side-view pose/elbow
  observations. Real-bench accuracy and phone performance remain unverified.

## Environment

Select installed Node 22.23.2 per process from `%LOCALAPPDATA%\nvm\v22.23.2`,
prepend it to PATH and confirm `node -v`. Preserve global Node 20. Use focused
checks during work and full tests, lint and build at code-feature completion.
GitHub default is master. No branch deletion,
force push, attribution trailers or settings changes. Leave unrelated 5173
listeners alone. Raw media stays outside the project and captures/uploads remain
disabled in the browser-test harness.
