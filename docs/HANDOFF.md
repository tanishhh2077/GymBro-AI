# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. Follow D-036, update docs at task end
or tool handover. Detailed history is in [STATUS.md](STATUS.md).

## Completed Task19

Set-linked bench-press analysis is implemented under D-039 (Claude Code, Opus 5.5).
Bench-press set rows in the workout editor and history detail offer **Analyze video
for set N**. Analyze shows that set with the user's entered reps and weight,
links the next video to it, and offers **Back to set**, which focuses the row.
Standalone analysis is unchanged.

- A link is the workout, exercise and set IDs, copied onto the clip at admission.
  Bench sets are an exact list of flat-barbell names. Links are session-only:
  reload or app close ends them, and nothing is saved, backed up or uploaded.
- If the set, exercise or workout disappears, App detaches the link on any
  screen and the clip keeps a permanent "no longer linked" notice, so a restore
  cannot relink it. Finishing a workout keeps the link (history detail).
- Final source `e50b144`: 597 tests in 36 files, lint, build, guarded sync and all
  23 Chromium cases pass. Fresh design review (2 Medium, 5 Low) and code review
  (5 Low) were adopted. Hosted [browser 42152162079](https://github.com/tanishhh2077/GymBro-AI/actions/runs/42152162079)
  and [native 42152161985](https://github.com/tanishhh2077/GymBro-AI/actions/runs/42152161985)
  (shared checks, Android APK, iOS simulator startup) pass on `e50b144`; the
  earlier `eab39bd` native run was cancelled by the newer push. No package
  download or physical-device validation.
- Synthetic previews are in the original checkout's ignored
  `build/visual-review/task19/`. Task18's backup/restore and earlier tracking
  features are unchanged; see STATUS for their history.

## Next work

No further bounded implementation task has been selected. Continue with the
phone session when the user is present, Q&A from Q10 when requested, or the next
feature approved by the user. Q&A uses one MCQ at a time, with a recommendation
and reason. Optional accounts/workout-record sync, saving analysis results with a set, and
live analysis remain future work. Q1–Q9 are in PRODUCT_DIRECTION.

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
prepend it to PATH and confirm `node -v`. Preserve global Node 20. Run full tests,
lint and build before each commit. GitHub default is master. No branch deletion,
force push, attribution trailers or settings changes. Leave unrelated 5173
listeners alone. Raw media stays outside the project and captures/uploads remain
disabled in the browser-test harness.
