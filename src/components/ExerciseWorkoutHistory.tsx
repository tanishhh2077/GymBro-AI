import { useId, useState } from 'react';
import type { ExerciseHistoryWorkout } from '@/core/exerciseHistory';
import type { WeightUnit } from '@/types/workout';

const PAGE_SIZE = 10;

/** Actual logged sets, including warm-ups, from each completed workout with one exact name and unit. */
export function ExerciseWorkoutHistory({ entries, name, unit, periodLabel, onHistory }: {
  entries: readonly ExerciseHistoryWorkout[];
  name: string;
  unit: WeightUnit;
  periodLabel: string;
  onHistory: (id: string) => void;
}) {
  const titleId = useId();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = entries.slice(0, visible);
  return <section aria-labelledby={titleId} className="space-y-3">
    <h2 id={titleId} className="text-xl font-semibold text-white">Completed workouts</h2>
    <p className="text-sm text-slate-400">Actual sets, including warm-ups, from completed workouts with this exact name and {unit} unit. Newest first.</p>
    {!entries.length && <p className="text-slate-400">No completed workouts for {name} ({unit}) in {periodLabel}.</p>}
    <div aria-label="Completed workouts for this exercise" role="list" className="space-y-3">
      {shown.map(entry => <article role="listitem" key={entry.workoutId} className="min-w-0 rounded-lg bg-white/5 p-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-slate-200">{entry.workoutName}</h3>
            <p className="mt-1 text-xs text-slate-400">{new Date(entry.finishedAt).toLocaleDateString()}</p>
          </div>
          <button type="button" className="shrink-0 py-1 text-sm text-accent underline underline-offset-4"
            aria-label={`Open workout ${entry.workoutName} from ${new Date(entry.finishedAt).toLocaleString()}`}
            onClick={() => onHistory(entry.workoutId)}>View workout</button>
        </div>
        {entry.exercises.map((exercise, exerciseIndex) => <div key={exercise.id} className="mt-2">
          {entry.exercises.length > 1 && <p className="text-xs text-slate-400">Entry {exerciseIndex + 1}</p>}
          <ol className="space-y-1 text-sm text-slate-300">{exercise.sets.map((set, setIndex) => <li key={set.id} className="tabular-nums">
            {setIndex + 1}. {set.kind === 'warmup' ? 'Warm-up' : 'Regular'} · {set.reps} reps × {set.weight} {unit}
          </li>)}</ol>
        </div>)}
      </article>)}
    </div>
    {entries.length > 0 && <p className="text-xs text-slate-400" aria-live="polite">Showing {shown.length} of {entries.length} completed workouts.</p>}
    {visible < entries.length && <button type="button" className="btn-ghost" onClick={() => setVisible(current => current + PAGE_SIZE)}>Show more completed workouts</button>}
  </section>;
}
