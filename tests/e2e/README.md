# Edge acceptance checks

Install dependencies with `npm ci --no-audit --no-fund`. Microsoft Edge must be
installed; Playwright uses `channel: msedge` in a fresh automated profile.

- `npm run test:e2e:typecheck`: checks the test/config TypeScript.
- `npm run test:e2e:ui`: runs checks independent of human bench footage.
- `npm run test:e2e`: runs all checks, including the bench fixture gate.

The runner owns `127.0.0.1:4179` and fails on a conflict. Stop your own server on
that port before running; it never attaches to an existing server. One worker,
no retries, no screenshots/video/traces/error-context snapshots. Output directories
are ignored. Fonts are blocked; model/runtime requests remain real and local.

Missing bench footage does not prevent UI development. It does prevent claiming
the milestone passed; [fixture setup](../fixtures/README.md) explains the gate.
