# Real browser smoke checks

Requires Node from `.nvmrc` and the locked dependencies:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

On a Linux runner, use `npx playwright install --with-deps chromium` to install
browser system dependencies too. One worker starts its own Vite development
server at `http://127.0.0.1:4179`; a busy port fails instead of reusing another
app. Playwright stops its server afterward. Existing servers are left alone.

Input rejection, real no-person inference, playback/pause/seek/speed/restart,
URL cleanup, fresh-job admission, cancellation and portrait/narrow layout use
only the checksummed patterns. The runner accepts no human-video argument or
environment path. Do not replace a pattern with a recording: integrity preflight
will fail. Browser tests use `*.spec.ts`; `verify-fixtures.test.ts` runs in Vitest.

Task 14 adds synthetic manual workout values only: logging/edit/reload/finish/
history/deletion, actual two-tab conflicts and long names at 390px. Analysis
cases enter from Home; no-person cases also navigate away/back without losing
the clip/job. These are isolated temporary browser contexts, never real user logs.

Task15 adds a controlled-clock synthetic-workout timer flow: manual duration,
pause/resume, deadline catch-up, navigation survival, visible completion, reload
reset and narrow layout. Task15 brings the suite to14 cases. It uses no native clock
or background-notification simulation and makes no physical-device timing claim.

Task16 brings the maintained suite to17 cases: routine CRUD/order/targets and
fresh actual-set history, native IndexedDB v1 read-without-write/first v2 save,
and two-tab stale-editor recovery. Use synthetic workout values only. Await save
confirmation before reload; a click is not proof that its async write finished.

Task17 brings the suite to 19 cases. Progress uses completed synthetic workouts to
verify reload, separate units, source links, deletion, long names, table paging,
all chart points and a visible zero-load marker at 390 px. Its larger fixture uses
the existing development repository module and a separate temporary context.

Screenshots, videos, traces and automatic page/ARIA snapshots are off. On failure
Playwright can still create temporary error/source diagnostics; test output is
removed afterward, while last-run metadata may remain. CI uploads no browser
artifacts. Console runtime observations include only browser version,
delegate and synthetic sample count. Do not enable captures or add human files
to this harness. A future private-video workflow needs separate review.

Ported/adapted from incomplete Task 4 at `34538e4`, without merging that branch
or its human fixture loader/test. The development-store inspection helper avoids
adding a production debug API. These are dev-server checks; they do not prove
production-bundle/native behavior, offline support, rotated-metadata handling,
positive-pose accuracy, physical-device performance or M1 bench acceptance.
