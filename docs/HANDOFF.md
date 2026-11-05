# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. Follow D-036, update docs at task end
or tool handover. Detailed history is in [STATUS.md](STATUS.md).

## Completed Task17

Workout Progress and personal records are implemented, reviewed and integrated
under D-037. Home's View progress opens exact exercise/unit groups, heaviest-set
and most-reps summaries, a load chart, per-weight rep records and saved-workout
links. Completed actual sets supply every metric. Deletion/reload recomputes
results. The root timer survives navigation. The builder selected the metric
definitions, exact name/unit grouping, evenly spaced finish-order chart and
20-row table paging.

- Reviewed source `22d694b` passes fresh design/code reviews. The code reviewer
  independently passed 86 tests in 7 files, with no significant findings.
- The original checkout passes 511 tests in 28 files, lint, build, guarded mobile
  sync and all 19 local Chromium cases. Phone/desktop synthetic previews were
  inspected at 390/1280 px, including a zero-load marker, with no overflow.
- Hosted feature runs 42125223775 and 42125223989 pass browser/native checks.
  Integrated master `3006feb` passes browser run 42127574129 and native
  run 42127573785, including Android compilation and visible iPhone 17 Pro/iOS 26.4
  simulator startup. Final documentation commits retain that runtime source.
- Master and the original Task8 branch preserve concurrent `b7e4b39` phone-speed
  requirements and `967b82e` lean-doc rules. Task17's decision is D-037, keeping
  the user's D-036 numbering. All branches are retained. Task4 stays unmerged.
- The clean temporary worktree was removed. This original `GymBro AI` checkout
  is the only worktree. Synthetic previews/script remain ignored under
  `build/visual-review/task17/`. The owned 4183 listener was verified and stopped.

## Next work

No further bounded implementation task has been selected. Continue with the
phone session when the user is present, Q&A from Q10 when requested, or the next
feature approved by the user. Q&A uses one MCQ at a time, with a recommendation
and reason. Optional accounts/workout-record sync, set-linked persistence and
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
