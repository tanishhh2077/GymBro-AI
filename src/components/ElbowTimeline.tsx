import { useMemo } from 'react';
import type { PoseResult } from '@/types';
import { adjacentElbowSample, elbowSegments, measureElbows, nearestElbowSample,
  type ElbowMeasurement, type ElbowSide, type ElbowUnavailableReason } from '@/core/elbowAngles';

export interface ElbowTimelineProps {
  pose: PoseResult;
  time: number;
  onSeek: (time: number) => void;
}
const REASONS: Record<ElbowUnavailableReason, string> = {
  'no-pose': 'No pose in this observation.',
  'missing-joint': 'Required joint not recorded.',
  'invalid-coordinate': 'Required joint coordinates are invalid.',
  'outside-image': 'Required joint is outside the image.',
  'unknown-visibility': 'Joint visibility unavailable.',
  'low-visibility': 'Required joints are obscured.',
  'degenerate-geometry': 'Joint positions overlap.',
};
const SIDES: ElbowSide[] = ['left', 'right'];
const COLORS = { left: '#4ade80', right: '#60a5fa' };
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function ElbowTimeline({ pose, time, onSeek }: ElbowTimelineProps) {
  const series = useMemo(() => {
    try { return measureElbows(pose); }
    catch { return null; }
  }, [pose]);
  // Compute the immutable plot once per result; playback changes only the cursor
  // and selected observation, without recalculating all angles or point strings.
  const traces = useMemo(() => series ? SIDES.flatMap((side) =>
    elbowSegments(series, side).map((segment, index) => ({
      key: `${side}-${index}`, side, singleton: segment.length === 1,
      points: segment.map(({ time, degrees }) => `${time / series.duration * 580},${104 - degrees / 180 * 104}`).join(' '),
      x: segment[0].time / series.duration * 580,
      y: 104 - segment[0].degrees / 180 * 104,
    }))) : [], [series]);

  if (!series) return (
    <section aria-label="Estimated 2D elbow angles" className="border-t border-white/10 px-4 py-4">
      <h3 className="text-sm font-semibold text-white">Estimated 2D elbow angles</h3>
      <p className="mt-2 text-sm text-slate-400">Angle data unavailable for this result. You can still replay or remove the video.</p>
    </section>
  );

  const sample = nearestElbowSample(series, time);
  const previous = adjacentElbowSample(series, time, 'previous');
  const next = adjacentElbowSample(series, time, 'next');
  const cursor = Number.isFinite(time) && time >= 0 && time <= series.duration ? time / series.duration * 580 : null;

  return (
    <section aria-label="Estimated 2D elbow angles" className="border-t border-white/10 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Estimated 2D elbow angles</h3>
          <p className="mt-1 text-xs text-slate-400">Image-space estimates; not a technique assessment.</p>
        </div>
        <p className="text-xs text-slate-400">
          {sample ? `Observation ${sample.frameIndex}, sample ${sample.time.toFixed(3)} s` : 'No nearby observation.'}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        {SIDES.map((side) => <div key={side}>
          <dt className="text-xs text-slate-400">{side === 'left' ? 'Left elbow (solid line)' : 'Right elbow (dashed line)'}</dt>
          <dd aria-label={`${side === 'left' ? 'Left' : 'Right'} elbow angle`} className="mt-1 text-lg tabular-nums text-white">
            {formatAngle(sample?.[side])}
          </dd>
          {sample?.[side].reason && <dd className="mt-1 text-xs text-slate-400">{REASONS[sample[side].reason]}</dd>}
        </div>)}
      </dl>

      {/* HTML axis labels retain their text size on phones; only the plot scales. */}
      <div aria-hidden="true" className="mt-4 grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-1 gap-y-2 text-[11px] text-slate-400">
        <div className="flex h-32 flex-col justify-between"><span>180°</span><span>90°</span><span>0°</span></div>
        <svg viewBox="0 0 580 104" preserveAspectRatio="none" className="h-32 w-full overflow-visible">
          {[0, 52, 104].map((y) => <line key={y} x1="0" x2="580" y1={y} y2={y} stroke="#ffffff14" />)}
          {traces.map((trace) => trace.singleton
            ? <circle key={trace.key} cx={trace.x} cy={trace.y} r="2.5" fill={COLORS[trace.side]} />
            : <polyline key={trace.key} points={trace.points} fill="none" stroke={COLORS[trace.side]}
                strokeWidth="2" strokeDasharray={trace.side === 'right' ? '5 3' : undefined} />)}
          {cursor !== null && <line x1={cursor} x2={cursor} y1="0" y2="104" stroke="#e2e8f0" strokeWidth="1" />}
        </svg>
        <div />
        <div className="flex justify-between"><span>0 s</span><span>{series.duration.toFixed(2)} s</span></div>
      </div>
      {!traces.length && <p className="text-sm text-slate-400">No measurable elbow observations in this clip.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" aria-label="Previous angle sample" disabled={!previous}
          onClick={() => previous && onSeek(previous.time)}
          className={`rounded-md bg-white/5 px-3 py-2 text-xs text-slate-200 disabled:opacity-40 ${FOCUS}`}>Previous sample</button>
        <button type="button" aria-label="Next angle sample" disabled={!next}
          onClick={() => next && onSeek(next.time)}
          className={`rounded-md bg-white/5 px-3 py-2 text-xs text-slate-200 disabled:opacity-40 ${FOCUS}`}>Next sample</button>
      </div>

      <details className="mt-4 text-xs leading-relaxed text-slate-400">
        <summary className={`cursor-pointer text-slate-300 ${FOCUS}`}>How these angles are estimated</summary>
        <p className="mt-2">Each value is the interior shoulder–elbow–wrist angle in the video image,
          using the source dimensions. Left and right use the model&apos;s body labels.
          Visibility below {series.minVisibility} or unavailable joints leave gaps.
          This visibility filter is not an accuracy confidence level.</p>
        <p className="mt-2">These measurements are not validated on real bench-press footage.
          Hidden joints or another visible person can produce missing or wrong estimates.
          They do not measure 3D anatomy, count reps, or judge technique. Lines connect
          raw measured samples only; missing observations and long gaps are left open.</p>
      </details>
    </section>
  );
}

function formatAngle(measurement: ElbowMeasurement | undefined): string {
  return measurement?.degrees !== undefined && measurement.degrees !== null
    ? `${Math.round(measurement.degrees)}°` : 'Unavailable';
}
