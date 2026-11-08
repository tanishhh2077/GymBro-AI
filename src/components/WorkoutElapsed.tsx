import { useEffect, useState } from 'react';
import { formatElapsedClock } from '@/core/workoutClock';

/**
 * Running clock for the active workout. It lives in its own small component so the once-a-second state change
 * re-renders only this text, not the whole editor. The time comes from the saved start time, so a reload or a
 * hidden tab never loses it; the timer is released on unmount and paused while the page is hidden.
 */
export function WorkoutElapsed({ startedAt, now = Date.now }: { startedAt: number; now?: () => number }) {
  const [current, setCurrent] = useState(() => now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => setCurrent(now());
    const stop = () => { if (timer !== undefined) { clearInterval(timer); timer = undefined; } };
    const sync = () => {
      stop();
      if (document.visibilityState === 'hidden') return;
      tick(); timer = setInterval(tick, 1000);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { stop(); document.removeEventListener('visibilitychange', sync); };
  }, [now]);
  const clock = formatElapsedClock(startedAt, current);
  if (clock === null) return null;
  return <p className="mt-1 text-sm text-slate-400">Time so far <span className="font-semibold text-white">{clock}</span>
    <span className="text-xs text-slate-500"> · includes rests</span></p>;
}
