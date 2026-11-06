# Session state and media ownership

Task26/D-045 stores optional set kinds in schema3. Strict v1/v2 reads change only
the version digit, with no write or defaults. Missing kind means Regular.
`useExerciseRest` keeps bounded exact-name durations in guest/account-scoped device
localStorage, with session fallback. Timer running state stays in memory.

Task25 adds account-scoped repository databases and a `shared` baseline beside
the manual `current` document. `confirmSync` checks preview revisions, writes
through the authenticated cloud adapter, then commits merged data and baseline
atomically. Guest uses the established singleton/database. Local failures require
reload, and remote failures preserve the ability to keep logging locally.

Task18's restore method merges validated backup records through the same atomic
repository save. Preview revisions reject stale actions, identical imports avoid
writes, and unknown/conflicting/uncertain results retain existing recovery rules.

Task 14 (D-030) adds separate `workoutRepository.ts` and `useWorkoutStore.ts`.
The versioned plain manual log lives in local IndexedDB. One readwrite transaction
compares revisions and saves; UI state updates only on completion. Unknown data,
conflicts and uncertain errors require explicit recovery. Media/session data below
stay in memory. The new store's tests cover draft/edit/finish/history and ordering;
repository tests exercise actual transaction code with the missing API adapted.

Task16/D-034 extends that same document/revision with local routines. Schema2
reads strict v1 without writing, adding defaults or increasing legacy JSON size;
the next explicit successful save persists v2. Optional routines/target metadata
remain plain data. Create/update/delete/start use the existing atomic repository;
whole-routine edits retain their opening revision after reload. A start copies
order/unit/targets into fresh IDs with empty actual sets. Routine changes never
rewrite the active workout/history; media stays in memory.

`useSessionStore.ts` exports `createSessionStore(deps)` and the app's single
`useSessionStore`. The store holds at most one clip and owns its whole lifecycle:

- `startClip(file, link?)` rejects (`busy`) while a clip is loaded or cleanup is
  pending, runs `validateSelection`, then creates the URL, hidden video, and a
  fresh engine. A given set link is copied onto the clip; `detachLink(id)` only
  removes it and marks `linkRemoved`. Links are session-only and never saved.
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

`useSessionStore.test.ts` (23 cases) drives the real engine with a mocked SDK,
except cases that use a fake engine to deliver callbacks after removal. Eleven
cases cover the timing rules, including start-before-resources call order and
the default `performance.now()` clock; mutation checks of each guard, the order
and the default clock each fail a test (see STATUS).
`removeClip` also clears `engineDelegate`.
Design details: [ARCHITECTURE.md](../../docs/ARCHITECTURE.md#session-ownership).

Follow [local rules](AGENTS.md) and [current handoff](../../docs/HANDOFF.md).
Keep algorithms in [core](../core/README.md). Persistence and server video
transfer are outside the pose milestone; D-030 permits only separate manual-workout persistence.
