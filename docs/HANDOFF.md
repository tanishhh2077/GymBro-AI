# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. Follow D-036, update docs at task end
or tool handover. Root Development pace now sets focused checks, lightweight
planning and risk-based independent review. Detailed history is in [STATUS.md](STATUS.md).

## Completed Task23

Appearance is implemented under D-042 on `feat/task23-appearance` by Codex
(runtime model ID unavailable). Home offers **Appearance** with System/Light/Dark.
System follows live device changes. The choice is stored on the device, with an
honest session-only fallback when preference storage is unavailable.

- Shared colors cover tracking, the exercise library, charts and video controls.
  A fresh read-only review found one loaded-analysis contrast issue; it was
  reproduced and corrected. The final code passes 629 tests / 39 files, lint,
  build, guarded sync (13 files/platform, 3 plugins) and all 28 Chromium cases.
  Both themes and 390 px layouts were visually inspected with synthetic data.
- Task22's 57-entry searchable library, saved custom-name reuse and Task21's
  previous values/repeat/auto-rest are complete. Their evidence is in STATUS.
  Task22's c1de9c6 hosted runs 42167023244 and 42167023234 both pass.
- The entry chunk is 519.13 kB. Physical iPhone behavior and real-bench accuracy
  require their own tests. Check Actions for hosted results on the latest commit.

## Next work

The user authorized continuing through the accepted tasks. Next is reviewing and
integrating the committed Task20 on-demand analysis loading with the newer
tracking/appearance changes. Keep its separate worktree's work intact. Q10
selects familiar Hevy-style flows with GymBro's own design. See PRODUCT_DIRECTION
for all 13 answers.

An existing `feat/task20-faster-start` branch contains on-demand video-analysis
loading (`8b336f4` observed). Check its current ownership/integration before
assigning another task number. Phone testing needs the user present. Accounts/sync, persisted analysis
results and live analysis remain future work.

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
