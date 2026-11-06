import { useId } from 'react';
import type { ElbowClipSummary } from '@/core/elbowSummary';

export interface ElbowSummaryPanelProps { summary: ElbowClipSummary; onSeek: (time: number) => void }
export function ElbowSummaryPanel({ summary, onSeek }: ElbowSummaryPanelProps) {
  const descriptionPrefix = useId();
  return (
    <section aria-label="Clip measurement summary" className="mt-4 border-t border-white/10 pt-4">
      <h4 className="text-sm font-semibold text-white">Clip measurement summary</h4>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(['left', 'right'] as const).map(side => (
          <div key={side} className="min-w-0">
            <h5 className={`text-xs font-semibold ${side === 'left' ? 'text-accent' : 'text-chart-right'}`}>
              {side === 'left' ? 'Left' : 'Right'} elbow
            </h5>
            <p className="mt-1 text-xs text-slate-400">
              {summary[side].measurableSamples} of {summary.totalSamples} sampled positions measurable
            </p>
            <div className="mt-2 space-y-2">
              {(['lowest', 'highest'] as const).map(extremum => {
                const point = summary[side][extremum];
                const descriptionId = `${descriptionPrefix}-${side}-${extremum}`;
                return (
                  <button key={extremum} type="button" disabled={!point}
                    aria-label={`Jump to ${extremum} ${side} elbow angle`}
                    aria-describedby={descriptionId}
                    onClick={() => point && onSeek(point.time)}
                    className="flex min-h-11 w-full flex-wrap items-center justify-between gap-1 rounded-md bg-white/5 px-3 py-2 text-left text-xs text-slate-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    <span>{extremum === 'lowest' ? 'Lowest observed' : 'Highest observed'}</span>
                    <span id={descriptionId} className="tabular-nums">
                      {point ? `${Math.round(point.degrees)}° at ${point.time.toFixed(3)} s` : 'Unavailable'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Missing samples are excluded. Extremes may reflect tracking errors;
        these are observed 2D values, not per-repetition range of motion.
      </p>
    </section>
  );
}
