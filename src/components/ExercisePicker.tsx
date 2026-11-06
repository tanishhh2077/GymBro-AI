import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildExerciseLibrary, searchExerciseLibrary } from '@/core/exerciseCatalog';
import type { WorkoutData } from '@/types/workout';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  data: WorkoutData;
  children?: ReactNode;
}

export function ExercisePicker({ id, label, value, onChange, data, children }: Props) {
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(8);
  const library = useMemo(() => buildExerciseLibrary(data), [data]);
  const matches = searchExerciseLibrary(library, query);
  const custom = query.trim();
  function choose(name: string) {
    onChange(name); setQuery(''); setLimit(8);
    if (details.current) details.current.open = false;
    input.current?.focus();
  }
  return <div className="min-w-0">
    <label htmlFor={id} className="text-sm text-slate-300">{label}</label>
    <div className="mt-1 flex flex-wrap gap-2">
      <input ref={input} id={id} required maxLength={80} placeholder="e.g. Bench press" value={value} onChange={event => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white" />
      {children}
    </div>
    <details ref={details} className="mt-2 rounded-lg border border-white/10 px-3 py-2">
      <summary className="cursor-pointer py-1 text-sm text-accent">Browse exercise library</summary>
      <div className="space-y-3 pt-3">
        <div><label htmlFor={searchId} className="text-xs text-slate-400">Search exercise library</label>
          <input id={searchId} type="search" maxLength={80} value={query} placeholder="Name, equipment or muscle group"
            className="mt-1 w-full rounded-lg border border-white/15 bg-ink-950 px-3 py-2 text-base text-white"
            onChange={event => { setQuery(event.target.value); setLimit(8); }}
            onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} /></div>
        <p role="status" className="text-xs text-slate-400">Showing {Math.min(limit, matches.length)} of {matches.length} matching exercises.</p>
        <ul className="divide-y divide-white/10">{matches.slice(0, limit).map(exercise => <li key={exercise.name}>
          <button type="button" aria-label={`Use ${exercise.name}`} onClick={() => choose(exercise.name)}
            className="block w-full rounded-md px-1 py-3 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-accent">
            <span className="block break-words text-sm font-semibold text-white">{exercise.name}</span>
            <span className="mt-1 block text-xs text-slate-400">{exercise.source === 'Built-in' ? `${exercise.muscle} · ${exercise.equipment}` : exercise.source}</span>
          </button>
        </li>)}</ul>
        {matches.length > limit && <button type="button" className="btn-ghost" onClick={() => setLimit(current => current + 8)}>Show more exercises</button>}
        {!matches.length && <p className="text-sm text-slate-400">No matching exercise. You can use your own name.</p>}
        {custom && !library.some(exercise => exercise.name === custom) && <button type="button" className="btn-ghost max-w-full text-left"
          aria-label={`Use custom exercise ${custom}`} onClick={() => choose(custom)}>
          <span className="min-w-0 break-words">Use “{custom}” as a custom exercise</span>
        </button>}
      </div>
    </details>
  </div>;
}
