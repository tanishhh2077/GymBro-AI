import type { WorkoutData } from '@/types/workout';
import { summarizeWorkout, workoutDuration } from '@/core/workoutSummary';
import { supersetNames, weightParts } from './trainingDetailText';

export function WorkoutSummary({ data, id, available, onHome, onHistory }:
  { data: WorkoutData; id?: string; available: boolean; onHome: () => void; onHistory: (id: string) => void }) {
  const workout = available ? data.history.find(value => value.id === id) : undefined;
  if (!workout) return <div className="space-y-4"><h1 className="text-3xl font-bold text-white">Workout summary</h1>
    <p className="text-slate-400">{available ? 'This saved workout is no longer available.' : 'Reload saved workouts to open the summary.'}</p>
    <button type="button" className="btn-ghost" onClick={onHome}>Back to Home</button></div>;
  const summary = summarizeWorkout(workout);
  const groups = supersetNames(workout.exercises);
  const stats = [
    ['Elapsed time', workoutDuration(summary.durationMs)], ['Exercises', summary.exercises],
    ['Logged sets', summary.sets], ['Regular sets', summary.regular], ['Warm-up sets', summary.warmups],
    ['Logged volume', `${summary.volume.toLocaleString(undefined, { maximumSignificantDigits: 12 })} ${summary.unit}`],
    ...(summary.bodyweightSets ? [['Bodyweight sets', summary.bodyweightSets]] : []),
  ];
  return <div className="max-w-2xl space-y-6">
    <div><p className="mb-2 text-sm font-medium text-accent">Saved workout</p>
      <h1 className="text-3xl font-bold text-white">Workout complete</h1>
      <h2 className="mt-3 break-words text-xl font-semibold text-slate-300">{workout.name}</h2>
      <p className="mt-1 text-sm text-slate-400">{new Date(workout.finishedAt!).toLocaleString()}</p></div>
    {workout.note && <section aria-labelledby="summary-workout-note">
      <h2 id="summary-workout-note" className="text-sm font-semibold text-slate-300">Workout note</h2>
      <p className="mt-1 whitespace-pre-wrap break-words text-slate-200">{workout.note}</p>
    </section>}
    <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-white/10 py-6">
      {stats.map(([label, value]) => <div className="min-w-0" key={label}>
        <dt className="text-sm text-slate-400">{label}</dt><dd className="mt-1 break-words text-2xl font-semibold text-white">{value}</dd>
      </div>)}
    </dl>
    <div className="space-y-2 text-sm text-slate-400">
      <p>Logged volume sums reps × entered load, including warm-ups, in this workout’s original unit.</p>
      <p>Bodyweight exercises are left out of volume because their sets record only added or assisted load, not your body mass; they are counted as bodyweight sets instead. RPE never changes these totals.</p>
      <p>Elapsed time includes rests and time away from the app.</p>
    </div>
    <section aria-labelledby="summary-sets" className="space-y-3">
      <h2 id="summary-sets" className="text-lg font-semibold text-white">Logged sets</h2>
      <p className="text-xs text-slate-500">Converted weights (≈) are rounded to the nearest 0.5 for reading only; saved values stay in {workout.unit}.</p>
      {workout.exercises.map(exercise => <div key={exercise.id} className="rounded-lg bg-white/5 p-3">
        <h3 className="break-words font-semibold text-slate-200">{exercise.name}</h3>
        {(exercise.superset !== undefined || exercise.bodyweight) && <p className="text-xs text-accent">
          {[exercise.superset !== undefined ? groups.get(exercise.superset) : '', exercise.bodyweight ? 'Bodyweight exercise' : ''].filter(Boolean).join(' · ')}</p>}
        <ol className="mt-2 space-y-1 text-sm text-slate-300">{exercise.sets.map((set, index) => {
          const [weight, alternate] = weightParts(set.weight, workout.unit, exercise.bodyweight);
          return <li key={set.id}>{index + 1}. {set.reps} reps × {weight}{alternate && <span className="text-xs text-slate-500"> (≈ {alternate})</span>}
            {set.rpe !== undefined && ` · RPE ${set.rpe}`}{set.kind === 'warmup' && ' · Warm-up'}</li>;
        })}</ol>
      </div>)}
    </section>
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={onHome}>Back to Home</button>
      <button type="button" className="btn-ghost" onClick={() => onHistory(workout.id)}>View saved workout</button></div>
  </div>;
}
