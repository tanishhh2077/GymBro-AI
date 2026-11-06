import type { WorkoutData } from '@/types/workout';
import { summarizeWorkout, workoutDuration } from '@/core/workoutSummary';

export function WorkoutSummary({ data, id, available, onHome, onHistory }:
  { data: WorkoutData; id?: string; available: boolean; onHome: () => void; onHistory: (id: string) => void }) {
  const workout = available ? data.history.find(value => value.id === id) : undefined;
  if (!workout) return <div className="space-y-4"><h1 className="text-3xl font-bold text-white">Workout summary</h1>
    <p className="text-slate-400">{available ? 'This saved workout is no longer available.' : 'Reload saved workouts to open the summary.'}</p>
    <button type="button" className="btn-ghost" onClick={onHome}>Back to Home</button></div>;
  const summary = summarizeWorkout(workout);
  const stats = [
    ['Elapsed time', workoutDuration(summary.durationMs)], ['Exercises', summary.exercises],
    ['Logged sets', summary.sets], ['Regular sets', summary.regular], ['Warm-up sets', summary.warmups],
    ['Logged volume', `${summary.volume.toLocaleString(undefined, { maximumSignificantDigits: 12 })} ${summary.unit}`],
  ];
  return <div className="max-w-2xl space-y-6">
    <div><p className="mb-2 text-sm font-medium text-accent">Saved workout</p>
      <h1 className="text-3xl font-bold text-white">Workout complete</h1>
      <h2 className="mt-3 break-words text-xl font-semibold text-slate-300">{workout.name}</h2>
      <p className="mt-1 text-sm text-slate-400">{new Date(workout.finishedAt!).toLocaleString()}</p></div>
    <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-white/10 py-6">
      {stats.map(([label, value]) => <div className="min-w-0" key={label}>
        <dt className="text-sm text-slate-400">{label}</dt><dd className="mt-1 break-words text-2xl font-semibold text-white">{value}</dd>
      </div>)}
    </dl>
    <div className="space-y-2 text-sm text-slate-400">
      <p>Logged volume sums reps × entered load, including warm-ups, in this workout’s original unit.</p>
      <p>Elapsed time includes rests and time away from the app.</p>
    </div>
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={onHome}>Back to Home</button>
      <button type="button" className="btn-ghost" onClick={() => onHistory(workout.id)}>View saved workout</button></div>
  </div>;
}
