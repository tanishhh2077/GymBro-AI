# GymBro AI current handoff

Updated 2026-11-05, America/Chicago. Read root and scoped `AGENTS.md` first.
Detailed historical verification belongs in [STATUS.md](STATUS.md).

## Current task and next action

Task17 adds workout Progress and personal records under D-037. The user said
"ok keep building the next things". Codex selected this slice from the accepted
tracking roadmap. D-024 applies. Briefly explain each meaningful step and proceed.
No routine understanding checkpoint is pending.

- Isolated worktree `GymBro AI-task17`, branch `feat/task17-workout-progress`,
  base `11bb3e3`. Original checkout `GymBro AI` is on
  `feat/task8-safari-phone-test`. It and master now include concurrent docs commit
  `b7e4b39`, which records the user's phone responsiveness requirement.
- Step1 is committed and pushed as `b8856df`. Step2 is committed and pushed as
  `22d694b`. Its hosted browser and native workflows pass.
- Fresh design and whole-feature code reviews found no significant issues.
  The code reviewer independently passed 86 tests in 7 files. Read the dated
  workout-progress design, plan and review records in `docs/superpowers/`.
- Latest local checks pass 511 tests in 28 files, lint, build, guarded mobile sync
  and all 19 Chromium browser cases. Synthetic previews were inspected at 390
  and 1280 px with no horizontal overflow, including a visible zero-load marker.
- Hosted browser run 42125223775 passes all 19 cases. Native run 42125223989
  passes shared checks, Android compilation and visible iOS simulator startup.
  The iPhone17 Pro/iOS26.4 screen-text check detected Home and View progress.
- Next fast-forward master and the original Task8 checkout, repeat original
  checkout checks and remove the clean temporary worktree. Preserve all branches
  and check for concurrent user/Claude work before integration.

Task16 routines are already reviewed and integrated. Its source is `4c1b519`.
Claude Code completed its integration, preserved Task8's history and handed over
at `6acc10e`. The user subsequently recorded any-view bench direction in
`11bb3e3`. Historical Task16 checks and branch integration are in STATUS.

## Implemented behavior

- Home gives equal Start workout and Analyze video actions, training totals,
  recent history, Manage routines and View progress.
- Local workouts support lb/kg, manual exercise names and actual sets, edits,
  reload/resume, finished history and confirmed deletion. IndexedDB revisions
  reject stale concurrent saves. Failed/unknown reads require recovery.
- Saved routines support CRUD, exercise order and independently optional set/rep
  targets. Starting copies fresh IDs into an empty-set workout. Existing active
  workouts and history retain their snapshots after template edits/deletion.
- Document schema 2 retains strict schema 1 reads without writing or enlarging
  legacy records. The next successful explicit save writes schema 2 with atomic
  revision and size checks. Database version remains 1.
- Progress derives completed actual sets by exact saved exercise name and unit.
  It shows heaviest set, most reps in a set, best reps at each entered weight,
  a heaviest-load chart and source-workout links. Deletion/reload recomputes
  results. Chart points are evenly spaced in finish order. Tables begin with
  20 rows. Metric definitions, grouping and chart spacing are builder choices.
- The manual rest timer is keyed by active workout ID and survives navigation.
  It resets on reload/restart or successful finish/discard. Completion is in-app.
- Video analysis remains local side-view bench video, pose playback/overlay,
  estimated 2D elbow traces/extrema and measured processing time. No rep or form
  verdict or validated bench-accuracy claim is implemented.

## Earlier hosted browser incident

Master run [41985529794](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41985529794)
failed at `tests/browser/input-validation.spec.ts:53`. Its keyboard-triggered
file-chooser event timed out. The other 16 cases passed. Cause remains unknown.
The user said they would start a rerun. The latest API check still shows attempt 1
and no new master run. Apply a test-first fix only after an observed repeat,
including an assertion that the button retains focus. Task17's local full run
passed this case in 770 ms, and hosted run 42125223775 passed it in 1.3 seconds.
The earlier cause remains unknown. The new source has passing browser evidence.

## Phone and private-video work

- The user will provide hotspot/video later. Coordinate the phone session only
  with them present. iPhone 12 Pro Max, reported iOS 26.5.2, no Android phone,
  no paid Apple Developer membership and no owned Mac.
- The phone app must feel smooth and responsive. During the session, record
  scrolling, screen changes, playback and video-processing feel and timings.
  If the Capacitor wrapper is too slow, native or React Native options require
  a separate decision. No framework switch has been approved.
- Follow the reviewed phone plan. Agree a trusted private connection, re-detect
  the PC address, and bind 5195/5196 only to that address. No LAN listener or
  physical Safari/native acceptance case has run. Coordinate settings actions.
- D-035 records future any-view bench analysis, including top/side/diagonal,
  with clips at most one minute. It requires its own design and per-view
  validation before code. Private bench videos now exist outside the repository.
  Never upload or commit footage, frames or pose traces.
- Task4 stays unmerged. Its trial merge conflicts in 16 files because Task13
  independently rebuilt browser tooling. Its human-fixture gate needs a separate
  reviewed task. Real-bench landmark quality and phone performance remain open.

## Remaining product direction

Q1–Q9 are recorded in PRODUCT_DIRECTION. Tracking and AI are equally central.
Post-recorded-video analysis comes first, with live analysis later. Guest use
and optional workout-record sync are accepted future directions. Accounts/sync
and set-linked analysis remain unimplemented. Videos stay local.
Q&A resumes at Q10 when requested, one MCQ at a time with a recommendation and
brief reason. It does not block currently authorized Task17 work.

## Environment and Git

- Select installed Node 22.23.2 per process by prepending
  `%LOCALAPPDATA%\nvm\v22.23.2` to PATH and confirm `node -v`. Preserve the global
  Node 20 selection. Run full tests, lint and build before every commit.
- GitHub default is master, changed by the user. Every older feature branch
  except Task4 is already inside master. Preserve all branches and Task4's
  incomplete history. No attribution trailers, force pushes or settings changes.
- The Task17 loopback preview on 127.0.0.1 port 4183 was stopped after verifying
  its PID and full command line. The unrelated `[::1]:5173` server remains.
  The old 5193 server is absent.
- Task17's synthetic previews/script are ignored under `build/visual-review/task17`
  and copied to the original checkout, with matching preview SHA-256 verified.
  Previous task previews remain there. Browser-test captures/uploads stay off.
