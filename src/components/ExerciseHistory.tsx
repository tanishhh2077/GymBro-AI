import { useId, useMemo, useState } from 'react';
import { buildExerciseHistory } from '@/core/exerciseHistory';
import type { WeightUnit, Workout } from '@/types/workout';
import { formatWeight } from '@/core/weightDisplay';

interface Props {
  history: readonly Workout[];
  name: string;
  unit: WeightUnit;
  /** Bodyweight entries store added load, so they are listed apart from loaded entries of the same name. */
  bodyweight?: boolean;
  startedAt: number;
}

const PAGE_SIZE = 5;

export function ExerciseHistory(props: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <div className="mb-4 rounded-lg border border-white/10 p-3">
    <button type="button" className="py-1 text-sm text-accent underline underline-offset-4"
      aria-expanded={open} aria-controls={`${id}-history`} onClick={() => setOpen(value => !value)}>Exercise history</button>
    <div id={`${id}-history`} hidden={!open}>
      {open && <HistoryRecords {...props} />}
    </div>
  </div>;
}

function HistoryRecords({ history, name, unit, bodyweight = false, startedAt }: Props) {
  const titleId = useId();
  const entries = useMemo(() => buildExerciseHistory(history, startedAt, name, unit, bodyweight),
    [history, startedAt, name, unit, bodyweight]);
  const [selection, setSelection] = useState({ entries, page: 0 });
  const page = selection.entries === entries ? selection.page : 0;
  const offset = page * PAGE_SIZE;
  const visible = entries.slice(offset, offset + PAGE_SIZE);
  return <section aria-labelledby={titleId} className="mt-3 space-y-3">
    <h3 id={titleId} className="text-sm font-semibold text-slate-300">Recent exercise history</h3>
    <p className="text-xs text-slate-500">Same saved exercise name, {unit} unit and {bodyweight ? 'bodyweight' : 'loaded'} setting. Actual sets from workouts finished by the start of this workout. Newest first.</p>
    {!entries.length && <p className="text-sm text-slate-400">No completed sets for {name} ({unit}) before this workout.</p>}
    {visible.map(entry => <article key={entry.workoutId} className="rounded-lg bg-white/5 p-3">
      <h4 className="break-words text-sm font-semibold text-slate-300">{entry.workoutName}</h4>
      <p className="mt-1 text-xs text-slate-400">{new Date(entry.finishedAt).toLocaleDateString()}</p>
      {entry.exercises.map((exercise, exerciseIndex) => <div key={exercise.id} className="mt-2">
        {entry.exercises.length > 1 && <p className="text-xs text-slate-400">Entry {exerciseIndex + 1}</p>}
        <ol className="space-y-1 text-sm text-slate-300">{exercise.sets.map((set, setIndex) => <li key={set.id}>
          {setIndex + 1}. {set.kind === 'warmup' ? 'Warm-up' : 'Regular'} · {set.reps} reps × {formatWeight(set.weight, unit, { bodyweight })}
        </li>)}</ol>
      </div>)}
    </article>)}
    {entries.length > 0 && <div>
      <p className="text-xs text-slate-400" aria-live="polite">Showing workouts {offset + 1}–{Math.min(offset + PAGE_SIZE, entries.length)} of {entries.length}.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={page === 0}
          onClick={() => setSelection({ entries, page: page - 1 })}>Newer workouts</button>
        <button type="button" className="btn-ghost" disabled={offset + PAGE_SIZE >= entries.length}
          onClick={() => setSelection({ entries, page: page + 1 })}>Older workouts</button>
      </div>
    </div>}
  </section>;
}
