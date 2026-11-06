import { execFile, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';

const container = `gymbro-sync-test-${process.pid}-${Date.now()}`;
const label = 'gymbro.ai.purpose=sync-database-test';
function docker(args, input) {
  return execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000 });
}
function sql(text) { return docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q'], text); }
let owned = false;
try {
  docker(['run', '--rm', '-d', '--network', 'none', '--name', container, '--label', label,
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']);
  owned = true;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'postgres']); ready = true; break; }
    catch { await setTimeout(250); }
  }
  if (!ready) throw new Error('The isolated PostgreSQL test container did not become ready.');
  sql(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
  sql(readFileSync(new URL('../supabase/migrations/202611060001_workout_sync.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/sync.sql', import.meta.url), 'utf8'));
  sql("insert into auth.users values ('33333333-3333-4333-8333-333333333333')");
  const race = `set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
    select public.sync_workout_library(0, '{"version":2,"revision":0,"active":null,"history":[]}'::jsonb);`;
  const writers = await Promise.allSettled([0, 1].map(() => promisify(execFile)('docker',
    ['exec', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-c', race], { timeout: 20_000 })));
  const rejected = writers.filter(value => value.status === 'rejected');
  if (writers.filter(value => value.status === 'fulfilled').length !== 1 || rejected.length !== 1 ||
    !rejected[0].reason.stderr.includes('Cloud revision changed')) throw new Error('Concurrent initial writes did not serialize correctly.');
  sql("select public.test_assert((select revision=1 from public.workout_libraries where user_id='33333333-3333-4333-8333-333333333333'), 'concurrent write kept one revision');");
  process.stdout.write('Authorization, payload validation, stale writes, rollback and concurrent-writer checks passed.\n');
  process.stdout.write(`Database sync checks passed on ${docker(['exec', container, 'psql', '-U', 'postgres', '-Atc', 'show server_version']).trim()}.\n`);
} catch (error) {
  process.stderr.write(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (owned) {
    const purpose = docker(['inspect', '--format', '{{index .Config.Labels "gymbro.ai.purpose"}}', container]).trim();
    if (purpose !== 'sync-database-test') throw new Error('Refusing to remove a container without this test ownership label.');
    docker(['rm', '-f', container]);
  }
}
