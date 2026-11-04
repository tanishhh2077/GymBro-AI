# Build configuration type-check implementation plan

> Use `superpowers:executing-plans` inline with one writer, test-first behavior,
> green step commits/pushes and a fresh final reviewer.

**Goal:** Make `npm run build` fail when `vite.config.ts` or `vitest.config.ts`
contains a type error, and remove the unused template TypeScript configuration.
**Decision:** [D-027](../../DECISIONS.md#d-027-type-check-the-build-configuration-files).
**Tech stack:** Existing TypeScript 5/Vite/Vitest, process-local Node 22.23.2.

## Design

Today the build script is `tsc -b && tsc --project tsconfig.mobile.json && vite build`.
`tsc -b` builds the root `tsconfig.json` (`include: ["src"]`), and the mobile
project checks `capacitor.config.ts`. The two Vite configuration files run under
Node when Vite or Vitest starts, so they need Node types and no DOM, which is
what `tsconfig.node.json` (ES2023 library, strict, `noEmit`) already describes.

- `tsconfig.node.json` includes `vite.config.ts` and `vitest.config.ts` and adds
  `"types": ["node"]`, so the Node globals the files use (`import.meta.url` with
  `node:url`) come from the installed `@types/node` rather than from whatever
  `@types` packages happen to be present.
- The build becomes
  `tsc -b && tsc --project tsconfig.mobile.json && tsc --project tsconfig.node.json && vite build`.
  A separate `--project` run is used, matching the mobile check, instead of
  converting the root file to project references: references would need
  `composite` settings and emitted declaration files for a check that emits nothing.
- `tsconfig.app.json` is deleted (see D-027 for why wiring it in fails).

Alternative considered: putting the config files into the root `tsconfig.json`.
That would give them DOM types and the `@/` alias they do not run with, so a
browser-only global used by mistake would pass the check and fail when Vite starts.

## Global constraints

- No application source, dependency, lockfile, Vite/Vitest behavior or native change.
- Work on `feat/task11-config-typecheck` from reviewed master `aec3cb2`.
  Task 8 (phone) and Task 4 (bench) stay open and unmerged.
- D-024 waives routine approval stops; phone/accounts/settings/spending/
  publication still stop.

## Review focus

1. A type error in either config file must make `npm run build` exit non-zero:
   checked by a packaging test and by a temporary mutation of each file.
2. The check must use Node types, not DOM: a mutation using `document` in
   `vite.config.ts` must fail.
3. Removing `tsconfig.app.json` must not change any other tool: lint, tests,
   build output module count and `mobile:sync` stay as before.

## Step 1 — decision and plan

- [x] Confirm clean branch from master `aec3cb2`; record D-027 and this plan;
  update the plans index, ARCHITECTURE and HANDOFF/STATUS.
- [x] Whole tests/lint/build under Node 22.23.2. Commit/push as Task 11 Step 1.

## Step 2 — wiring and test

**Modify:** `tsconfig.node.json`, `package.json` (build script only),
new `scripts/build-config.test.mjs`; **delete** `tsconfig.app.json`.

- [ ] Write a failing Node-environment test: it reads the build script and
  requires the `tsconfig.node.json` check before `vite build`, and runs the
  installed TypeScript compiler with `--listFilesOnly` on `tsconfig.node.json`,
  requiring both config files in its list. Observe it fail on the current files.
- [ ] Make the minimal change; observe it pass.
- [ ] Mutation checks (reverted): a type error in each config file and a `document`
  reference in `vite.config.ts` each make `npm run build` fail.
- [ ] Full tests/lint/build and `npm run mobile:sync`; update docs; commit/push.

## Step 3 — fresh review and integration

- [ ] Fresh read-only review of D-027, this plan and the diff; fix supported findings
  in their own commit.
- [ ] Record the review, fast-forward master, push, and merge master into Task 8
  with a merge commit so the phone branch keeps current configuration.
