# Session state and media ownership

`useSessionStore.ts` exports `createSessionStore(deps)` and the app's single
`useSessionStore`. The store holds at most one clip and owns its whole lifecycle:

- `startClip(file)` rejects (`busy`) while a clip is loaded or cleanup is pending,
  runs `validateSelection`, then creates the URL, hidden video, and a fresh engine.
- Every update from a job checks that the job still owns the session, so late
  progress or results from a removed clip change nothing.
- `removeClip`/`reset` abort the job; `processingState` stays `cancelling` until the
  job settles and every URL lease is released, then the URL is revoked once.
- `retainClipMedia(id)` gives a visible player a lease with an idempotent release.
- Task 10 (D-026): an injected monotonic clock (`deps.now`, default
  `performance.now()`) is read at admission and when the result completes. The
  difference is set as `processingMs` in the same update as a `ready`/`no-pose`
  result; failed or removed jobs and invalid, backwards or throwing readings
  leave it absent, never zero. It is one run's observation, not a benchmark.

`useSessionStore.test.ts` (21 cases) drives the real engine with a mocked SDK,
except cases that use a fake engine to deliver callbacks after removal. Nine
cases cover the timing rules with a fake clock; mutation checks confirmed each
guard is tested.
`removeClip` also clears `engineDelegate`.
Design details: [ARCHITECTURE.md](../../docs/ARCHITECTURE.md#session-ownership).

Follow [local rules](AGENTS.md) and [current handoff](../../docs/HANDOFF.md).
Keep algorithms in [core](../core/README.md). Persistence and server video
transfer are outside the approved milestone.
