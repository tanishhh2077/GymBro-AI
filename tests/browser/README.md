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

Screenshots, videos and traces are off, output is not retained, and CI uploads
no browser artifacts. Console runtime observations include only browser version,
delegate and synthetic sample count. Do not enable captures or add human files
to this harness. A future private-video workflow needs separate review.

Ported/adapted from incomplete Task 4 at `34538e4`, without merging that branch
or its human fixture loader/test. The development-store inspection helper avoids
adding a production debug API. These are dev-server checks; they do not prove
production-bundle/native behavior, offline support, rotated-metadata handling,
positive-pose accuracy, physical-device performance or M1 bench acceptance.
