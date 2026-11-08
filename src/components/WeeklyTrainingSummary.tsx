import { useState } from 'react';
import type { WorkoutData } from '@/types/workout';
import { summarizeTrainingWeek } from '@/core/weeklyTrainingSummary';
import { workoutDuration } from '@/core/workoutSummary';

export function WeeklyTrainingSummary({ data }: { data: WorkoutData }) {
  const [enteredAt] = useState(() => Date.now());
  const summary = summarizeTrainingWeek(data, enteredAt);
  const stats = [
    ['Completed workouts', summary.workouts], ['Actual sets', summary.sets],
    ['Elapsed workout time', workoutDuration(summary.durationMs)],
    ['Entered-load volume (lb)', `${summary.volume.lb.toLocaleString(undefined, { maximumSignificantDigits: 12 })} lb`],
    ['Entered-load volume (kg)', `${summary.volume.kg.toLocaleString(undefined, { maximumSignificantDigits: 12 })} kg`],
  ];
  return <section aria-labelledby="weekly-summary-title" className="space-y-4 border-b border-white/10 pb-5">
    <div><h2 id="weekly-summary-title" className="font-semibold text-white">Last seven days</h2>
      <p className="mt-1 text-xs text-slate-400">Finished from {new Date(summary.from).toLocaleString()} through {new Date(summary.to).toLocaleString()}.</p></div>
    {!summary.workouts && <p className="text-sm text-slate-400">No completed workouts in this seven-day window.</p>}
    <dl className="grid grid-cols-2 gap-4">{stats.map(([label, value]) => <div className="min-w-0" key={label}>
      <dt className="text-sm text-slate-400">{label}</dt><dd className="mt-1 break-words text-2xl font-semibold text-white">{value}</dd>
    </div>)}</dl>
    <p className="text-xs leading-relaxed text-slate-500">Includes Regular and Warm-up sets. Volume sums reps × entered load separately by unit; bodyweight exercises are left out because their sets record only added or assisted load. Zero means no entered-load volume. Elapsed time includes rests and time away. This window is captured when you open Home.</p>
  </section>;
}
