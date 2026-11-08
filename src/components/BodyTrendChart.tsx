import { useId, useMemo, useState } from 'react';
import { bodyTrend } from '@/core/bodyLog';
import { PROGRESS_PERIODS, progressRangeStart, type ProgressPeriod } from '@/core/progressRange';
import type { BodyEntry, BodyTrendKey, LengthUnit } from '@/types/body';
import type { WeightUnit } from '@/types/workout';
import { BODY_MEASUREMENT_NAMES } from '@/core/workouts';

const BODY_TREND_LABELS: Record<BodyTrendKey, string> = {
  weight: 'Body weight',
  neck: 'Neck',
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  leftArm: 'Left arm',
  rightArm: 'Right arm',
  leftThigh: 'Left thigh',
  rightThigh: 'Right thigh',
};

const ALL_BODY_TREND_KEYS: readonly BodyTrendKey[] = [
  'weight',
  ...BODY_MEASUREMENT_NAMES,
];

const axisNumber = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });

export interface BodyTrendChartProps {
  readonly entries: readonly BodyEntry[];
  readonly initialKey?: BodyTrendKey;
  readonly initialPeriod?: ProgressPeriod;
}

export function BodyTrendChart({
  entries,
  initialKey = 'weight',
  initialPeriod = 'all',
}: BodyTrendChartProps) {
  const id = useId();
  const [key, setKey] = useState<BodyTrendKey>(initialKey);
  const [{ period, now }, setRange] = useState(() => ({ period: initialPeriod, now: Date.now() }));
  const [chosenUnit, setChosenUnit] = useState<WeightUnit | LengthUnit | undefined>(undefined);

  const start = useMemo(() => progressRangeStart(period, now), [period, now]);

  const trend = useMemo(() => {
    return bodyTrend(entries, key, { start }, chosenUnit);
  }, [entries, key, start, chosenUnit]);

  const label = BODY_TREND_LABELS[key] ?? key;
  const unit = trend.unit;

  function handleKeyChange(nextKey: BodyTrendKey) {
    setKey(nextKey);
    setChosenUnit(undefined);
  }

  function handlePeriodChange(nextPeriod: ProgressPeriod) {
    setRange({ period: nextPeriod, now: Date.now() });
  }

  const values = trend.points.map(p => p.value);
  const hasPoints = trend.points.length > 0;
  const min = hasPoints ? Math.min(...values) : 0;
  const max = hasPoints ? Math.max(...values) : 1;
  const span = max === min ? 1 : max - min;
  const single = trend.points.length === 1;

  const coordinates = trend.points.map((p, index) => ({
    x: single ? 50 : 4 + 92 * (index / (trend.points.length - 1)),
    y: 96 - 92 * ((p.value - min) / span),
  }));

  const pointsString = coordinates.map(c => `${c.x.toFixed(3)},${c.y.toFixed(3)}`).join(' ');
  const firstPoint = coordinates[0];

  const ticks = [
    { position: 4, value: max },
    { position: 50, value: (max + min) / 2 },
    { position: 96, value: min },
  ];

  return (
    <section aria-labelledby={`${id}-heading`} className="card min-w-0 space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`${id}-heading`} className="text-base font-semibold text-white">
          {label} trend
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-key`} className="sr-only">
            Select body measurement to chart
          </label>
          <select
            id={`${id}-key`}
            value={key}
            onChange={e => handleKeyChange(e.target.value as BodyTrendKey)}
            className="rounded-lg border border-white/15 bg-ink-900 px-2 py-1 text-sm text-white"
          >
            {ALL_BODY_TREND_KEYS.map(k => (
              <option key={k} value={k}>
                {BODY_TREND_LABELS[k]}
              </option>
            ))}
          </select>

          <label htmlFor={`${id}-period`} className="sr-only">
            Select time period
          </label>
          <select
            id={`${id}-period`}
            value={period}
            onChange={e => handlePeriodChange(e.target.value as ProgressPeriod)}
            className="rounded-lg border border-white/15 bg-ink-900 px-2 py-1 text-sm text-white"
          >
            {PROGRESS_PERIODS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {trend.units.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Unit:</span>
          {trend.units.map(u => (
            <button
              key={u}
              type="button"
              onClick={() => setChosenUnit(u)}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                unit === u
                  ? 'bg-accent text-on-accent'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
              aria-pressed={unit === u}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      {!hasPoints ? (
        <p className="text-sm text-slate-400">
          No {label} entries recorded in this range.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            {label} ({unit}) across {trend.points.length} {trend.points.length === 1 ? 'entry' : 'entries'}, oldest to newest.
          </p>

          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="relative h-44 w-14 shrink-0 text-right text-xs tabular-nums text-slate-400"
            >
              {ticks.map(tick => (
                <span
                  key={tick.position}
                  className="absolute right-0 -translate-y-1/2 leading-tight"
                  style={{ top: `${tick.position}%` }}
                >
                  {axisNumber.format(tick.value)}
                </span>
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <svg
                role="img"
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-desc`}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="block h-44 w-full"
              >
                <title id={`${id}-title`}>
                  {label} trend ({unit})
                </title>
                <desc id={`${id}-desc`}>
                  {trend.points.length} entries in date order. Exact values appear in the table below.
                </desc>
                {ticks.map(tick => (
                  <line
                    key={tick.position}
                    x1={4}
                    x2={96}
                    y1={tick.position}
                    y2={tick.position}
                    stroke="currentColor"
                    vectorEffect="non-scaling-stroke"
                    className="text-white/10"
                  />
                ))}
                {single ? (
                  <path
                    d={`M ${firstPoint.x} ${firstPoint.y} l 0.001 0`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={6}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className="text-accent"
                  />
                ) : (
                  <polyline
                    points={pointsString}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className="text-accent"
                  />
                )}
              </svg>

              <div
                aria-hidden="true"
                className={`mt-2 flex gap-3 px-[4%] text-xs text-slate-400 ${
                  single ? 'justify-center' : 'justify-between'
                }`}
              >
                <span>{new Date(trend.points[0].date).toLocaleDateString()}</span>
                {!single && (
                  <span>
                    {new Date(trend.points[trend.points.length - 1].date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sr-only">
            <table>
              <caption>{label} trend values</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Value ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {trend.points.map(pt => (
                  <tr key={pt.id}>
                    <td>{new Date(pt.date).toLocaleDateString()}</td>
                    <td>
                      {pt.value} {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trend.excluded.length > 0 && (
        <p className="text-xs text-slate-400">
          {trend.excluded.length} {trend.excluded.length === 1 ? 'entry' : 'entries'} excluded (different unit)
        </p>
      )}
    </section>
  );
}
