import type { WorkoutData } from '@/types/workout';
import type { ReactNode } from 'react';

interface Props {
  data: WorkoutData; available: boolean; busy: boolean;
  onWorkout: () => void; onAnalyze: () => void; onHistory: (id?: string) => void;
  onRoutines: () => void;
  onProgress: () => void;
  onBackup: () => void;
  appearance?: ReactNode;
  onAccount?: () => void;
  accountLabel?: string;
}
export function WorkoutHome({ data, available, busy, onWorkout, onAnalyze, onHistory, onRoutines, onProgress, onBackup, appearance, onAccount, accountLabel }: Props) {
  const sets = data.history.reduce((total, w) => total + w.exercises.reduce((n, e) => n + e.sets.length, 0), 0);
  const history = [...data.history].sort((a, b) => b.finishedAt! - a.finishedAt!);
  return <div className="space-y-7">
    <div><h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Your training.</h1>
      <p className="mt-2 text-slate-400">Log your workouts. Review your bench press.</p></div>
    <div className="grid grid-cols-2 gap-3">
      <button type="button" aria-label={data.active ? 'Resume workout' : 'Start workout'} onClick={onWorkout}
        disabled={!available || busy} className="min-h-32 min-w-0 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left transition hover:bg-accent/15 disabled:opacity-50">
        <span className="block text-lg font-bold text-accent">{data.active ? 'Resume workout' : 'Start workout'}</span>
        <span className="mt-2 block break-words text-sm text-slate-300">{data.active ? data.active.name : 'Sets, reps and weights'}</span>
      </button>
      <button type="button" aria-label="Analyze video" onClick={onAnalyze}
        className="min-h-32 rounded-2xl border border-pink-400/40 bg-pink-400/10 p-4 text-left transition hover:bg-pink-400/15">
        <span className="block text-lg font-bold text-pink-300">Analyze video</span>
        <span className="mt-2 block text-sm text-slate-300">Side-view bench press review</span>
      </button>
    </div>
    {available && <section aria-label="Training totals" className="space-y-4 border-y border-white/10 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">Training totals</h2>
        <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={onProgress}>View progress</button>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <div><dt className="text-sm text-slate-400">Workouts saved</dt><dd className="mt-1 text-3xl font-semibold text-white">{data.history.length}</dd></div>
        <div><dt className="text-sm text-slate-400">Sets logged</dt><dd className="mt-1 text-3xl font-semibold text-white">{sets}</dd></div>
      </dl>
    </section>}
    {available && <section className="flex flex-wrap items-center justify-between gap-3" aria-label="Saved routines">
      <div><h2 className="text-lg font-semibold text-white">Your routines</h2>
        <p className="mt-1 text-sm text-slate-400">{data.routines?.length ?? 0} saved · exercise plans for a fresh workout</p></div>
      <button type="button" className="btn-ghost" disabled={busy} onClick={onRoutines}>Manage routines</button>
    </section>}
    {available && <section aria-labelledby="recent-workouts">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="recent-workouts" className="text-lg font-semibold text-white">Recent workouts</h2>
        {history.length > 0 && <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={() => onHistory()}>View workout history</button>}</div>
      {!history.length ? <p className="text-sm text-slate-400">Your completed workouts will appear here. Start a workout to log your first set.</p> :
        <ul className="divide-y divide-white/10">{history.slice(0, 5).map(w => <li key={w.id}>
          <button type="button" onClick={() => onHistory(w.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
            <span className="min-w-0 flex-1"><span className="block break-words font-semibold text-white">{w.name}</span><span className="mt-1 block text-sm text-slate-400">{new Date(w.finishedAt!).toLocaleDateString()} · {w.exercises.length} exercises</span></span>
            <span className="text-sm text-slate-400">View</span>
          </button></li>)}</ul>}
    </section>}
    <section className="space-y-3 border-t border-white/10 pt-5">
      {appearance}
      {onAccount && <div className="space-y-2"><button type="button" className="btn-ghost" onClick={onAccount}>Account and sync</button>
        <p className="break-words text-xs text-slate-500">{accountLabel}</p></div>}
      <button type="button" className="btn-ghost" onClick={onBackup}>Backup and restore</button>
      <p className="text-xs leading-relaxed text-slate-500">Workout logs are saved on this device. Clearing this app or browser’s data removes them. Keep a backup file for recovery. Video analysis is available for bench press.</p>
    </section>
  </div>;
}
