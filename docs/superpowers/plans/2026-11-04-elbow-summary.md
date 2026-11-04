# Clip elbow summary implementation plan

> Use `superpowers:executing-plans` inline with one writer, test-first behavior,
> green step commits/pushes and a fresh final code reviewer.

**Goal:** Add inspectable clip-level elbow availability and extrema navigation.
**Architecture:** Pure aggregation of existing ElbowSeries; a small presentation
component calls the current seek callback. No media/store ownership changes.
**Tech stack:** Existing React/TypeScript/Vite/Vitest, process-local Node22.23.2.
**Spec:** [elbow summary design](../specs/2026-11-04-elbow-summary-design.md).

## Global constraints

- Same image-space angles/visibility heuristic and one-MP4 limits as Task5.
- No runtime dependencies, backend/storage, rep detection or validated ROM claims.
- Task8 phone work and Task4 bench acceptance remain open, never merged just for
  tooling. Work on `feat/task9-elbow-summary` from reviewed master26a831f.
- Carry the user's already accepted D-024 guidance from Task8 without its
  unfinished phone preparation. Preserve every branch and original brief.
- User's "just build"/PC-dev instructions waive routine approval stops for this
  bounded builder choice; phone/accounts/settings/spending/publication still stop.

## Review focus

1. 0°/time0 must not be replaced by Unavailable: core endpoint + UI callback tests.
2. One side missing must not erase the other: core bilateral and UI empty-side tests.
3. Ties/irregular timestamps must navigate real earliest evidence: core tie tests.
4. Pose replacement must not retain old extrema/counts/callbacks: integration test.
5. Missing or invalid measurements must not become zero, confidence or ROM:
   malformed-series/core and no-pose/fallback/copy component tests.

## Step 1 — environment and design

- [x] Confirm clean branch/base and current package lock. Use the established
  single-writer checkout; do not transfer Task8's incomplete source/history.
- [x] Preserve accepted D-024 rules, record D-025/scope and update relevant guides.
- [x] Run clean `npm ci --no-audit --no-fund`, whole tests/lint/build under Node22.
  Start/verify own loopback dev server before feature code; preserve global Node20.
- [x] Fresh read-only builder check of the spec; resolve supported material issues.
  Commit/push green design/baseline documents as Task9 Step1.

## Step 2 — summary and presentation

**Create:** `src/core/elbowSummary.ts`, `src/core/elbowSummary.test.ts`,
`src/components/ElbowSummaryPanel.tsx`, `src/components/ElbowSummaryPanel.test.tsx`.
**Modify:** `src/components/ElbowTimeline.tsx`, its test, relevant source READMEs.
**Consumes:** Existing ElbowSeries and onSeek(time); exact new types are in spec.
**Produces:** summarizeElbows + ElbowClipSummary; ElbowSummaryPanel({summary,onSeek}).

- [x] Write a first failing core test for asymmetric counts/extrema with original
  timestamps/indices. Observe failure because summarizeElbows is absent.
- [x] Implement the minimal aggregator. Expand RED→GREEN cases for no data,
  one sample, 0/180°, missing reasons, earliest ties/raw precision, irregular time,
  invalid metadata/sample/measurement and immutability. No new angle calculation.
- [x] Write failing panel tests for values/counts, null buttons, time0/raw-time
  callbacks, missing-side independence and required interpretation limits.
- [x] Implement the compact accessible panel using the existing visual language.
- [x] Write failing ElbowTimeline integration tests for summary rendering and
  result replacement; integrate once-per-pose derivation with existing fallback.
- [x] Run full tests/lint/build and `npm run mobile:sync`. Record actual RED/GREEN
  evidence and sync file comparisons. Update docs, inspect staging, commit/push.

## Step 3 — browser evidence, fresh review and integration

- [x] Real no-person GPU/CPU inference in own isolated PC browser: summary counts
  zero measurable, buttons unavailable/disabled, replay and removal still work.
- [x] Supplied synthetic positive geometry for min/max UI and narrow/wide layout;
  label it synthetic and verify actual jump/paused media-time state where feasible.
- [x] Fresh read-only whole-feature review against spec; fix supported issues
  with appropriate failing tests/checks. Do not invent a finding quota.
- [ ] Full required precommit checks, guarded sync and current docs; commit/push
  green review fixes/handoff. Fast-forward/push master under D-019 once resolved.
  Inspect native CI if source change triggers it; record its actual result.
- [ ] Preserve Task8's branch and phone deferral. Explain exactly how it resumes
  against the new reviewed source; never mark its phone/native/bench cases passed.

## Self-review

Core/UI contracts align on all names/null states and callbacks; every spec rule
has the corresponding Step2 tests or Step3 browser/review evidence. No parameter
threshold/default is added. This plan implements observed evidence only.
