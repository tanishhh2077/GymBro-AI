# Optional accounts and sync setup

Task25 uses Supabase email codes and a manually synchronized workout library.
Guest use works without service configuration. The project owner performs the
cloud-account and dashboard actions below. Local development needs Node22.23.2.

## Connect your project

1. Create a Supabase project in your own account, or select a dedicated existing
   GymBro AI project. Choose its region and plan in the dashboard.
2. Open its SQL editor and apply migrations once in filename order. Start with
   [workout sync](migrations/202611060001_workout_sync.sql), which creates the
   per-user table and revision-checked write RPC, then apply
   [schema3 set kinds](migrations/202611060002_set_kinds.sql). For a project that
   already has the first migration, apply only the second. Current clients save
   schema3 records, including Regular/Warm-up labels. Update both app clients
   before testing cross-device sync.
3. Enable email authentication. In Authentication → Email Templates → Magic Link,
   include `{{ .Token }}` in the message body so users receive a numeric code.
   The app verifies an email OTP. The default link-only template needs this change.
4. For initial tests, use an address permitted by the project's email provider.
   Supabase's default email service restricts recipients to project-team addresses
   and has rate limits. Configure your own SMTP provider before public signup.
5. Copy [.env.example](../.env.example) to `.env.local` in the project root. Set
   `VITE_SUPABASE_URL` to the project origin and
   `VITE_SUPABASE_PUBLISHABLE_KEY` to the publishable key from the dashboard.
   A legacy `anon` JWT also works. Keep secret/service-role keys on the server.
6. Restart `npm run dev`. For native copies, run `npm run mobile:sync` after setting
   the variables. Vite embeds these public values into the built app.

The email-code flow and template requirement follow the
[Supabase passwordless guide](https://supabase.com/docs/guides/auth/auth-email-passwordless).
Recipient and sending restrictions follow its
[SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
Database access follows the
[row-level security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Use the app

- Open Home → Account and sync. Enter your email, request a code and verify it.
- A signed-in account has its own local workout library. Guest records are in the
  guest library. Use Preview guest copy and Copy guest records to bring a copy
  into the signed-in account. Review errors if record IDs or active workouts clash.
- Use Preview sync on each device. Review the merged counts and any conflicting
  records. Choose device or cloud for every conflict, then Confirm sync.
- Offline edits save locally. Sync requires a connection. Re-preview after another
  device changes the cloud version. Two different active workouts require finishing
  one on its device before sync can combine the libraries.
- Sign out to return to guest mode. Account records remain in that device's local
  account library and reopen when that account signs in. Browser/app-data clearing
  removes local libraries and saved authentication. Keep JSON backups as needed.

Only validated manual workout records and routines enter the sync path. Media,
landmarks, analysis links, appearance and rest timers have separate lifetimes.
Exercise rest defaults are device-local and scoped to guest or account use.
Signing out or changing account resets the in-memory video session and screen
drafts. Authentication tokens use the SDK's browser storage behavior, including
memory-only fallback when persistent storage is unavailable.

## Verify locally

```sh
npm test
npm run lint
npm run build
npm run test:sync-db
```

The final command needs a running Docker engine. It starts a temporary
`postgres:17-alpine` container with network disabled and no published ports or
host mounts. It installs synthetic auth roles/identities, applies the actual migrations
and checks account isolation, rejected anonymous/direct/stale/malformed writes,
valid data, rollback and simultaneous initial writes. It removes its own labeled
container in `finally`. Existing containers and volumes are preserved.

SQL tests establish local PostgreSQL behavior. Client tests use synthetic service
responses. Actual Supabase email delivery, hosted auth/API configuration and
physical iPhone cross-device sync require a configured project and a user-present
test. Account deletion and automatic/background sync are subsequent product work.
