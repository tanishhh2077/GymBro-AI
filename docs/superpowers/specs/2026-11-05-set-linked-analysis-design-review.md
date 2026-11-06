# Task 19 design review

Fresh read-only Claude Code subagent (Opus 5.5, no builder conversation),
2026-11-05, against D-039, the design, the plan and the workout, session, App,
editor, history, backup and native-lifecycle code. Verdict: **ready with
changes**; no blockers. All findings were adopted in the design and plan:

- Medium: missing interfaces and test seam (signatures, `session` prop, refusal
  location, distinct row-button names, named workflow files).
- Medium: missing tests (restore, `reset`, rejected admission, unlinked
  admission, View analysis, vanished pending target, edited/renumbered sets,
  shared IDs across workouts, App-level discard/delete).
- Low: restore could re-add an older snapshot under the same IDs; resolved by
  detaching a clip's link permanently once it fails to resolve.
- Low: actions now disabled while not loaded, busy or needing reload; pending
  banner resolves on every render.
- Low: App's view-change focus would override row focus; App now focuses the
  requested row instead of `<main>`.
- Low: user-entered reps/weight labelled as entered, not counted from video.
- Low: wording (no exercise rename, ID scope, D-039 supersession, background note).

Speculative notes kept as stated choices: a removed linked clip does not restore
the pending link; non-matching names get no hint; another tab's deletions are
stale until reload, never a wrong set.
