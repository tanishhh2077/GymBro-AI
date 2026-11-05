# GymBro AI: current handoff

Updated 2026-11-05 (America/Chicago). Read root and scoped `AGENTS.md` files first.

## Transfer to Codex (2026-11-05)

The user moved the work from Claude Code to Codex. Claude Code (Opus 5.5) made no
code change after Task 16; its last commits are documentation only. State at
transfer:
- `master` and `feat/task8-safari-phone-test` are the same commit; GitHub's
  default branch is `master`. Work in this original checkout, on the Task 8
  branch for phone records or on a new branch from `master` for new tasks.
- Every task branch except Task 4 is fully inside master. Task 4 stays unmerged
  by design (below). Merged branches are kept until the user agrees to delete them.
- Open item 1: master's hosted browser run 41985529794 failed in one case,
  `input-validation.spec.ts:53` (file chooser not seen within 10 seconds). The
  user has not yet started the new run; when they do, read its result. A repeat
  failure gets a test-first fix that first asserts the button keeps focus.
- Open item 2: the phone session, with the user present. Open item 3: the Q&A at
  Q10 or a newly approved feature. No implementation task is approved now.
- Use process-local Node 22.23.2 and confirm `node -v` before checks.
- New direction, not built: [D-035](DECISIONS.md#d-035-bench-analysis-should-work-from-any-camera-view-direction-not-built).
  The user wants bench analysis from any view (top, side, diagonal), judged in
  that view's frame, with mistakes pointed out; videos stay at most one minute.
  It needs its own design and per-view validation before any code. The user now
  has bench videos; they live in a private folder **outside** this repository
  and are never committed or uploaded.

## Current task and next action

**Task 16, saved workout routines, is complete and integrated** ([D-034](DECISIONS.md#d-034-saved-workout-routines-with-fresh-actual-set-logging)).
The user approved the three proposed routine features with "Yes create all of
that". Codex built and reviewed the feature on `feat/task16-saved-routines` in a
temporary sibling worktree, starting from master `7d97ac6`. Codex then reached
its five-hour limit, the user moved the work to Claude Code, and Claude Code
(Opus 5.5) finished Step 3. The reviewed source is `4c1b519`; every later commit
changes Markdown only.

- Master was fast-forwarded from `7d97ac6` to `ac5e3fe`, Task 16's final
  documentation commit, and pushed.
- This original checkout (`GymBro AI`, branch `feat/task8-safari-phone-test`)
  merged that master with a merge commit, keeping both histories and this
  branch's Task 15 integration record. Every non-Markdown file equals master, and
  the merged checks pass: 494 tests in 26 files, lint, the build with the reviewed
  bundle names, the guarded mobile sync and all 17 local browser cases. One
  hosted browser run on master failed afterwards; see below.
- The clean temporary `GymBro AI-task16` worktree was removed with a normal Git
  removal, after its previews, preview script and progress ledger were kept here.
  This original checkout is again the only worktree, and every branch is kept
  locally and on GitHub. Continue in this folder; temporary worktrees are only for
  isolated feature development.

**Branches merged at the user's request (2026-11-05).** The user asked to merge
the branches waiting to be merged. Only two branches held commits that master
lacked. Every other task branch (Tasks 3, 5–7 and 9–16) was already fully inside
master; those branches only looked unmerged because GitHub compares each branch
with its old default branch, which was 52 commits behind.
- Master was fast-forwarded to this branch, so it now also carries the reviewed
  phone-plan amendments and the Task 8 records; the two differed only in
  Markdown. This is not phone acceptance: Task 8's Safari cases have not run,
  and the phone session continues on this branch.
- The old default branch `feat/gymbro-video-landmarks` was fast-forwarded to
  master. The user then switched GitHub's default branch to `master` themselves
  (the agent's browser attempt failed before changing anything); GitHub's API
  confirms `default_branch: master`. The old branch is now an ordinary branch at
  master's commit, kept until the user agrees to delete it.
- Task 4 (`feat/task4-browser-acceptance`) stays unmerged. A trial merge
  conflicts in 16 files, including `package.json`, the lockfile and the test
  configuration, because Task 13 later rebuilt the same browser-test area. Its
  remaining unique part, the human bench-video gate, waits for licensed footage
  and would be moved into `tests/browser/` by a new, separately approved task.
- The fully merged branches are kept; deleting them needs the user's agreement.

**Open hosted failure, first:** master's push started a hosted browser run that
**failed** (details under Task 16 evidence). The run page, read later in the
user's browser, names one failing case: `tests/browser/input-validation.spec.ts:53`, "reports real decode failure, blocks
replacement, and restores keyboard admission". It focuses "Choose video",
presses Enter and waited 10 seconds for a file-chooser event that never came; the
other 16 cases passed, on a runner slow enough that `no-person.spec.ts` alone took
5.5 minutes. No code race is confirmed (see STATUS). The user should
start a new run while signed in (Actions, then "Non-human browser checks", then
"Run workflow" on branch `master`) or re-run
[that run](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41985529794)'s job
before more feature work. If the case fails again, it gets a test-first fix. Do
not call it a flake without that evidence.

**Next action:** no approved implementation task remains. The next work needs the
user: the phone session (below), the product Q&A, which resumes at question Q10
when the user asks, or approval for a further feature such as charts and personal
records, set-linked persistence or final styling. D-024 applies: explain each step
and proceed, without routine "Is this clear?" stops; no teaching checkpoint is
pending. When the Q&A resumes, ask one multiple-choice question at a time, each
with a recommendation and a brief reason, and never treat a recommendation as the
user's choice.

## Task 16 evidence

- Local checks on the reviewed source: 494 tests in 26 files, lint, build, the
  guarded mobile sync and all 17 real-browser cases (3.5 minutes) pass. Claude
  Code repeated tests, lint and build on the final branch and on this merged
  checkout under Node 22.23.2: 494 tests, 421 modules and the reviewed bundle names.
- A fresh design review found the design ready, with no findings. A fresh code
  review found no significant findings and independently passed 77 tests in 8
  files. The requested reviewer model was gpt-6-astra; its actual runtime ID was
  not exposed. No production code changed after review.
- Hosted checks passed on the exact source `4c1b519`:
  [browser run 8](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41983009261)
  (494 shared tests and all 17 browser cases) and
  [native run 15](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41983009299)
  (shared checks, Android and iOS compilation, and a visible empty Home screen at
  iOS simulator startup). No packages were downloaded, and nothing ran on a
  physical device.
- Master's push started two hosted runs on source identical to `4c1b519`.
  [Native run 41985529764](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41985529764) passed its shared checks, the Android APK
  and iOS simulator build and startup. **[Browser run 41985529794](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41985529794) failed**
  in its `npm run test:browser` step after 352 seconds, although its unit tests,
  lint and build passed. The same source passed hosted browser run 8 (256 seconds)
  and, on this merged checkout, a local run of all 17 browser cases (4.3 minutes).
  The cause is unknown until someone signed in reads the log; see the open
  failure above.
- The design, plan, design review and code review are the dated
  `2026-11-05-saved-routines` files in `docs/superpowers/`. Detailed command
  evidence is in STATUS.
- The routine editor and library were inspected at 390 and 1280 px wide with no
  horizontal overflow. Four synthetic previews and the script that drew them are
  kept in this checkout's ignored `build/visual-review/task16/`. Browser test
  captures and uploads remain off. Codex verified and stopped only its own
  loopback server on port 4183; unrelated servers were left running.

## Implemented behavior and data boundaries

- Home keeps its two equal actions, Start workout and Analyze video, and adds
  Manage routines; Routines also has its own navigation entry.
- A routine is a named local plan. The user can create, edit and delete routines,
  order their exercises, give each exercise an optional whole-number target for
  sets and for reps (each independent of the other), and choose lb or kg
  explicitly.
- Starting a routine creates a new workout with fresh workout and entry IDs. It
  copies the exercise order, unit and targets, and no actual sets. Editing or
  deleting the routine later never changes an active workout or history. Targets
  are shown separately; only sets the user actually logs count.
- An active workout blocks starting another routine. Deleting asks for
  confirmation. A failed save keeps the typed fields.
- The editor remembers the library revision it opened with, even across a reload,
  and refuses to save a stale draft; the user must reopen the routine. The rest
  timer and the video-analysis lifecycle stay independent of routines.
- Storage uses document schema 2 in the same IndexedDB database at version 1
  (`gymbro-workouts`, record `library/current`). Reading strict schema-1 data
  changes only the version number in memory, with no write, no added default and
  no size growth, so records at exactly 1,000,000 characters stay readable.
  A missing routines list means "no routines".
- The next explicit successful save writes schema 2 with the atomic revision and
  final-size checks. Unknown, corrupt or future-version data is never
  overwritten. Older app code must update or reload; it must not strip schema-2
  fields.
- Limits: at most 100 routines and 100 exercises per routine; optional target
  sets 1–100 and target reps 1–1000. Existing workout limits are unchanged.
- No runtime dependency, media or pose persistence, cloud service, account or
  native plugin was added.

## Accepted direction and remaining work

PRODUCT_DIRECTION records the answers to questions Q1–Q9:
- Tracking and AI analysis are equally central, in a mixed experience.
- Linked and standalone video analysis are both intended.
- Home has the main actions plus a compact dashboard.
- Full personal tracking and community features are deferred.
- The first AI release covers bench press only. Post-video analysis comes now;
  live analysis later.
- Q8 accepts guest use plus optional accounts and sync. Q9 limits sync to workout
  records: videos are never uploaded. Accounts and sync are **not** implemented.

Routines were Task 16. Charts and personal records, set-linked persistence and
final styling remain future work. The Q&A resumes at Q10 when the user asks; it
does not block approved work. The one-time Q&A reminder was fulfilled and then
paused; no duplicate reminder or Claude task is active.

Task 15's manual rest timer lasts for the session only. It offers presets of 30,
60, 90, 120, 180 and 300 seconds (90 at first) and start, pause, resume and reset,
survives screen changes, and resets on reload, app restart, or a successful finish
or discard; a failed save keeps it. It announces completion inside the app only,
with no background alert. Task 14's local logging and history remain: browser run
4 and native run 11 passed for it, and an offline check after the first load kept
values and units (an offline cold start and offline video inference remain
unverified; details in STATUS). The standalone bench video overlay and elbow
observations also remain. GymBro AI makes no rep or form verdict, no medical claim
and no validated bench-accuracy claim, and it is not a complete release.

## Phone and video acceptance remains open

- The user will provide a hotspot and a video later; do not ask again now.
- Devices: iPhone 12 Pro Max, reported as iOS 26.5.2. There is no Android phone,
  no paid Apple Developer membership and no owned Mac.
- Follow the reviewed [phone plan](superpowers/plans/2026-11-04-phone-video-acceptance.md)
  only with the user present: agree a trusted private connection, re-detect the
  PC's address, and bind ports 5195 and 5196 only to that address. The campus
  Ethernet was a Public network. Make no LAN exposure, firewall, VPN or router
  change.
- No LAN listener, phone transfer, physical Safari case or native case has run.
  The simulator ZIP is not an app that can be installed on an iPhone. No signing,
  payment or store release is authorized.
- This checkout's ignored `build/fixtures/` holds the five first-party non-human
  test patterns, the S07/S08 inputs and their provenance, previously hash-checked.
- Human bench footage is not accepted yet. Treat any offered video as private; the
  permission, framing, encoding and real-inference checks and a manual check that
  the landmarks belong to the lifter all remain. Never upload or commit footage,
  frames or pose traces. Milestone one and phone performance remain unverified.

## Environment and Git

- Use process-local Node 22.23.2 from `%LOCALAPPDATA%\nvm\v22.23.2` (prepend
  `$env:NVM_HOME\v22.23.2` to `PATH` and confirm `node -v`); never run `nvm use`
  or change the global Node 20.
- Leave the unrelated project's listener on `[::1]:5173` alone; the old GymBro
  development server on port 5193 is no longer running.
- Run the full tests, lint and build before each green step commit. No
  attribution trailers, force pushes or branch deletion.
- Keep the Task 8, Task 4 and feature-branch histories. GitHub's default branch
  is `master` (switched by the user on 2026-11-05). Make no other settings,
  signing, payment or publication change unless the user asks.
- Synthetic previews from Tasks 14, 15 and 16 are kept only in this checkout's
  ignored `build/visual-review/` folder; none are uploaded or contain human data.
  Markdown is the provider-neutral handoff.
