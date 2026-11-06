import { useId, useState } from 'react';
import type { Workout } from '@/types/workout';

function dayKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function WorkoutCalendar({ history, from, to, onSelect }: {
  history: readonly Workout[]; from: string; to: string; onSelect: (day: string) => void;
}) {
  const id = useId();
  const [month, setMonth] = useState(() => {
    const latest = history.reduce((time, workout) => Math.max(time, workout.finishedAt!), -1);
    const date = latest < 0 ? new Date() : new Date(latest);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const counts = new Map<string, number>();
  for (const workout of history) {
    const key = dayKey(new Date(workout.finishedAt!)); counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: totalDays }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const count = days.reduce((sum, day) => sum + (counts.get(dayKey(day)) ?? 0), 0);
  const title = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return <section aria-label="Workout calendar" className="min-w-0 space-y-3 rounded-xl border border-white/10 p-3">
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous month" className="btn-ghost px-3" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
      <h2 id={id} aria-live="polite" className="text-center font-semibold text-white">{title}</h2>
      <button type="button" aria-label="Next month" className="btn-ghost px-3" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
    </div>
    <p className="text-xs text-slate-400">Completed workouts by local day. Choose a day to set both date filters. Counts include all saved workouts.</p>
    <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400" aria-hidden="true">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
    </div>
    <div aria-labelledby={id} className="grid grid-cols-7 gap-1">
      {Array.from({ length: month.getDay() }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
      {days.map(day => {
        const key = dayKey(day), workouts = counts.get(key) ?? 0;
        const label = `${day.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${workouts} ${workouts === 1 ? 'workout' : 'workouts'}`;
        return <button type="button" key={key} aria-label={label} aria-pressed={from === key && to === key}
          className={`min-h-11 min-w-0 rounded-lg border py-1 text-sm focus-visible:outline focus-visible:outline-accent ${from === key && to === key ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-slate-300'}`}
          onClick={() => onSelect(key)}><span className="block">{day.getDate()}</span><span className="block text-[10px] text-accent" aria-hidden="true">{workouts > 0 ? workouts : '\u00a0'}</span></button>;
      })}
    </div>
    {!count && <p className="text-sm text-slate-400">No completed workouts this month.</p>}
  </section>;
}
