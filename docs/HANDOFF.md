# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. Follow D-036, update docs at task end
or tool handover. Root Development pace now sets focused checks, lightweight
planning and risk-based independent review. Detailed history is in [STATUS.md](STATUS.md).

## Completed Tasks22–24

Task24 (D-043) integrates the committed Task20 startup work with the later UI,
implemented by Codex (runtime model ID unavailable). Analyze loads its screen on
demand, with loading/reload recovery. MediaPipe loads when detector initialization
begins, within the existing deadline and abandonment rules.

- Entry JS drops from 519.13 to 245.39 kB (75.88 kB gzip). Production preview
  verifies staged local requests and cancellation recovery using only the
  checksummed no-person pattern. Phone startup timing is unmeasured.
- Final checks pass 635 tests / 41 files, lint, build, guarded sync
  (15 files/platform, 3 plugins) and all 28 Chromium cases. A fresh read-only
  review found no significant defects. See STATUS for exact evidence/limits.
- Task22 offers 57 bundled exercise names plus reusable exact saved names in
  workouts/routines. Task23 adds Home **Appearance** with System/Light/Dark,
  live system following and a device-local preference. Both are complete.
  Task23 f90ff1a hosted browser 42168918984 and native 42168918968 pass.
- Physical iPhone behavior and real-bench accuracy require their own tests.
  Check Actions for hosted results on the latest integrated commit.

## Next work

The accepted exercise-library, appearance and workout-convenience slices are
complete. Continue with the user-present phone session, Q&A from Q14, or a newly
approved feature. Accounts/sync, persisted analysis results and live analysis
need their own bounded decisions. Q1–Q13 are in PRODUCT_DIRECTION.

Task24 is the current startup implementation, ported from 8b336f4. The original
`feat/task20-faster-start` branch/worktree retains earlier implementation history.
Keep its separate work intact. The incomplete Task4 branch requires user approval
before integration. Retain branches unless the user agrees to deletion.

The recurring keyboard-admission failure was observed again in master run
42153259160 and reproduced in 5/25 local repeats. A new failing regression
confirmed late navigation focus could steal button focus. App now focuses
before paint. The browser test registers file-picker interception before the
focus round trip and asserts focus before Enter. Diagnostic traces also showed
an interception-event race with a correctly activated input. Final repeats pass
25/25. Temporary diagnostics are removed. See STATUS for the evidence and limits.

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
