-- Synthetic roles stand in for JWT identities supplied by Supabase/PostgREST.
create function public.test_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Failed assertion: %', label; end if; end $$;
create function public.test_denied(statement text, label text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege or invalid_parameter_value or serialization_failure or invalid_authorization_specification then return;
  end;
  raise exception 'Expected rejection: %', label;
end $$;
grant execute on function public.test_assert(boolean,text), public.test_denied(text,text) to anon, authenticated;

set role anon;
select public.test_denied('select * from public.workout_libraries', 'anonymous read');
select public.test_denied($q$select public.sync_workout_library(0, '{"version":2,"revision":0,"active":null,"history":[]}'::jsonb)$q$, 'anonymous write');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.test_assert((select count(*)=0 from public.workout_libraries), 'new account is empty');
select public.test_assert((public.sync_workout_library(0, '{"version":2,"revision":0,"active":null,"history":[]}'::jsonb)->>'revision')::int=1, 'first atomic write');
select public.test_denied($q$select public.sync_workout_library(0, '{"version":2,"revision":0,"active":null,"history":[]}'::jsonb)$q$, 'stale initial write');
select public.test_denied($q$update public.workout_libraries set revision=90$q$, 'direct update');
select public.test_denied($q$insert into public.workout_libraries(user_id,revision,data) values ('22222222-2222-4222-8222-222222222222',1,'{}')$q$, 'direct foreign insert');
select public.test_denied($q$delete from public.workout_libraries$q$, 'direct delete');
select public.test_denied($q$select public.sync_workout_library(1, '{"version":2,"revision":0,"active":null,"history":[],"video":"private"}')$q$, 'unknown media field');
select public.test_denied($q$select public.sync_workout_library(1, '{"version":2,"revision":0,"active":{"id":"a","name":"A","unit":"kg","startedAt":1,"finishedAt":null,"exercises":[{"id":"e","name":"Bench press","sets":[{"id":"s","reps":0,"weight":50}]}]},"history":[]}')$q$, 'invalid actual reps');
select public.test_denied($q$select public.sync_workout_library(1, '{"version":2,"revision":0,"active":{"id":"a","name":"A","unit":"kg","startedAt":1,"finishedAt":null,"exercises":[{"id":"e","name":"Bench press","sets":[],"frames":[]}]},"history":[]}')$q$, 'nested media field');
select public.test_denied($q$select public.sync_workout_library(1, '{"version":2,"revision":0,"active":null,"history":[],"routines":[{"id":"r","name":"Plan","unit":"kg","exercises":[{"id":"e","name":"Bench press","targetReps":0}]}]}')$q$, 'invalid target');
select public.test_denied($q$select public.sync_workout_library(1, '{"version":2,"revision":0,"active":{"id":"a","name":"A","unit":null,"startedAt":1,"finishedAt":null,"exercises":[]},"history":[]}')$q$, 'null weight unit');
select public.test_assert((select revision=1 from public.workout_libraries), 'failed writes preserve revision');
select public.test_assert((public.sync_workout_library(1, '{"version":2,"revision":0,"active":{"id":"a","name":"A","unit":"kg","startedAt":1,"finishedAt":null,"exercises":[{"id":"e","name":"Bench press","sets":[{"id":"s","reps":8,"weight":50.5}],"targetReps":10}]},"history":[],"routines":[{"id":"r","name":"Plan","unit":"lb","exercises":[{"id":"e","name":"Row","targetSets":3}]}]}'::jsonb)->>'revision')::int=2, 'manual records and routines accepted');
select public.test_denied($q$select public.sync_workout_library(1, '{"version":2,"revision":0,"active":null,"history":[]}')$q$, 'stale update');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select public.test_assert((select count(*)=0 from public.workout_libraries), 'second account cannot read first account');
select public.test_assert((public.sync_workout_library(0, '{"version":2,"revision":0,"active":null,"history":[]}'::jsonb)->>'revision')::int=1, 'second account has own revision');
select public.test_assert((select count(*)=1 from public.workout_libraries), 'second account reads only own row');
select set_config('request.jwt.claim.sub', '', false);
select public.test_assert((select count(*)=0 from public.workout_libraries), 'missing identity sees no records');
select public.test_denied($q$select public.sync_workout_library(0, '{"version":2,"revision":0,"active":null,"history":[]}')$q$, 'missing authenticated identity');
reset role;
select public.test_assert((select revision=2 from public.workout_libraries where user_id='11111111-1111-4111-8111-111111111111'), 'foreign account left first library intact');
select public.test_assert((select count(*)=2 from public.workout_libraries), 'two isolated accounts');
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.test_assert((public.sync_workout_library(2, '{"version":3,"revision":0,"active":null,"history":[{"id":"w","name":"Day","unit":"kg","startedAt":1,"finishedAt":2,"exercises":[{"id":"e","name":"Bench press","sets":[{"id":"s","reps":10,"weight":20,"kind":"warmup"}]}]}]}'::jsonb)->'data'->'history'->0->'exercises'->0->'sets'->0->>'kind')='warmup', 'schema3 warm-up round trip');
select public.test_denied($q$select public.sync_workout_library(3, '{"version":3,"revision":0,"active":{"id":"w","name":"W","unit":"kg","startedAt":1,"finishedAt":null,"exercises":[{"id":"e","name":"Bench","sets":[{"id":"s","reps":8,"weight":20,"kind":"drop"}]}]},"history":[]}')$q$, 'invalid set kind');
select public.test_denied($q$select public.sync_workout_library(3, '{"version":2,"revision":0,"active":{"id":"w","name":"W","unit":"kg","startedAt":1,"finishedAt":null,"exercises":[{"id":"e","name":"Bench","sets":[{"id":"s","reps":8,"weight":20,"kind":"warmup"}]}]},"history":[]}')$q$, 'kind rejected in schema2');
select public.test_assert((select revision=3 from public.workout_libraries), 'invalid label writes preserve latest revision');
reset role;
