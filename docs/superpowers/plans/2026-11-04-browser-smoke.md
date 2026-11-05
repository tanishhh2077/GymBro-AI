# Task 13 Browser Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline. Steps use checkbox syntax for tracking. One writer; fresh read-only design/code reviewers.

**Goal:** Make non-human browser checks repeatable from a clean checkout and CI while phone/bench acceptance wait.

**Architecture:** Playwright owns a strict loopback Vite dev server and exercises real decoding/MediaPipe. Fixed checksummed patterns are the only inputs; no runtime product changes or human-video test enters this task.

**Tech Stack:** Node 22.23.2, TypeScript, Playwright 1.64.1/Chromium, existing Vite/Vitest/MediaPipe.

**Spec:** [browser smoke design](../specs/2026-11-04-browser-smoke-design.md).

## Global Constraints

- One worker, no retries; local `127.0.0.1:4179`, strict port, no server reuse.
- No screenshot/trace/video/artifact uploads, private media, mocked inference, native sync or settings changes.
- Pin `@playwright/test` to `1.64.1`; retain existing runtime dependency versions.
- Port selected sources from `34538e4`, never merge incomplete Task 4.
- Full unit tests/lint/build before each green commit; retain feature branches and no attribution trailers.

## Review Focus

- A busy port must fail rather than exercise a different running app; config `reuseExistingServer: false` plus strict port, verify once with an owned listener.
- Replaced/missing synthetic assets must fail before inference; fixture-preflight tests cover tamper, wrong length and missing file.
- Pause/seek clicks can appear successful without changing media state; explicitly assert paused/time after controls.
- New status badges can make generic status selectors ambiguous; select the no-pose notice by text.
- Cancellation may race completion; assert processing before cancellation, await idle/admission, then complete a distinct fresh job with one remaining clip.

## Step 1: design and clean baseline

- [x] Create isolated feature branch from `1c44729`, clean locked install and run unit tests/lint/build. Leave existing servers/phone checkout intact.
- [x] Fresh read-only design review; resolve supported findings and record D-029/scope and current handoff.
- [x] Commit/push the reviewed plan after the baseline is green (`f6b3d14`).

## Step 2: checksummed browser suite

**Files:** `package.json`, lockfile, `playwright.config.ts`, `tsconfig.browser.json`,
`vitest.config.ts`, `tests/{AGENTS,CLAUDE,README}.md`, equivalent guidance in
`tests/browser/` and `tests/fixtures/`, `tests/browser/{app.ts,input-validation.spec.ts,no-person.spec.ts,verify-fixtures.ts,verify-fixtures.test.ts}`, five fixed `tests/fixtures/*.mp4`, root/scoped docs.

**Interfaces:** `verifyFixtures(directory?: string): void` validates regular files,
known lengths and SHA-256s; default export invokes it as Playwright global setup.
`sessionSnapshot(page: Page)` reads the existing development store for observed
clip identity/status/pose/delegate/URL/processing state. No production global.

- [x] Write preflight tests for five valid assets, missing file, modified same-length bytes, wrong length and non-regular input. Observe RED before implementing the preflight. Inputs in these unit tests are explicitly non-media test bytes.
- [x] Add exact dev pin/scripts/config, selected adapted smoke specs and binary pattern blobs. Real browser checks cover the cases in the design; never invent positive detections. Use safe fixed fixture names.
- [x] Install Chromium, run preflight tests, all unit tests, lint, build and `npm run test:browser`; diagnose failures before fixes. Check busy-port refusal. Record actual runtime/delegate and evidence limits.
- [x] Update progress/status/handoff, commit/push green changes.

## Step 3: hosted checks and final review

**Files:** `.github/workflows/browser-checks.yml`, related local guidance/README,
root README/AGENTS, docs STATUS/HANDOFF/ARCHITECTURE, review record.

- [ ] Add bounded standard Ubuntu workflow on this feature branch and master for relevant source/config/assets; pinned existing actions, read-only token, no cache/uploads. Run clean install, shared checks, browser install and smoke suite. Document the exact local commands.
- [ ] Validate configuration and full local checks, commit/push. Observe hosted job or record access/runner limitation without claiming success.
- [ ] Fresh whole-branch critical review against spec; evaluate findings, fix supported defects with reproducing tests and rerun affected checks.
- [ ] Update durable handoff with exact results, limitations, review disposition and next phone/video action. Commit/push and fast-forward reviewed master per D-018. Preserve pending Task 8 and Task 4 histories.

## Execution record

- Native worktree tool rejected the renamed repo because the chat's workspace still names `liftform`; standard Git worktree created sibling `GymBro AI-task13` on `feat/task13-browser-checks`. No current checkout/server was changed.
- Author: Codex, current session model (exact runtime model identifier unavailable). Reviewers will record actual tool/model limits.
- Pre-flight: Step 2 produces the smoke command/config and fixed assets consumed by Step 3 CI. CI must install the same pinned runner/browser and must not add artifact uploads. No interface contradiction found.
- Fresh design review is ready, no blockers. Browser codec compatibility is an explicit execution condition; see the [review](../specs/2026-11-04-browser-smoke-review.md).
- Step 2 complete: 391 unit/helper tests, lint, build, ten real browser cases (2.8 minutes), busy-port refusal. Windows browser 156.0.8078.4/GPU, 120 no-person samples. Initial selector encoding failure corrected; no application-source fix. Hosted browser compatibility remains to be proved.
