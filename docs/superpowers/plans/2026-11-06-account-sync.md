# Task25 optional accounts and workout sync

## Authorization and builder choices

The user authorized building accounts/sync on 2026-11-06 and selected Supabase
with email codes. Q8/Q9 require usable guest access and workout-record-only sync.
The implementation uses explicit Preview sync / Confirm sync controls initially.
Supabase project creation, email configuration and cloud deployment belong to the
user. Implementation can proceed against synthetic local data before that setup.

## Observable contract

- Guest mode uses the existing IndexedDB database. Each authenticated UUID uses
  its own database. Signing out returns to the guest library. Account changes
  clear session video/set-link state and reset screen drafts and timers.
- Sign-in uses email OTP, with actionable errors and a saved session when browser
  storage permits. Missing service configuration leaves guest logging available.
  No service-role key is included in client configuration.
- Signed-in Home offers Account and sync. An explicit guest-copy action reuses
  backup merge rules and the destination revision. Guest records stay recoverable.
- Manual sync covers the manual library, including its one active workout and
  routines. Strict existing validation rejects media and unknown fields.
- A three-way merge compares the previous shared snapshot, the current device,
  and the server. Independent additions and edits merge. Deletions propagate when
  the other side matches the base. Concurrent changes to the same record require
  an explicit device/cloud choice, including edit-versus-delete conflicts.
- Two different active workouts block sync with an instruction to finish one.
  A choice never silently removes a second active workout.
- A preview is bound to local and remote revisions. The remote write compares
  its revision atomically. The local merged library and shared baseline commit
  in one IndexedDB transaction. Late/stale previews and overlapping operations
  cannot overwrite newer local saves. An uncertain remote response is retried by
  previewing again against the unchanged baseline.
- UI reports successful sync only after both saves complete. Network/server or
  local storage failures retain local records and provide retry/reload guidance.
  Sync has a request deadline and authenticated identity is checked per request.
- Server access is restricted to the authenticated user's row. Anonymous access,
  another user's records, direct writes, stale writes and malformed payloads are
  tested. Database writes use a revision-checked function with fixed search path.

## Implementation sequence

1. Add `src/core/workoutSync.ts` and tests for deterministic three-way merging,
   conflicts, active-workout transitions, deletes, ordering and validation.
2. Extend `workoutRepository.ts` with optional database namespace and atomic sync
   metadata. Add store sync methods with save ordering and preview guards. Test
   account isolation, stale revisions, transaction rollback and uncertain retries.
3. Add the pinned Supabase SDK, `src/core/accountService.ts`, account lifecycle
   state and React account UI. Preserve App's injectable stores. Production root
   selects account libraries, clears session links on identity changes and exposes
   explicit guest-copy/sync actions. Test OTP failures, cleanup, sign-out,
   offline logging, unconfigured startup and real repository-backed UI flows.
4. Add `supabase/migrations/` SQL plus minimal scoped guidance/setup README and
   `.env.example`. Exercise the actual SQL in an isolated, disposable PostgreSQL
   container using synthetic auth identities. No existing containers are changed.
5. Run focused tests per step, then full tests/lint/build, native sync and affected
   browser checks. Obtain one fresh read-only review of the complete branch,
   resolve supported defects and rerun affected checks. Update compact handoff,
   one STATUS entry and changed architectural/privacy contracts, then integrate
   through the established reviewed fast-forward Git workflow.

## Completion evidence and limits

The deliverable includes runnable client code, a deployable schema and repeatable
tests. Local PostgreSQL can establish SQL behavior. SDK/request mocks establish
client protocol and lifecycle behavior. Hosted email delivery, cloud credentials,
real cross-device service access and physical iPhone testing require their own
observations and must be recorded as pending until performed.
