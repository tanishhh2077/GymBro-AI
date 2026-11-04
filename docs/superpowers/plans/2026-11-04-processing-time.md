# Observed processing time implementation plan

> Use `superpowers:executing-plans` inline with one writer, test-first behavior,
> green step commits/pushes and a fresh final code reviewer.

**Goal:** Show one run's measured admission-to-result time for completed clips.
**Architecture:** The store reads an injected monotonic clock at admission and at
completion and stores the difference on the clip; the existing badge row shows it.
**Tech stack:** Existing React/TypeScript/Vite/Vitest, process-local Node 22.23.2.
**Spec:** [processing time design](../specs/2026-11-04-processing-time-design.md).

## Global constraints

- No engine, input limit, model, dependency, storage, native or backend change.
- The value is a single observation, never a benchmark, rating or promise.
- Task 8 (phone) and Task 4 (bench) stay open and unmerged. Work on
  `feat/task10-processing-time` from reviewed master `3209025`.
- D-024 waives routine approval stops; phone/accounts/settings/spending/
  publication still stop.

## Review focus

1. A late result after removal must set no time, and a clip admitted after
   cleanup must record only its own interval (the store cannot admit a clip
   while an old job is unsettled): ownership tests.
2. An invalid, backwards or throwing clock reading must not show 0 s, fail the
   clip or strand a URL: store tests.
3. The time must arrive in the same update as the result: a store subscription
   asserts every emitted state with `pose` has `processingMs`; component test
   shows no badge without a value.
4. Rounding must not hide the raw value: store keeps floats; UI rounds once.

## Step 1 — baseline and design

- [x] Confirm clean branch from master `3209025`; package files unchanged.
- [x] Record D-026, this plan and the design; update relevant guides.
- [x] Whole tests/lint/build under Node 22.23.2; preserve global Node 20 and the
  running servers on 5173/5193.
- [x] Fresh read-only design review; resolve supported material issues. Commit/
  push green documents as Task 10 Step 1.

## Step 2 — measurement and badge

**Modify:** `src/types/index.ts` (`Clip.processingMs`), `src/store/useSessionStore.ts`
(`SessionDeps.now`), its tests, `src/components/VideoStage.tsx`, its tests, and
the relevant source READMEs.

- [x] Write failing store tests (fake clock) for ready and no-pose times; observe
  failure because no time is recorded.
- [x] Implement the minimal guarded clock reads and patch. Add cases for
  failure, late result after removal, a later clip's own interval,
  non-finite/backwards/throwing readings, and the same-update subscription
  (guards were written with the minimal change; mutation checks stand in for
  their RED, see STATUS).
- [x] Write failing VideoStage tests for badge text/rounding (including 0 ms) and
  absence; implement the badge in the existing style.
- [x] Run full tests/lint/build and `npm run mobile:sync`. Record actual RED/GREEN
  evidence. Update docs, inspect staging, commit/push.

## Step 3 — browser evidence, fresh review and integration

- [x] Real no-person inference in an isolated loopback PC browser shows the badge
  after the no-pose result at wide and narrow widths, and removal clears it.
- [x] Fresh read-only whole-feature review against the spec; fix supported issues
  with failing tests first (three Low; new tests verified by mutation, see STATUS).
- [ ] Full checks and current docs; commit/push. Fast-forward/push master under
  D-019 once the review resolves; inspect native CI triggered by the source change.
- [ ] If ready before the phone session, merge reviewed master into Task 8 again,
  preserving both histories; otherwise the phone cases run on Task 8's current
  build. Never mark phone/native/bench cases passed.

## Self-review

Store and UI contracts use the same name (`processingMs`) and absence rule; every
design rule maps to a Step 2 test or Step 3 browser/review evidence. No threshold,
expected duration or performance claim is added.
