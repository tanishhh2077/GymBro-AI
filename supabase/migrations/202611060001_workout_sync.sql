-- Optional manual-library sync. Apply as the database owner through Supabase.
begin;

create or replace function public.gymbro_shape(value jsonb, required text[], optional text[] default '{}')
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'object' then
    value ?& required and not exists (
      select 1 from jsonb_object_keys(value) as key where not (key = any(required || optional)))
    else false end
$$;
create or replace function public.gymbro_number(value jsonb, maximum numeric, whole boolean default true)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'number' then
    value::numeric >= 0 and value::numeric <= maximum and (not whole or trunc(value::numeric) = value::numeric)
    else false end
$$;
create or replace function public.gymbro_name(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'string' and length(value #>> '{}') between 1 and 80
    and (value #>> '{}') !~ '^\s|\s$'
$$;
create or replace function public.gymbro_id(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'string' and (value #>> '{}') ~ '^[A-Za-z0-9_-]{1,80}$'
$$;

create or replace function public.gymbro_valid_node(value jsonb, kind text, completed boolean default false)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  entry jsonb;
  seen text[] := '{}';
  identity text;
  child_kind text;
  required text[];
begin
  if kind = 'library' then
    if not public.gymbro_shape(value, array['version','revision','active','history'], array['routines'])
      or value->'version' <> '2'::jsonb or value->'revision' <> '0'::jsonb
      or octet_length(value::text) > 4194304
      or jsonb_typeof(value->'history') <> 'array' or jsonb_array_length(value->'history') > 1000 then return false; end if;
    if value->'active' <> 'null'::jsonb then
      if not public.gymbro_valid_node(value->'active', 'workout', false) then return false; end if;
      seen := array[value->'active'->>'id'];
    end if;
    for entry in select * from jsonb_array_elements(value->'history') loop
      if not public.gymbro_valid_node(entry, 'workout', true) then return false; end if;
      identity := entry->>'id';
      if identity = any(seen) then return false; end if;
      seen := array_append(seen, identity);
    end loop;
    seen := '{}';
    if value ? 'routines' then
      if jsonb_typeof(value->'routines') <> 'array' or jsonb_array_length(value->'routines') > 100 then return false; end if;
      for entry in select * from jsonb_array_elements(value->'routines') loop
        if not public.gymbro_valid_node(entry, 'routine') then return false; end if;
        identity := entry->>'id';
        if identity = any(seen) then return false; end if;
        seen := array_append(seen, identity);
      end loop;
    end if;
    return true;
  end if;

  if kind in ('workout', 'routine') then
    required := array['id','name','unit','exercises'];
    if kind = 'workout' then required := required || array['startedAt','finishedAt']; end if;
    if not public.gymbro_shape(value, required) or not public.gymbro_id(value->'id')
      or not public.gymbro_name(value->'name') or value->>'unit' is null or value->>'unit' not in ('kg','lb')
      or jsonb_typeof(value->'exercises') <> 'array' or jsonb_array_length(value->'exercises') > 100 then return false; end if;
    if kind = 'workout' then
      if not public.gymbro_number(value->'startedAt', 8640000000000000) then return false; end if;
      if completed then
        if not public.gymbro_number(value->'finishedAt', 8640000000000000)
          or (value->>'finishedAt')::numeric < (value->>'startedAt')::numeric then return false; end if;
      elsif value->'finishedAt' <> 'null'::jsonb then return false;
      end if;
    end if;
    if (kind = 'routine' or completed) and jsonb_array_length(value->'exercises') = 0 then return false; end if;
    child_kind := case when kind = 'routine' then 'routine-exercise' else 'exercise' end;
    for entry in select * from jsonb_array_elements(value->'exercises') loop
      if not public.gymbro_valid_node(entry, child_kind, completed) then return false; end if;
      identity := entry->>'id';
      if identity = any(seen) then return false; end if;
      seen := array_append(seen, identity);
      if kind = 'workout' then
        for identity in select s->>'id' from jsonb_array_elements(entry->'sets') as s loop
          if identity = any(seen) then return false; end if;
          seen := array_append(seen, identity);
        end loop;
      end if;
    end loop;
    return true;
  end if;

  if kind in ('exercise','routine-exercise') then
    required := array['id','name'];
    if kind = 'exercise' then required := required || array['sets']; end if;
    if not public.gymbro_shape(value, required, array['targetSets','targetReps'])
      or not public.gymbro_id(value->'id') or not public.gymbro_name(value->'name') then return false; end if;
    if value ? 'targetSets' and (not public.gymbro_number(value->'targetSets', 100) or (value->>'targetSets')::numeric < 1) then return false; end if;
    if value ? 'targetReps' and (not public.gymbro_number(value->'targetReps', 1000) or (value->>'targetReps')::numeric < 1) then return false; end if;
    if kind = 'exercise' then
      if jsonb_typeof(value->'sets') <> 'array' or jsonb_array_length(value->'sets') > 100
        or (completed and jsonb_array_length(value->'sets') = 0) then return false; end if;
      for entry in select * from jsonb_array_elements(value->'sets') loop
        if not public.gymbro_valid_node(entry, 'set') then return false; end if;
      end loop;
    end if;
    return true;
  end if;

  if kind = 'set' then
    return public.gymbro_shape(value, array['id','reps','weight']) and public.gymbro_id(value->'id')
      and public.gymbro_number(value->'reps', 1000) and (value->>'reps')::numeric >= 1
      and public.gymbro_number(value->'weight', 10000, false);
  end if;
  return false;
exception when others then return false;
end
$$;

create table public.workout_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision between 1 and 9007199254740991),
  data jsonb not null check (public.gymbro_valid_node(data, 'library')),
  updated_at timestamptz not null default now()
);
alter table public.workout_libraries enable row level security;
revoke all on table public.workout_libraries from public, anon, authenticated;
grant select on table public.workout_libraries to authenticated;
create policy own_workout_library on public.workout_libraries for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.sync_workout_library(expected_revision bigint, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved public.workout_libraries;
begin
  if owner_id is null then raise exception 'Sign-in required' using errcode = '28000'; end if;
  if expected_revision is null or expected_revision < 0 or expected_revision >= 9007199254740991
    or payload is null or not public.gymbro_valid_node(payload, 'library') then
    raise exception 'Invalid workout library' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.workout_libraries(user_id, revision, data) values (owner_id, 1, payload)
      on conflict (user_id) do nothing returning * into saved;
    if found then return jsonb_build_object('revision', saved.revision, 'data', saved.data); end if;
  end if;
  update public.workout_libraries set revision = revision + 1, data = payload, updated_at = now()
    where user_id = owner_id and revision = expected_revision returning * into saved;
  if not found then raise exception 'Cloud revision changed' using errcode = '40001'; end if;
  return jsonb_build_object('revision', saved.revision, 'data', saved.data);
end
$$;
revoke all on function public.gymbro_shape(jsonb,text[],text[]), public.gymbro_number(jsonb,numeric,boolean),
  public.gymbro_name(jsonb), public.gymbro_id(jsonb), public.gymbro_valid_node(jsonb,text,boolean),
  public.sync_workout_library(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.sync_workout_library(bigint,jsonb) to authenticated;

commit;
