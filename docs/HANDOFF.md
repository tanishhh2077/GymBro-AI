# GymBro AI: current handoff

Updated 2026-11-05 (America/Chicago). Read root and scoped `AGENTS.md` files first.

## Current task and next action

**Task 16, saved workout routines, is complete** ([D-034](DECISIONS.md#d-034-saved-workout-routines-with-fresh-actual-set-logging)).
The user approved the three proposed routine features with "Yes create all of
that". Codex built and reviewed the feature on `feat/task16-saved-routines` in the
temporary sibling worktree `GymBro AI-task16`, starting from master `7d97ac6`.
Codex then reached its five-hour limit, the user moved the work to Claude Code,
and Claude Code (Opus 5.5) finished Step 3. The reviewed source is `4c1b519`;
every later commit changes Markdown only.

Step 3's master part is done: this documentation commit completes the records,
and master is fast-forwarded from `7d97ac6` to it and pushed. No Task 8 or Task 4
commit enters master.

**Next concrete action:** in the original checkout (`GymBro AI`, branch
`feat/task8-safari-phone-test`), merge this master with a merge commit so both
histories stay intact. Keep that branch's extra Task 15 integration record, check
that every non-Markdown file equals master, and run the required checks. Then
remove the clean `GymBro AI-task16` worktree with a normal Git removal and keep
every branch. The Task 8 branch's HANDOFF and STATUS record that outcome.

After that integration, no approved implementation task remains. The next work
needs the user: the phone session (below), the product Q&A, which resumes at
question Q10 when the user asks, or approval for a further feature such as charts
and personal records, set-linked persistence or final styling. D-024 applies:
explain each step and proceed, without routine "Is this clear?" stops; no
teaching checkpoint is pending.

## Task 16 evidence

- Local checks on the reviewed source: 494 tests in 26 files, lint, build, the
  guarded mobile sync and all 17 real-browser cases (3.5 minutes) pass. Claude
  Code repeated tests, lint and build on the final branch under Node 22.23.2:
  494 tests, 421 modules and the reviewed bundle names.
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
- The design, plan, design review and code review are the dated
  `2026-11-05-saved-routines` files in `docs/superpowers/`. Detailed command
  evidence is in STATUS.
- The routine editor and library were inspected at 390 and 1280 px wide with no
  horizontal overflow. Four synthetic previews and the script that drew them are
  kept in the original checkout's ignored `build/visual-review/task16/`. Browser
  test captures and uploads remain off. Codex verified and stopped only its own
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

Task 15's manual rest timer lasts for the session only. It offers presets and
start, pause, resume and reset, survives screen changes, and resets on reload,
app restart, or a successful finish or discard. It announces completion inside
the app only, with no background alert. Task 14's local logging and history, and
the standalone bench video overlay and elbow observations, remain. GymBro AI
makes no rep or form verdict, no medical claim and no validated bench-accuracy
claim, and it is not a complete release.

## Phone and video acceptance remains open

- The user will provide a hotspot and a video later; do not ask again now.
- Devices: iPhone 12 Pro Max, reported as iOS 26.5.2. There is no Android phone,
  no paid Apple Developer membership and no owned Mac.
- Follow the reviewed `2026-11-04-phone-video-acceptance` plan only with the user
  present: agree a trusted private connection, re-detect the PC's address, and
  bind ports 5195 and 5196 only to that address. The campus Ethernet was a Public
  network. Make no LAN exposure, firewall, VPN or router change.
- No physical Safari or native case has run. The simulator ZIP is not an app that
  can be installed on an iPhone.
- The original checkout's ignored `build/fixtures/` holds the first-party test
  patterns, the S07/S08 inputs and their provenance.
- Human bench footage is not accepted yet. It stays private by default; the
  permission, framing, codec and inference checks and a manual check that the
  landmarks belong to the lifter all remain. Never upload or commit footage,
  frames or pose traces. Milestone one and phone performance remain unverified.

## Environment and Git

- Use process-local Node 22.23.2 from `%LOCALAPPDATA%\nvm\v22.23.2` (prepend
  `$env:NVM_HOME\v22.23.2` to `PATH` and confirm `node -v`); keep the global Node.
- Run the full tests, lint and build before each green step commit. No
  attribution trailers, force pushes or branch deletion.
- Keep the Task 8, Task 4 and feature-branch histories. The GitHub default branch
  is still `feat/gymbro-video-landmarks`. Make no settings, signing, payment or
  publication change.
