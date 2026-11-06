import { useId, useMemo } from 'react';
import { weeklyWorkoutCounts } from '@/core/weeklyWorkoutCounts';
import type { Workout } from '@/types/workout';

const WEEKS = 12;
const shortDate = (time: number) => new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (time: number) => new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const workouts = (count: number) => `${count} ${count === 1 ? 'workout' : 'workouts'}`;

export function WeeklyConsistency({ history, now }: { history: readonly Workout[]; now: number }) {
  const id = useId();
  const weeks = useMemo(() => weeklyWorkoutCounts(history, now, WEEKS), [history, now]);
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const active = weeks.filter(week => week.count > 0).length;
  const scale = Math.max(1, ...weeks.map(week => week.count));
  // The last day is the moment before the next local Sunday, which stays correct across clock changes.
  const lastDay = (end: number) => end - 1;

  return <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-3">
    <h2 id={`${id}-title`} className="text-xl font-semibold text-white">Weekly consistency</h2>
    <p className="text-sm text-slate-400">
      Completed workouts per week, oldest first. Weeks run Sunday through Saturday in local time,
      from {longDate(weeks[0].start)} through {longDate(lastDay(weeks[WEEKS - 1].end))}. Unfinished workouts are not counted.
    </p>
    <p className="text-sm text-slate-300">{total === 0 ? `No completed workouts in the last ${WEEKS} weeks.` :
      `${total} completed ${total === 1 ? 'workout' : 'workouts'} in the last ${WEEKS} weeks. ${active} of ${WEEKS} weeks have at least one.`}</p>
    <table aria-label="Completed workouts per week" className="w-full table-fixed text-left text-sm">
      <caption className="sr-only">Completed workouts in each of the last {WEEKS} weeks, oldest first</caption>
      <thead className="text-slate-400"><tr><th scope="col" className="w-[45%] py-2 pr-3">Week</th><th scope="col" className="py-2">Completed</th></tr></thead>
      <tbody className="divide-y divide-white/10">{weeks.map(week => <tr key={week.start}>
        <th scope="row" className="break-words py-2 pr-3 font-normal text-slate-300">
          {shortDate(week.start)} – {shortDate(lastDay(week.end))}
          {week.current && <span className="block text-xs text-slate-400">This week, in progress</span>}
        </th>
        <td className="py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-24 shrink-0 tabular-nums text-slate-300">{workouts(week.count)}</span>
            <div aria-hidden="true" className="h-2 min-w-0 flex-1 rounded-full bg-white/10">
              <div data-week-bar className="h-full rounded-full bg-accent" style={{ width: `${100 * week.count / scale}%` }} />
            </div>
          </div>
        </td>
      </tr>)}</tbody>
    </table>
  </section>;
}
