-- Add the schema6 body log and exact-name exercise notes while retaining schema2-5
-- cloud reads and writes. Replaces the validator from 202611070002_training_detail.sql.
-- Limits match the client: 1000 body entries, 200 exercise notes of 1-500 characters.
begin;

create or replace function public.gymbro_valid_node(value jsonb, kind text, completed boolean default false)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  entry jsonb;
  seen text[] := '{}';
  closed text[] := '{}';
  identity text;
  child_kind text;
  required text[];
  run_group text;
  run_size integer := 0;
  group_id text;
  note_name text;
  note_text jsonb;
begin
  if kind = 'library' then
    if not public.gymbro_shape(value, array['version','revision','active','history'],
        case when value->'version' = '6'::jsonb then array['routines','goals','bodyLog','exerciseNotes']
          when value->'version' = '5'::jsonb then array['routines','goals'] else array['routines'] end)
      or value->'version' not in ('2'::jsonb, '3'::jsonb, '4'::jsonb, '5'::jsonb, '6'::jsonb) or value->'revision' <> '0'::jsonb
      or octet_length(value::text) > 4194304
      or jsonb_typeof(value->'history') <> 'array' or jsonb_array_length(value->'history') > 1000 then return false; end if;
    if value->'version' = '2'::jsonb and jsonb_path_exists(value, '$.**.kind') then return false; end if;
    if value->'version' in ('2'::jsonb, '3'::jsonb)
      and (jsonb_path_exists(value, '$.**.note') or jsonb_path_exists(value, '$.**.targetWeight')) then return false; end if;
    if value->'version' not in ('5'::jsonb, '6'::jsonb) and (jsonb_path_exists(value, '$.**.rpe') or jsonb_path_exists(value, '$.**.superset')
      or jsonb_path_exists(value, '$.**.bodyweight')) then return false; end if;
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
    if value ? 'goals' then
      if jsonb_typeof(value->'goals') <> 'array' or jsonb_array_length(value->'goals') > 100 then return false; end if;
      seen := '{}';
      closed := '{}';
      for entry in select * from jsonb_array_elements(value->'goals') loop
        if not public.gymbro_valid_node(entry, 'goal') then return false; end if;
        identity := entry->>'id';
        if identity = any(seen) then return false; end if;
        seen := array_append(seen, identity);
        -- One goal per exact name, unit and bodyweight setting.
        identity := jsonb_build_array(entry->'name', entry->'unit', entry ? 'bodyweight')::text;
        if identity = any(closed) then return false; end if;
        closed := array_append(closed, identity);
      end loop;
    end if;
    if value ? 'bodyLog' then
      if jsonb_typeof(value->'bodyLog') <> 'array' or jsonb_array_length(value->'bodyLog') > 1000 then return false; end if;
      seen := '{}';
      for entry in select * from jsonb_array_elements(value->'bodyLog') loop
        if not public.gymbro_valid_node(entry, 'body-entry') then return false; end if;
        identity := entry->>'id';
        if identity = any(seen) then return false; end if;
        seen := array_append(seen, identity);
      end loop;
    end if;
    -- Exercise notes are keyed by exact exercise name (1-80 trimmed characters).
    if value ? 'exerciseNotes' then
      if jsonb_typeof(value->'exerciseNotes') <> 'object'
        or (select count(*) from jsonb_object_keys(value->'exerciseNotes')) > 200 then return false; end if;
      for note_name, note_text in select * from jsonb_each(value->'exerciseNotes') loop
        if not public.gymbro_name(to_jsonb(note_name)) or not public.gymbro_valid_node(note_text, 'note-500') then return false; end if;
      end loop;
    end if;
    return true;
  end if;

  -- Free text of 1-500 trimmed characters; newline and tab are the only control characters.
  if kind = 'note-500' then
    return jsonb_typeof(value) = 'string' and length(value #>> '{}') between 1 and 500
      and (value #>> '{}') !~ '^\s|\s$' and (value #>> '{}') !~ '[\x01-\x08\x0b-\x1f\x7f-\x9f]';
  end if;

  -- A unit is present exactly when its values are; at least one of weight or measurements.
  if kind = 'body-entry' then
    if not public.gymbro_shape(value, array['id','date'], array['weight','unit','measurements','lengthUnit','note'])
      or not public.gymbro_id(value->'id') or not public.gymbro_number(value->'date', 8640000000000000)
      or not (value ? 'weight' or value ? 'measurements')
      or (value ? 'weight') <> (value ? 'unit') or (value ? 'measurements') <> (value ? 'lengthUnit') then return false; end if;
    if value ? 'weight' and (not public.gymbro_number(value->'weight', 1000, false) or (value->>'weight')::numeric <= 0
      or value->>'unit' is null or value->>'unit' not in ('kg','lb')) then return false; end if;
    if value ? 'measurements' then
      if jsonb_typeof(value->'measurements') <> 'object' or value->'measurements' = '{}'::jsonb
        or value->>'lengthUnit' is null or value->>'lengthUnit' not in ('cm','in') then return false; end if;
      for note_name, note_text in select * from jsonb_each(value->'measurements') loop
        if note_name not in ('neck','chest','waist','hips','leftArm','rightArm','leftThigh','rightThigh')
          or not public.gymbro_number(note_text, 500, false) or (note_text #>> '{}')::numeric <= 0 then return false; end if;
      end loop;
    end if;
    return not (value ? 'note') or public.gymbro_valid_node(value->'note', 'note-500');
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
      -- A superset ID is shared by two or more neighbouring exercises and never reappears later.
      group_id := entry->>'superset';
      if group_id is not null and group_id = run_group then
        run_size := run_size + 1;
      else
        if run_group is not null then
          if run_size < 2 then return false; end if;
          closed := array_append(closed, run_group);
        end if;
        if group_id = any(closed) then return false; end if;
        run_group := group_id;
        run_size := 1;
      end if;
    end loop;
    if run_group is not null and run_size < 2 then return false; end if;
    return true;
  end if;

  if kind in ('exercise','routine-exercise') then
    required := array['id','name'];
    if kind = 'exercise' then required := required || array['sets']; end if;
    if not public.gymbro_shape(value, required, array['targetSets','targetReps','targetWeight','superset','bodyweight'])
      or not public.gymbro_id(value->'id') or not public.gymbro_name(value->'name') then return false; end if;
    if value ? 'superset' and not public.gymbro_id(value->'superset') then return false; end if;
    if value ? 'bodyweight' and value->'bodyweight' <> 'true'::jsonb then return false; end if;
    if value ? 'targetSets' and (not public.gymbro_number(value->'targetSets', 100) or (value->>'targetSets')::numeric < 1) then return false; end if;
    -- A bodyweight target is added load; negative values plan assistance down to -1000.
    if value ? 'targetWeight' and value ? 'bodyweight' and (jsonb_typeof(value->'targetWeight') <> 'number' or (value->>'targetWeight')::numeric not between -1000 and 10000) then return false; end if;
    if value ? 'targetWeight' and not (value ? 'bodyweight') and not public.gymbro_number(value->'targetWeight', 10000, false) then return false; end if;
    if value ? 'targetReps' and (not public.gymbro_number(value->'targetReps', 1000) or (value->>'targetReps')::numeric < 1) then return false; end if;
    if kind = 'exercise' then
      if jsonb_typeof(value->'sets') <> 'array' or jsonb_array_length(value->'sets') > 100
        or (completed and jsonb_array_length(value->'sets') = 0) then return false; end if;
      for entry in select * from jsonb_array_elements(value->'sets') loop
        if not public.gymbro_valid_node(entry, case when value ? 'bodyweight' then 'bodyweight-set' else 'set' end) then return false; end if;
      end loop;
    end if;
    return true;
  end if;

  if kind in ('set', 'bodyweight-set') then
    return public.gymbro_shape(value, array['id','reps','weight'], array['kind','rpe'])
      and (not (value ? 'kind') or coalesce(value->>'kind' in ('regular','warmup'), false)) and public.gymbro_id(value->'id')
      and public.gymbro_number(value->'reps', 1000) and (value->>'reps')::numeric >= 1
      -- RPE is 1-10 in steps of 0.5.
      and (not (value ? 'rpe') or (public.gymbro_number(value->'rpe', 10, false) and (value->>'rpe')::numeric >= 1
        and trunc((value->>'rpe')::numeric * 2) = (value->>'rpe')::numeric * 2))
      -- Bodyweight sets store added load; negative weight down to -1000 records assistance.
      and case when kind = 'bodyweight-set' then jsonb_typeof(value->'weight') = 'number'
        and (value->>'weight')::numeric between -1000 and 10000
        else public.gymbro_number(value->'weight', 10000, false) end;
  end if;

  if kind = 'goal' then
    if not public.gymbro_shape(value, array['id','name','unit','weight','reps','createdAt'], array['bodyweight'])
      or not public.gymbro_id(value->'id') or not public.gymbro_name(value->'name')
      or value->>'unit' is null or value->>'unit' not in ('kg','lb')
      or (value ? 'bodyweight' and value->'bodyweight' <> 'true'::jsonb)
      or not public.gymbro_number(value->'createdAt', 8640000000000000)
      or not public.gymbro_number(value->'reps', 1000) or (value->>'reps')::numeric < 1 then return false; end if;
    return case when value ? 'bodyweight' then jsonb_typeof(value->'weight') = 'number'
      and (value->>'weight')::numeric between -1000 and 10000
      else public.gymbro_number(value->'weight', 10000, false) end;
  end if;
  return false;
exception when others then return false;
end
$$;

commit;
