# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root/scoped `AGENTS.md` first.
Follow D-024, briefly explain and proceed. Follow D-036, update docs at task end
or tool handover. Detailed history is in [STATUS.md](STATUS.md).

## Completed Task18

Backup and restore is implemented under D-038. Home exports validated history,
routines and the active workout as a JSON file. Restore previews additions,
skips identical IDs and rejects conflicts before an atomic save. Previews expire
on load/source changes. The builder chose additive merges, format version 1,
4 MiB admission and retained OS-managed successful-share cache files.

- Reviewed source 070988e passes 562 tests in 34 files, lint, build and guarded
  mobile sync. The original checkout passes all 22 Chromium cases in 4.4 minutes
  and sequential tests/lint/build. Fresh code review passes 75 tests in 8 files with
  no unresolved significant findings. Design/plan/reviews are in superpowers.
- Feature browser 42134699804/native 42134699316 and master browser 42136735021/
  native 42136734990 all pass. Native evidence covers Android/iOS compilation
  and visible iPhone 17 Pro/iOS 26.4 startup with three plugins. Actual device
  picker/share saving remains a phone-session requirement.
- One initial browser video case timed out during live edits, with cause
  unconfirmed. Frozen-source local/hosted runs pass. Original parallel checks
  hit a test-output-directory race and one five-second unit timeout, then sequential
  checks pass. The build reports a 502.21 kB entry-chunk advisory.
- Original GymBro AI is the only worktree. All branches are retained, Task4 is
  unmerged. Synthetic previews/script are preserved in ignored
  build/visual-review/task18, hash-checked. Owned 4183 preview is stopped.
- Prior tracking features include manual workouts/history, saved routines,
  session rest timer and Progress/records. Video analysis remains the existing
  local side-view pose/elbow workflow. Read STATUS for historical evidence.

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
