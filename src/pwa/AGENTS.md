# Installable web app (offline start)

Inherit [source guidance](../AGENTS.md). Q49 makes the web build installable.

- `serviceWorkerCore.ts` is inlined by `vite.serviceWorker.ts` into `dist/sw.js`
  as a classic script: keep it import-free and reach browser APIs only through
  its injected runtime so tests can use fakes.
- Never cache cross-origin, non-GET or range requests, and never precache the
  pose model or MediaPipe runtime; they are cached on first successful use.
- No `skipWaiting`: a new worker takes over only after every old window closes.
  Navigation is network-first, so online visits still load the newest deploy.
- Register only in production web builds on a secure origin, never in the
  Capacitor app; the native copies drop `sw.js` during `mobile:sync`.
- Unit tests with fakes do not prove real browser install or offline behavior.
