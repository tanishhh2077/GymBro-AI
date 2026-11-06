-- Add schema4 workout notes and planned target weights while retaining schema2/3
-- cloud reads and writes. Replaces the validator from 202611060002_set_kinds.sql.
begin;

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
      or value->'version' not in ('2'::jsonb, '3'::jsonb, '4'::jsonb) or value->'revision' <> '0'::jsonb
      or octet_length(value::text) > 4194304
      or jsonb_typeof(value->'history') <> 'array' or jsonb_array_length(value->'history') > 1000 then return false; end if;
    if value->'version' = '2'::jsonb and jsonb_path_exists(value, '$.**.kind') then return false; end if;
    if value->'version' in ('2'::jsonb, '3'::jsonb)
      and (jsonb_path_exists(value, '$.**.note') or jsonb_path_exists(value, '$.**.targetWeight')) then return false; end if;
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
    if not public.gymbro_shape(value, required, case when kind = 'workout' then array['note'] else '{}'::text[] end)
      or not public.gymbro_id(value->'id')
      or not public.gymbro_name(value->'name') or value->>'unit' is null or value->>'unit' not in ('kg','lb')
      or jsonb_typeof(value->'exercises') <> 'array' or jsonb_array_length(value->'exercises') > 100 then return false; end if;
    if kind = 'workout' then
      if not public.gymbro_number(value->'startedAt', 8640000000000000) then return false; end if;
      -- Notes are trimmed text of 1-1000 characters; newline and tab are the only control characters.
      if value ? 'note' and (jsonb_typeof(value->'note') <> 'string' or length(value->>'note') not between 1 and 1000
        or (value->>'note') ~ '^\s|\s$' or (value->>'note') ~ '[\x01-\x08\x0b-\x1f\x7f-\x9f]') then return false; end if;
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
    if not public.gymbro_shape(value, required, array['targetSets','targetReps','targetWeight'])
      or not public.gymbro_id(value->'id') or not public.gymbro_name(value->'name') then return false; end if;
    if value ? 'targetSets' and (not public.gymbro_number(value->'targetSets', 100) or (value->>'targetSets')::numeric < 1) then return false; end if;
    if value ? 'targetWeight' and not public.gymbro_number(value->'targetWeight', 10000, false) then return false; end if;
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
    return public.gymbro_shape(value, array['id','reps','weight'], array['kind'])
      and (not (value ? 'kind') or coalesce(value->>'kind' in ('regular','warmup'), false)) and public.gymbro_id(value->'id')
      and public.gymbro_number(value->'reps', 1000) and (value->>'reps')::numeric >= 1
      and public.gymbro_number(value->'weight', 10000, false);
  end if;
  return false;
exception when others then return false;
end
$$;

commit;
