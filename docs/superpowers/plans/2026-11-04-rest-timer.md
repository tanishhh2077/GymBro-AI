# Task15 Manual Rest Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. One writer, one fresh read-only whole-branch code reviewer. Track actual progress below.

**Goal:** Add a usable manual rest timer for the active workout without changing saved records or analysis.

**Architecture:** Root-mounted, workout-ID-keyed React component; local discriminated timer state and wall-clock deadline. Existing persistence and video lifecycle stay separate.

**Tech Stack:** Existing React18/TypeScript/Vite/Capacitor, Vitest and Playwright; no dependencies.

**Spec:** [rest timer design](../specs/2026-11-04-rest-timer-design.md).

## Global constraints

- D-033 authorizes this slice; Q8/Q9 accounts/sync are planned, not implemented.
- Manual start only; default90 and30/60/90/120/180/300-second presets are builder choices.
- Visible reload/restart reset and in-app-only completion; no storage/native/notification/media/network changes.
- Absolute Date.now deadline; clamp0..selected duration; pause uses a fresh reading; display ceiling seconds as m:ss.
- Mount keyed by active workout ID outside screen conditionals; preserve on failed finish/discard.
- Preserve Task8/Task4 branches, human-data restrictions, process-local Node22 and existing servers.
- Full tests/lint/build before green step commits/pushes; fresh review before master integration. No attribution trailers.

## Review focus

- Delayed callbacks/backgrounded page must catch up from the deadline instead of stretching rest.
- Rapid pause/resume near expiry must not add fractional time or restart a completed timer accidentally.
- Screen navigation must retain the timer; successful workout replacement must reset it, failed saves must preserve it.
- StrictMode/unmount must release intervals and focus/visibility listeners; no per-second live-region chatter.
- Narrow layout and reload behavior must match visible promises without implying native background alerts.

## Step1: source, baseline, design and Q&A decisions

- [x] Create isolated branch from master `b09f79a`; preserve original Task8 checkout.
- [x] Record Q8/Q9 and resumed development authorization, bounded design and explicit builder choices.
- [x] Clean install and448-test/lint/build baseline, loopback development-server health.
- [x] Self-review plan/interfaces/coverage; commit/push this green setup with current handoff.

## Step2: timer, integration and browser evidence

**Create:** `src/components/WorkoutRestTimer.tsx`, `src/components/WorkoutRestTimer.test.tsx`.
**Modify:** `src/App.tsx`, `src/App.workouts.test.tsx`, `tests/browser/workouts.spec.ts`, relevant README/AGENTS and workflow feature-branch triggers.
**Interface:** export `WorkoutRestTimer(): JSX.Element`; App renders it only for `state.data.active`, key that workout's ID. Component owns timer state/cleanup, not workout writes.

- [ ] Write focused component and App tests, observe failures for the missing behavior.
- [ ] Implement component and root placement; verify focused tests and all existing448 cases.
- [ ] Add real Chromium synthetic flow using its clock; run14-case full browser suite and inspect390px layout.
- [ ] Full tests/lint/build, guarded mobile sync/verify; update docs, commit/push green implementation.

## Step3: fresh review and integration

- [ ] Fresh reviewer reads branch/spec/plan and surrounding code, read-only, no inherited conversation. Fix supported defects with reproducing RED/GREEN tests.
- [ ] Read actual hosted browser/native checks separately from local evidence. Do not claim physical-phone/bench validation.
- [ ] Update all changed facts; reviewed fast-forward/push master and preserve Task8 history when bringing it into original checkout. Retain branches.

## Execution record

- Codex implements inline; exact runtime model ID unavailable. Baseline install482packages,448tests/22files, lint and build passed. Owned loopback Vite4183 responded200. All timer evidence pending; no feature code yet.
- Plan self-review: component owns only time state; App owns workout identity; existing saved-record contract stays unchanged. Tests cover each listed Review Focus; no material unresolved decision.
- Q8 documentation cherry-pick hit three Markdown conflicts and was aborted; carried only current documentation via explicit copies, without phone branch code.
- Ruling: first timer is session-only, not another storage schema — keeps the bounded feature independent of saved workout recovery/sync; users must restart it after reload, stated in UI.
