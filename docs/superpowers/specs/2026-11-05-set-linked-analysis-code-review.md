# Task 19 code review

Fresh read-only Claude Code subagent (Opus 5.5, no builder conversation),
2026-11-05, of `94068fc..eab39bd` against D-039, the design, its review and the
plan. It ran 596 tests / 36 files, lint, build and all 23 Chromium cases (3.0
minutes). Verdict: **ready after Step 4 docs; no Blocker, High or Medium.**

It found no sequence that links a clip to the wrong set, relinks a detached
clip or shows Back to set for a missing set, and no new storage, export or
network path. Low findings and dispositions:

1. App subscribed to the whole clip list and re-rendered on every processing
   progress update. **Fixed:** App selects only the open clip's ID and link,
   whose reference is stable across progress patches.
2. No test covered the availability guards (removing both kept 38 App tests
   green). **Fixed:** a new test asserts no detach from unconfirmed or unloaded
   data and a disabled Back to set while a reload is needed; removing either
   guard now fails it.
3. Design text and a comment differed from the code (detach location,
   `linkRemoved`, refusal placement, `available` meaning). **Fixed.**
4. One test waited for framer-motion's exit animation in real time. **Fixed:**
   the file sets `MotionGlobalConfig.skipAnimations` for its tests.
5. Several guides still describe set-linked analysis as future work. **Owned
   by Step 4** documentation.

Speculative notes (not changed): live regions already present when Analyze
opens may not be announced; a focused set row has no name of its own.
