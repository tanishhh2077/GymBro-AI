# Task 13: reproducible non-human browser checks

## Intent and authorization

The user asked Codex to inspect Claude's work and continue PC development while
hotspot access and a bench video wait. After the explanation of automated
browser checks they replied "Clear", then "Clear just start working". This
authorizes this bounded task and routine execution without further teaching
stops. It does not authorize phone, network/settings, account or media-upload
actions. D-024 still governs those boundaries.

Current master `1c44729` passes 385 unit/packaging tests, lint and build. Prior
browser checks live in an incomplete Task 4 branch or ignored scratch scripts;
neither gives a fresh checkout a maintained smoke command. Do not merge Task 4.

## Result

Add `npm run test:browser`, a reproducible Playwright smoke suite on current
master. Use actual browser decoding and the committed MediaPipe model/runtime,
without mocked inference or seeded positive poses. Only five first-party solid
black, silent H.264 MP4 patterns are eligible. Port these exact blobs and adapt
the applicable smoke tests from Task 4's immutable `34538e4`; leave the human
fixture loader, real-bench test and its unfinished acceptance on that branch.

Checks cover empty/unsupported/multiple files, three decoded metadata bounds,
corrupt-media recovery with keyboard removal/focus, real no-pose output and
zero coverage, playback/pause/seek/speed/restart, object-URL revocation, fresh
job identity, cancellation cleanup and native portrait layout at desktop and
narrow viewports. Assert final paused and seek states, not just button clicks.
Require local model/wasm requests, no external HTTP requests or non-GET/HEAD
requests, and no uncaught page errors during inference.

## Builder choices

- Pin `@playwright/test` exactly to `1.64.1`; it is a development dependency.
- Default to Playwright's Chromium distribution (install separately), allowing
  the same browser family on Windows and a standard Ubuntu GitHub runner.
- One worker, no retries, bounded suite/test timeouts and event/state waits.
- Own a loopback-only Vite dev server on `127.0.0.1:4179`, strict port, no reuse.
  Dev-module inspection of existing store state avoids adding a production debug
  API. This is development-server evidence, not production/native acceptance.
- Run the fixture checksum/length preflight before browser tests. Refuse modified
  or missing fixtures rather than treating arbitrary content as a safe pattern.
- Disable screenshots, traces, video recordings and retained test output. Use
  console results only; CI uploads no browser artifacts. This harness accepts
  no private-video path and must not be repurposed for human media casually.
- Type-check config and test helpers/specs in `npm run build`. Keep browser tests
  out of Vitest's normal discovery. Add shared AGENTS/CLAUDE/README guidance in
  each new authored directory.
- Add a standard public GitHub Ubuntu job, read-only token, pinned existing
  checkout/setup-node action SHAs, Node from `.nvmrc`, locked install, shared
  checks and Chromium installation plus smoke command. No cache, paid runner,
  upload, signing, credentials or repository-settings changes.

## Acceptance and limits

A clean dependency install, unchanged existing unit suite, fixture-preflight unit
tests, type checking, lint, build and all smoke cases must pass locally. Validate
the workflow with an actual hosted run if pushing succeeds. A runner/browser
failure must be reported, never silently skipped or mocked into a pass.

No product behavior change, new exercises, backend, reps, form findings or
score. Black patterns establish no-person handling only. They do not establish
positive pose accuracy, rotated-metadata behavior, phone Safari, installed native
behavior, offline inference, GPU availability or physical-device performance.
The user now expects to supply a video later; permission/framing/codec and
landmark-to-lifter identity still require review then. M1 remains incomplete.
