import { useId, useRef, useState } from 'react';
import type { Workout } from '@/types/workout';

function dayKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDayFromKey(key: string, month: Date, totalDays: number): number | null {
  if (!key) return null;
  const prefix = `${String(month.getFullYear()).padStart(4, '0')}-${String(month.getMonth() + 1).padStart(2, '0')}-`;
  if (key.startsWith(prefix)) {
    const d = parseInt(key.slice(prefix.length), 10);
    if (d >= 1 && d <= totalDays) return d;
  }
  return null;
}

export function WorkoutCalendar({ history, from, to, onSelect }: {
  history: readonly Workout[]; from: string; to: string; onSelect: (day: string) => void;
}) {
  const id = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() => {
    const latest = history.reduce((time, workout) => Math.max(time, workout.finishedAt!), -1);
    const date = latest < 0 ? new Date() : new Date(latest);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const counts = new Map<string, number>();
  for (const workout of history) {
    const key = dayKey(new Date(workout.finishedAt!));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: totalDays }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const count = days.reduce((sum, day) => sum + (counts.get(dayKey(day)) ?? 0), 0);
  const title = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const selectedDay = parseDayFromKey(from === to ? from : '', month, totalDays);
  const activeDay = Math.min(totalDays, Math.max(1, focusedDay ?? selectedDay ?? 1));

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, dayNumber: number) {
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!navKeys.includes(event.key)) return;
    event.preventDefault();

    let next = dayNumber;
    if (event.key === 'ArrowLeft') next = dayNumber - 1;
    else if (event.key === 'ArrowRight') next = dayNumber + 1;
    else if (event.key === 'ArrowUp') next = dayNumber - 7;
    else if (event.key === 'ArrowDown') next = dayNumber + 7;
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = totalDays;

    if (next < 1 || next > totalDays) return;
    setFocusedDay(next);
    const nextBtn = gridRef.current?.querySelector<HTMLButtonElement>(`button[data-day="${next}"]`);
    nextBtn?.focus();
  }

  return <section aria-label="Workout calendar" className="min-w-0 space-y-3 rounded-xl border border-white/10 p-3">
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous month" className="btn-ghost px-3" onClick={() => {
        setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
        setFocusedDay(null);
      }}>‹</button>
      <h2 id={id} aria-live="polite" className="text-center font-semibold text-white">{title}</h2>
      <button type="button" aria-label="Next month" className="btn-ghost px-3" onClick={() => {
        setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
        setFocusedDay(null);
      }}>›</button>
    </div>
    <p className="text-xs text-slate-400">Completed workouts by local day. Choose a day to set both date filters. Counts include all saved workouts.</p>
    <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400" aria-hidden="true">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
    </div>
    <div ref={gridRef} aria-labelledby={id} className="grid grid-cols-7 gap-1">
      {Array.from({ length: month.getDay() }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
      {days.map(day => {
        const d = day.getDate();
        const key = dayKey(day);
        const workouts = counts.get(key) ?? 0;
        const label = `${day.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${workouts} ${workouts === 1 ? 'workout' : 'workouts'}`;
        const isSelected = from === key && to === key;
        return <button
          type="button"
          key={key}
          data-day={d}
          tabIndex={d === activeDay ? 0 : -1}
          aria-label={label}
          aria-pressed={isSelected}
          className={`min-h-11 min-w-0 rounded-lg border py-1 text-sm focus-visible:outline focus-visible:outline-accent ${isSelected ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-slate-300'}`}
          onClick={() => {
            setFocusedDay(d);
            onSelect(key);
          }}
          onFocus={() => setFocusedDay(d)}
          onKeyDown={e => handleKeyDown(e, d)}
        ><span className="block">{d}</span><span className="block text-[10px] text-accent" aria-hidden="true">{workouts > 0 ? workouts : '\u00a0'}</span></button>;
      })}
    </div>
    {!count && <p className="text-sm text-slate-400">No completed workouts this month.</p>}
  </section>;
}
