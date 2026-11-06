import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useState } from 'react';
import { REST_DURATIONS } from '@/store/useExerciseRest';

type Rest = { phase: 'idle' } | { phase: 'running'; endsAt: number } | { phase: 'paused'; remainingMs: number };
function clock(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export interface WorkoutRestTimerHandle {
  afterSetLogged: (seconds?: number, exerciseName?: string) => void;
  startForExercise: (seconds: number, exerciseName: string) => void;
}

export const WorkoutRestTimer = forwardRef<WorkoutRestTimerHandle>(function WorkoutRestTimer(_props, ref) {
  const id = useId();
  const [duration, setDuration] = useState(90);
  const [rest, setRest] = useState<Rest>({ phase: 'idle' });
  const [now, setNow] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const remainingMs = rest.phase === 'idle' ? duration * 1000 : rest.phase === 'paused' ? rest.remainingMs
    : Math.max(0, Math.min(duration * 1000, rest.endsAt - now));
  const complete = rest.phase !== 'idle' && remainingMs === 0;
  const counting = rest.phase === 'running' && !complete;
  const paused = rest.phase === 'paused' && !complete;

  const begin = useCallback((seconds: number, name: string) => {
    if (!REST_DURATIONS.includes(seconds)) return;
    const current = Date.now();
    setDuration(seconds); setExerciseName(name); setNow(current);
    setRest({ phase: 'running', endsAt: current + seconds * 1000 });
  }, []);
  useImperativeHandle(ref, () => ({
    afterSetLogged(seconds = duration, name = '') { if (autoStart) begin(seconds, name); },
    startForExercise: begin,
  }), [autoStart, begin, duration]);

  useEffect(() => {
    if (!counting) return;
    // Callbacks may be delayed while hidden; the deadline remains the clock.
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [counting]);

  function start() {
    const current = Date.now();
    const remaining = paused && rest.phase === 'paused' ? rest.remainingMs : duration * 1000;
    setNow(current); setRest({ phase: 'running', endsAt: current + remaining });
  }
  function pause() {
    if (rest.phase !== 'running') return;
    const current = Date.now();
    setNow(current);
    setRest({ phase: 'paused', remainingMs: Math.max(0, Math.min(duration * 1000, rest.endsAt - current)) });
  }

  return <section aria-labelledby={`${id}-title`} aria-describedby={`${id}-limits`} className="card mb-6 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id={`${id}-title`} className="font-semibold text-white">Rest timer</h2>
        {exerciseName && <p className="mt-1 break-words text-xs text-slate-400">{exerciseName}</p>}
        <p role="status" aria-live="polite" className={`mt-1 text-sm ${complete ? 'text-accent' : 'text-slate-400'}`}>
          {complete ? 'Rest complete.' : counting ? 'Resting…' : paused ? 'Paused.' : 'Not started.'}
        </p>
      </div>
      <output aria-label="Rest time remaining" aria-live="off" className="font-mono text-3xl font-semibold tabular-nums text-white">
        {clock(Math.ceil(remainingMs / 1000))}
      </output>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor={`${id}-duration`} className="mb-1 block text-xs text-slate-400">Rest duration</label>
        <select id={`${id}-duration`} value={duration} disabled={counting || paused}
          className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white disabled:opacity-50"
          onChange={event => {
            const next = Number(event.target.value);
            if (REST_DURATIONS.includes(next)) { setDuration(next); setExerciseName(''); setRest({ phase: 'idle' }); }
          }}>
          {REST_DURATIONS.map(seconds => <option key={seconds} value={seconds}>{clock(seconds)}</option>)}
        </select>
      </div>
      {counting ? <button type="button" className="btn-ghost" onClick={pause}>Pause timer</button>
        : <button type="button" className="btn-primary" onClick={start}>{paused ? 'Resume timer' : 'Start rest timer'}</button>}
      {rest.phase !== 'idle' && <button type="button" className="btn-ghost" onClick={() => setRest({ phase: 'idle' })}>Reset timer</button>}
    </div>
    <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
      <input type="checkbox" checked={autoStart} onChange={event => setAutoStart(event.target.checked)} className="h-4 w-4 accent-accent" />
      Start rest automatically after logging a set
    </label>
    <p id={`${id}-limits`} className="mt-3 text-xs text-slate-500">
      Auto-rest starts after a new set saves. You can also start manually. Timer and auto-rest reset on reload or a new workout.
      Completion appears here, without a background alert.
    </p>
  </section>;
});
