# Account backend

Inherit [root instructions](../AGENTS.md). Task25 permits optional Supabase email
accounts and manual workout-library sync. Deploying or configuring a real project
requires the user's account action. Only public project configuration belongs in
the client. Keep admin keys, email tokens and human records out of Git and logs.

- Migrations own database contracts. Restrict reads to `auth.uid()` and writes to
  the validated revision-checked RPC. Explicitly control function privileges and
  security-definer search paths. Never add media storage or video-transfer APIs.
- Tests use isolated disposable PostgreSQL containers, synthetic identities and
  manual records. Leave existing Docker containers and volumes intact.
- Record cloud, local SQL and simulated-client evidence separately. Local auth
  stubs in SQL tests establish database authorization behavior, not email delivery.
