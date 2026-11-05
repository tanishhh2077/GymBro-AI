import { useId } from 'react';
import type { RecordedSet } from '@/types/progress';
import type { WeightUnit } from '@/types/workout';

const axisNumber = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 });

export function WorkoutProgressChart({ workouts, unit }: {
  workouts: readonly RecordedSet[];
  unit: WeightUnit;
}) {
  const id = useId();
  if (workouts.length === 0) return null;

  const scaleMaximum = Math.max(1, ...workouts.map(record => record.weight));
  const singleWorkout = workouts.length === 1;
  const coordinates = workouts.map((record, index) => ({
    x: singleWorkout ? 50 : 4 + 92 * index / (workouts.length - 1),
    y: 96 - 92 * record.weight / scaleMaximum,
  }));
  const points = coordinates.map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(' ');
  const firstPoint = coordinates[0];
  const ticks = [
    { position: 4, value: scaleMaximum },
    { position: 50, value: scaleMaximum / 2 },
    { position: 96, value: 0 },
  ];

  return <section aria-labelledby={`${id}-heading`} className="border-y border-white/10 py-5">
    <h3 id={`${id}-heading`} className="font-semibold text-white">Heaviest load per workout</h3>
    <p className="mt-1 text-sm text-slate-400">Each point is one completed workout, evenly spaced in finish order.</p>
    <p className="mb-3 mt-3 text-xs text-slate-400">Logged weight ({unit})</p>
    <div className="flex items-start gap-3">
      <div aria-hidden="true" className="relative h-44 w-14 shrink-0 text-right text-xs tabular-nums text-slate-400">
        {ticks.map(tick => <span key={tick.position} className="absolute right-0 -translate-y-1/2" style={{ top: `${tick.position}%` }}>
          {axisNumber.format(tick.value)}
        </span>)}
      </div>
      <div className="min-w-0 flex-1">
        <svg role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
          viewBox="0 0 100 100" preserveAspectRatio="none" className="block h-44 w-full">
          <title id={`${id}-title`}>Heaviest logged load per completed workout ({unit})</title>
          <desc id={`${id}-description`}>{workouts.length} completed workouts in finish order. Exact values and source links appear in the workout table.</desc>
          {ticks.map(tick => <line key={tick.position} x1={4} x2={96} y1={tick.position} y2={tick.position}
            stroke="currentColor" vectorEffect="non-scaling-stroke" className="text-white/10" />)}
          {singleWorkout ? <path d={`M ${firstPoint.x} ${firstPoint.y} l 0.001 0`} fill="none" stroke="currentColor"
            strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="text-accent" /> :
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"
              strokeLinecap="round" vectorEffect="non-scaling-stroke" className="text-accent" />}
        </svg>
        <div aria-hidden="true" className={`mt-2 flex gap-3 px-[4%] text-xs text-slate-400 ${singleWorkout ? 'justify-center' : 'justify-between'}`}>
          <span>{new Date(workouts[0].finishedAt).toLocaleDateString()}</span>
          {!singleWorkout && <span>{new Date(workouts[workouts.length - 1].finishedAt).toLocaleDateString()}</span>}
        </div>
      </div>
    </div>
  </section>;
}
