# Browser verification

Read [root guidance](../AGENTS.md) and [current handoff](../docs/HANDOFF.md).

- Test the real app through Playwright/Edge; do not mock MediaPipe for acceptance.
- Keep all captured screenshots, video, traces, and error-context snapshots off.
- Use a separate automated browser context and strict dedicated server port.
- Keep human footage outside Git and `public/`; fixture permission is mandatory.
- A passing UI or no-person test does not establish useful bench-lifter estimates.
- Type-check tests with `npm run test:e2e:typecheck` as well as running them.
- Local helpers may inspect the development store; add no production debug API.
