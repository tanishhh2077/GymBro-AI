import { useId, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { RoutineInput, WeightUnit, WorkoutRoutine } from '@/types/workout';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { ExercisePicker } from './ExercisePicker';
import { confirmDiscard, useUnsavedChanges } from './unsavedChanges';
import { exerciseBlocks, supersetNames } from './trainingDetailText';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';
interface Row { key: string; name: string; sets: string; reps: string; weight: string; superset?: string; bodyweight: boolean }
function blankRow(key: string): Row { return { key, name: '', sets: '', reps: '', weight: '', bodyweight: false }; }
function withoutGroup(row: Row): Row { const copy = { ...row }; delete copy.superset; return copy; }
/** Index range of the superset holding `index`, or just that row; mirrors how the store moves active exercises. */
function blockAt(rows: readonly Row[], index: number): [number, number] {
  const group = rows[index].superset;
  let start = index, end = index;
  if (group === undefined) return [start, end];
  while (start > 0 && rows[start - 1].superset === group) start -= 1;
  while (end < rows.length - 1 && rows[end + 1].superset === group) end += 1;
  return [start, end];
}
/** A superset needs two members; a lone survivor returns to a plain exercise. */
function pruneGroups(rows: readonly Row[]): Row[] {
  return rows.map(row => row.superset !== undefined && rows.filter(r => r.superset === row.superset).length < 2 ? withoutGroup(row) : row);
}

export function RoutineEditor({ store, routine, expectedRevision, onClose }: {
  store: WorkoutStore; routine?: WorkoutRoutine; expectedRevision: number; onClose: (saved: boolean) => void;
}) {
  const state = useStore(store);
  const id = useId();
  const sequence = useRef(0);
  const [name, setName] = useState(routine?.name ?? '');
  const [unit, setUnit] = useState<WeightUnit>(routine?.unit ?? 'lb');
  // Every saved plan field is loaded into the draft so an edit never drops superset, bodyweight or target weight.
  const [rows, setRows] = useState<Row[]>(() => routine ? routine.exercises.map(e => ({ key: e.id, name: e.name,
    sets: e.targetSets === undefined ? '' : String(e.targetSets), reps: e.targetReps === undefined ? '' : String(e.targetReps),
    weight: e.targetWeight === undefined ? '' : String(e.targetWeight),
    ...(e.superset !== undefined ? { superset: e.superset } : {}), bodyweight: e.bodyweight === true }))
    : [blankRow('draft:0')]);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [opened] = useState(() => JSON.stringify({ name, unit, rows }));
  const dirty = JSON.stringify({ name, unit, rows }) !== opened;
  useUnsavedChanges(dirty);
  const [error, setError] = useState('');
  const disabled = !state.loaded || state.busy || state.needsReload;
  const groups = supersetNames(rows);
  const choosable = selected.filter(key => rows.some(row => row.key === key && row.superset === undefined));
  function change(key: string, field: 'name' | 'sets' | 'reps' | 'weight', value: string) {
    setRows(current => current.map(row => row.key === key ? { ...row, [field]: value } : row));
  }
  function move(key: string, direction: number) {
    setRows(current => {
      const at = current.findIndex(row => row.key === key);
      if (at < 0) return current;
      const [start, end] = blockAt(current, at);
      if (direction < 0 ? start === 0 : end === current.length - 1) return current;
      // Swap this block with the whole neighbouring block, so supersets stay together.
      const [before, after] = direction < 0 ? [blockAt(current, start - 1), [start, end]] : [[start, end], blockAt(current, end + 1)];
      return [...current.slice(0, before[0]), ...current.slice(after[0], after[1] + 1), ...current.slice(before[0], before[1] + 1),
        ...current.slice(after[1] + 1)];
    });
  }
  function group() {
    setError('');
    const indexes = choosable.map(key => rows.findIndex(row => row.key === key)).sort((a, b) => a - b);
    if (indexes.some((index, position) => index !== indexes[0] + position)) {
      setError('Choose exercises that are next to each other. Move them together first, then group them.'); return;
    }
    const groupId = `draft-group-${++sequence.current}`, members = new Set(choosable);
    setRows(current => current.map(row => members.has(row.key) ? { ...row, superset: groupId } : row));
    setSelected([]);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const input: RoutineInput = { name, unit, exercises: rows.map(row => ({ name: row.name,
      ...(row.sets.trim() ? { targetSets: Number(row.sets) } : {}), ...(row.reps.trim() ? { targetReps: Number(row.reps) } : {}),
      // Blank stays absent: the store rejects an explicit undefined target.
      ...(row.weight.trim() ? { targetWeight: Number(row.weight) } : {}),
      ...(row.superset !== undefined ? { superset: row.superset } : {}), ...(row.bodyweight ? { bodyweight: true as const } : {}) })) };
    const result = routine ? await state.updateRoutine(routine.id, expectedRevision, input) : await state.createRoutine(input);
    if (result.ok) onClose(true); else setError(result.message);
  }
  function rowFields(row: Row, index: number) {
    const [start, end] = blockAt(rows, index);
    return <fieldset key={row.key} className="min-w-0 rounded-xl border border-white/10 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-300">Exercise {index + 1}</legend>
      <ExercisePicker id={`${id}-${row.key}-name`} label={`Exercise ${index + 1} name`} value={row.name}
        onChange={value => change(row.key, 'name', value)} data={state.data} />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
        <label htmlFor={`${id}-${row.key}-bodyweight`} className="flex items-center gap-2">
          <input id={`${id}-${row.key}-bodyweight`} type="checkbox" checked={row.bodyweight}
            onChange={event => setRows(current => current.map(r => r.key === row.key ? { ...r, bodyweight: event.target.checked } : r))} />
          Bodyweight exercise for exercise {index + 1}</label>
        {row.superset === undefined && <label htmlFor={`${id}-${row.key}-select`} className="flex items-center gap-2">
          <input id={`${id}-${row.key}-select`} type="checkbox" checked={choosable.includes(row.key)}
            onChange={event => setSelected(current => event.target.checked ? [...current, row.key] : current.filter(key => key !== row.key))} />
          Select exercise {index + 1} for superset</label>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label htmlFor={`${id}-${row.key}-sets`} className="text-xs text-slate-400">Target sets for exercise {index + 1}</label>
          <input id={`${id}-${row.key}-sets`} type="number" inputMode="numeric" min={1} max={100} step={1} placeholder="Optional"
            className={inputClass} value={row.sets} onChange={e => change(row.key, 'sets', e.target.value)} /></div>
        <div><label htmlFor={`${id}-${row.key}-reps`} className="text-xs text-slate-400">Target reps for exercise {index + 1}</label>
          <input id={`${id}-${row.key}-reps`} type="number" inputMode="numeric" min={1} max={1000} step={1} placeholder="Optional"
            className={inputClass} value={row.reps} onChange={e => change(row.key, 'reps', e.target.value)} /></div>
        <div className="col-span-2"><label htmlFor={`${id}-${row.key}-weight`} className="text-xs text-slate-400">Target {row.bodyweight ? 'added weight' : 'weight'} for exercise {index + 1} ({unit})</label>
          <input id={`${id}-${row.key}-weight`} type="number" inputMode="decimal" min={0} max={10000} step="any" placeholder="Optional"
            className={inputClass} value={row.weight} onChange={e => change(row.key, 'weight', e.target.value)} /></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={start === 0} aria-label={`Move exercise ${index + 1} up`} onClick={() => move(row.key, -1)}>Move up</button>
        <button type="button" className="btn-ghost" disabled={end === rows.length - 1} aria-label={`Move exercise ${index + 1} down`} onClick={() => move(row.key, 1)}>Move down</button>
        <button type="button" className="btn-ghost text-danger" aria-label={`Remove routine exercise ${index + 1}`}
          onClick={() => setRows(current => pruneGroups(current.filter(e => e.key !== row.key)))}>Remove</button>
      </div>
    </fieldset>;
  }
  return <div className="space-y-5">
    <div><h1 className="text-3xl font-bold text-white">{routine ? 'Edit routine' : 'New routine'}</h1>
      <p className="mt-2 text-sm text-slate-400">Plan exercises in order. Optional targets are separate from the sets you actually log.</p></div>
    {error && error !== state.error && <p role="alert" className="text-sm text-warn">{error}</p>}
    <form aria-label="Save routine" onSubmit={save}>
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor={`${id}-name`} className="text-sm text-slate-300">Routine name</label>
            <input id={`${id}-name`} required maxLength={80} className={inputClass} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label htmlFor={`${id}-unit`} className="text-sm text-slate-300">Routine weight unit</label>
            <select id={`${id}-unit`} className={inputClass} value={unit} onChange={e => setUnit(e.target.value as WeightUnit)}>
              <option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option>
            </select></div>
        </div>
        {rows.length > 1 && <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3">
          <button type="button" className="btn-ghost" disabled={choosable.length < 2} onClick={group}>Group as superset</button>
          <p className="min-w-0 flex-1 text-xs text-slate-400">Select two or more neighbouring exercises to group them. A superset moves as one block.</p>
        </div>}
        <div className="space-y-4">{exerciseBlocks(rows).map(block => {
          if (block.group === undefined) return rowFields(block.items[0], block.start);
          const label = groups.get(block.group)!;
          return <div key={block.group} role="group" aria-label={label} className="space-y-4 border-l-4 border-accent/60 pl-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-accent">{label} · {block.items.length} exercises</p>
              <button type="button" className="btn-ghost" aria-label={`Ungroup ${label}`}
                onClick={() => setRows(current => current.map(row => row.superset === block.group ? withoutGroup(row) : row))}>Ungroup superset</button>
            </div>
            {block.items.map((row, offset) => rowFields(row, block.start + offset))}
          </div>;
        })}</div>
        {!rows.length && <p className="text-sm text-slate-400">Add at least one exercise before saving.</p>}
        <button type="button" className="btn-ghost" disabled={rows.length >= 100} onClick={() => {
          const key = `draft:${++sequence.current}`; setRows(current => [...current, blankRow(key)]);
        }}>Add routine exercise</button>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn-primary" disabled={!rows.length}>Save routine</button>
          <span className="text-xs text-slate-500">Targets: 1–100 sets, 1–1000 reps, 0–10000 {unit}, or leave blank.</span></div>
      </fieldset>
    </form>
    <button type="button" className="text-sm text-slate-400 underline underline-offset-4" disabled={state.busy} onClick={() => { if (confirmDiscard(dirty)) onClose(false); }}>Cancel routine edit</button>
  </div>;
}
