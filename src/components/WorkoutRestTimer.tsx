import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { REST_DURATIONS } from '@/store/useExerciseRest';

type Rest = { phase: 'idle' } | { phase: 'running'; endsAt: number; maximumMs: number } | { phase: 'paused'; remainingMs: number };
const MAX_REST_SECONDS = 3600;
function clock(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export interface WorkoutRestTimerHandle {
  afterSetLogged: (seconds?: number, exerciseName?: string) => void;
  startForExercise: (seconds: number, exerciseName: string) => void;
}

export const WorkoutRestTimer = forwardRef<WorkoutRestTimerHandle>(function WorkoutRestTimer(_props, ref) {
  const id = useId();
  const [duration, setDuration] = useState(90);
  const [custom, setCustom] = useState(false);
  const [minutes, setMinutes] = useState('1');
  const [seconds, setSeconds] = useState('30');
  const customSeconds = Number(minutes) * 60 + Number(seconds);
  const validCustom = /^\d+$/.test(minutes) && /^\d+$/.test(seconds)
    && Number(seconds) < 60 && customSeconds >= 1 && customSeconds <= MAX_REST_SECONDS;
  const selectedDuration = custom && validCustom ? customSeconds : duration;
  const [rest, setRest] = useState<Rest>({ phase: 'idle' });
  const [now, setNow] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [sound, setSound] = useState(false);
  const [vibration, setVibration] = useState(false);
  const [soundStatus, setSoundStatus] = useState('');
  const [vibrationStatus, setVibrationStatus] = useState('');
  const audio = useRef<AudioContext | null>(null);
  const releaseTone = useRef<(() => void) | null>(null);
  const armed = useRef(false);
  const didVibrate = useRef(false);
  const remainingMs = rest.phase === 'idle' ? selectedDuration * 1000 : rest.phase === 'paused' ? rest.remainingMs
    : Math.max(0, Math.min(rest.maximumMs, rest.endsAt - now));
  const complete = rest.phase !== 'idle' && remainingMs === 0;
  const counting = rest.phase === 'running' && !complete;
  const paused = rest.phase === 'paused' && !complete;

  const begin = useCallback((seconds: number, name: string) => {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_REST_SECONDS) return;
    armed.current = true;
    const current = Date.now();
    setDuration(seconds); setExerciseName(name); setNow(current);
    setCustom(!REST_DURATIONS.includes(seconds));
    setMinutes(String(Math.floor(seconds / 60))); setSeconds(String(seconds % 60));
    setRest({ phase: 'running', endsAt: current + seconds * 1000, maximumMs: seconds * 1000 });
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

  useEffect(() => () => {
    armed.current = false;
    const context = audio.current;
    audio.current = null;
    releaseTone.current?.(); releaseTone.current = null;
    if (context) void context.close().catch(() => {});
    if (didVibrate.current) {
      try { navigator.vibrate?.(0); } catch { /* Some devices reject cancellation. */ }
    }
  }, []);

  useEffect(() => {
    if (!complete || rest.phase !== 'running' || !armed.current) return;
    armed.current = false;
    if (sound && audio.current) {
      const context = audio.current;
      try {
        if (context.state !== 'running') throw new Error('Audio suspended');
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        releaseTone.current?.();
        const release = () => { oscillator.onended = null; oscillator.disconnect(); gain.disconnect(); };
        releaseTone.current = release;
        oscillator.frequency.value = 660;
        gain.gain.value = 0.15;
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { release(); if (releaseTone.current === release) releaseTone.current = null; };
        oscillator.start(); oscillator.stop(context.currentTime + 0.2);
      } catch { releaseTone.current?.(); releaseTone.current = null; setSoundStatus('Sound was blocked or unavailable. Enable sound again to retry.'); }
    }
    if (vibration) {
      try {
        if (!navigator.vibrate(200)) setVibrationStatus('Vibration was blocked or unavailable.');
        else didVibrate.current = true;
      } catch { setVibrationStatus('Vibration was blocked or unavailable.'); }
    }
  }, [complete, rest.phase, sound, vibration]);

  async function enableSound(enabled: boolean) {
    setSound(enabled); setSoundStatus('');
    const previous = audio.current; audio.current = null;
    releaseTone.current?.(); releaseTone.current = null;
    if (previous) void previous.close().catch(() => {});
    if (!enabled) return;
    if (typeof window.AudioContext !== 'function') {
      setSound(false); setSoundStatus('Sound is unavailable in this browser.'); return;
    }
    let context: AudioContext | null = null;
    try {
      context = new window.AudioContext(); audio.current = context;
      await context.resume();
      if (audio.current !== context) return;
      if (context.state !== 'running') throw new Error('Audio suspended');
      setSoundStatus('Sound enabled for this workout.');
    } catch {
      if (audio.current !== context) return;
      audio.current = null;
      if (context) void context.close().catch(() => {});
      setSound(false); setSoundStatus('Sound was blocked or unavailable. Enable sound again to retry.');
    }
  }

  function start() {
    if (custom && !validCustom && !paused) return;
    armed.current = true;
    const current = Date.now();
    const remaining = paused && rest.phase === 'paused' ? rest.remainingMs : selectedDuration * 1000;
    if (!paused) setDuration(selectedDuration);
    setNow(current); setRest({ phase: 'running', endsAt: current + remaining, maximumMs: remaining });
  }
  function pause() {
    armed.current = false;
    if (rest.phase !== 'running') return;
    const current = Date.now();
    setNow(current);
    setRest({ phase: 'paused', remainingMs: Math.max(0, Math.min(rest.maximumMs, rest.endsAt - current)) });
  }
  function adjust(deltaSeconds: number) {
    if (!counting || rest.phase !== 'running') return;
    const current = Date.now();
    const remaining = Math.max(0, Math.min(rest.maximumMs, rest.endsAt - current));
    // An unseen expiry must complete rather than resurrect the old run.
    const next = remaining === 0 ? 0 : Math.max(0, Math.min(MAX_REST_SECONDS * 1000, remaining + deltaSeconds * 1000));
    setNow(current);
    setRest({ phase: 'running', endsAt: current + next, maximumMs: next });
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
        {rest.phase === 'idle' && custom && !validCustom ? '--:--' : clock(Math.ceil(remainingMs / 1000))}
      </output>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor={`${id}-duration`} className="mb-1 block text-xs text-slate-400">Rest duration</label>
        <select id={`${id}-duration`} value={custom ? 'custom' : duration} disabled={counting || paused}
          className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white disabled:opacity-50"
          onChange={event => {
            if (event.target.value === 'custom') { setCustom(true); setExerciseName(''); setRest({ phase: 'idle' }); return; }
            const next = Number(event.target.value);
            if (REST_DURATIONS.includes(next)) { setCustom(false); setDuration(next); setExerciseName(''); setRest({ phase: 'idle' }); }
          }}>
          {REST_DURATIONS.map(seconds => <option key={seconds} value={seconds}>{clock(seconds)}</option>)}
          <option value="custom">Custom</option>
        </select>
      </div>
      {custom && <fieldset disabled={counting || paused} className="flex flex-wrap gap-3">
        <legend className="text-xs text-slate-400">Custom duration</legend>
        <label className="text-xs text-slate-400">Minutes
          <input aria-label="Custom minutes" type="number" inputMode="numeric" min="0" max="60" step="1" value={minutes}
            aria-invalid={!validCustom} aria-describedby={`${id}-custom-help`}
            onChange={event => { setMinutes(event.target.value); setRest({ phase: 'idle' }); }}
            className="mt-1 block w-20 rounded-lg border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400">Seconds
          <input aria-label="Custom seconds" type="number" inputMode="numeric" min="0" max="59" step="1" value={seconds}
            aria-invalid={!validCustom} aria-describedby={`${id}-custom-help`}
            onChange={event => { setSeconds(event.target.value); setRest({ phase: 'idle' }); }}
            className="mt-1 block w-20 rounded-lg border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white" />
        </label>
      </fieldset>}
      {counting ? <button type="button" className="btn-ghost" onClick={pause}>Pause timer</button>
        : <button type="button" className="btn-primary" disabled={!paused && custom && !validCustom} onClick={start}>{paused ? 'Resume timer' : 'Start rest timer'}</button>}
      {rest.phase !== 'idle' && <button type="button" className="btn-ghost" onClick={() => { armed.current = false; setRest({ phase: 'idle' }); }}>Reset timer</button>}
    </div>
    {custom && <p id={`${id}-custom-help`} role={validCustom ? undefined : 'alert'} className="mt-2 text-xs text-slate-400">
      Enter whole minutes and seconds (0–59), totaling 1 second to 60 minutes. Select Start to begin.
    </p>}
    <div className="mt-3 flex flex-wrap gap-3">
      <button type="button" className="btn-ghost" disabled={!counting} onClick={() => adjust(-15)}>-15 seconds</button>
      <button type="button" className="btn-ghost" disabled={!counting} onClick={() => adjust(15)}>+15 seconds</button>
    </div>
    <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
      <input type="checkbox" checked={autoStart} onChange={event => setAutoStart(event.target.checked)} className="h-4 w-4 accent-accent" />
      Start rest automatically after logging a set
    </label>
    <div className="mt-4 space-y-2 text-sm text-slate-300">
      <label className="flex items-center gap-3"><input type="checkbox" checked={sound} onChange={event => { void enableSound(event.target.checked); }} className="h-4 w-4 accent-accent" />Sound on completion</label>
      {soundStatus && <p role="status" className="text-xs text-slate-400">{soundStatus}</p>}
      <label className="flex items-center gap-3"><input type="checkbox" checked={vibration} onChange={event => {
        const enabled = event.target.checked;
        if (enabled && typeof navigator.vibrate !== 'function') {
          setVibration(false); setVibrationStatus('Vibration is unavailable in this browser.');
        } else { setVibration(enabled); setVibrationStatus(''); }
      }} className="h-4 w-4 accent-accent" />Vibrate on completion</label>
      {vibrationStatus && <p role="status" className="text-xs text-slate-400">{vibrationStatus}</p>}
    </div>
    <p id={`${id}-limits`} className="mt-3 text-xs text-slate-500">
      Auto-rest starts after a new set saves. You can also start manually. Timer, auto-rest and alert choices reset on reload or a new workout.
      Completion appears here. Optional sound and vibration depend on browser support and device settings, without a guaranteed background alert.
    </p>
  </section>;
});
