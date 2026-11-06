import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { useStore } from 'zustand';
import { useSessionStore } from '@/store/useSessionStore';
import { workoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { connectNativeLifecycle } from '@/mobile/nativeLifecycle';
import { AnalysisWorkspace } from '@/components/AnalysisWorkspace';
import { WorkoutHome } from '@/components/WorkoutHome';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import { WorkoutHistory } from '@/components/WorkoutHistory';
import { WorkoutRestTimer } from '@/components/WorkoutRestTimer';
import { WorkoutRoutines } from '@/components/WorkoutRoutines';
import { WorkoutProgress } from '@/components/WorkoutProgress';
import { WorkoutBackup } from '@/components/WorkoutBackup';
import { ShieldIcon } from '@/components/icons';

type View = 'home' | 'workout' | 'analysis' | 'history' | 'routines' | 'progress' | 'backup';
export default function App({ workouts = workoutStore }: { workouts?: WorkoutStore } = {}) {
  useEffect(() => connectNativeLifecycle({
    isNative: Capacitor.isNativePlatform(), app: NativeApp, session: useSessionStore, document,
  }), []);
  useEffect(() => { void workouts.getState().load(); }, [workouts]);
  const state = useStore(workouts);
  const [view, setView] = useState<View>('home');
  const [selected, setSelected] = useState<string | undefined>();
  const [notice, setNotice] = useState('');
  const main = useRef<HTMLElement>(null);
  const previousView = useRef<View>('home');
  useEffect(() => {
    if (previousView.current !== view) main.current?.focus();
    previousView.current = view;
  }, [view]);
  function navigate(next: View) { setView(next); setNotice(''); }
  function openHistory(id?: string) { setSelected(id); navigate('history'); }
  const available = state.loaded && !state.needsReload;
  return <div className="app-safe-sides min-h-full">
    <Header />
    <nav aria-label="Main navigation" className="mx-auto flex w-full max-w-5xl gap-1 border-b border-white/10 px-4 py-2 sm:px-6">
      {([['home', 'Home'], ['workout', 'Workout'], ['analysis', 'Analyze'], ['routines', 'Routines']] as const).map(([target, label]) =>
        <button key={target} type="button" aria-current={view === target ? 'page' : undefined}
          className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-sm font-semibold sm:flex-none sm:px-4 ${view === target ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          onClick={() => navigate(target)}>{label}</button>)}
    </nav>
    <main ref={main} tabIndex={-1} className="app-safe-bottom mx-auto w-full max-w-5xl px-4 pt-6 outline-none sm:px-6">
      <div className="mb-4 text-xs text-slate-400" role="status" aria-live="polite">{state.busy ? 'Saving or opening workouts…' : state.needsReload ? 'Workout storage needs a reload.' : state.loaded ? 'Logged sets are saved on this device' : ''}</div>
      {state.error && <div role="alert" className="mb-5 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
        <p>{state.error}</p>{state.needsReload && <button type="button" disabled={state.busy} className="mt-3 underline underline-offset-4" onClick={() => { void state.load(); }}>Reload saved workouts</button>}
      </div>}
      <div role="status" aria-live="polite" className={notice ? 'mb-4 text-sm text-accent' : undefined}>{notice}</div>
      {state.data.active && <WorkoutRestTimer key={state.data.active.id} />}
      {view === 'home' && <WorkoutHome data={state.data} available={available} busy={state.busy}
        onWorkout={() => navigate('workout')} onAnalyze={() => navigate('analysis')}
        onRoutines={() => navigate('routines')}
        onProgress={() => navigate('progress')} onBackup={() => navigate('backup')} onHistory={openHistory} />}
      {view === 'workout' && <WorkoutEditor store={workouts} onFinished={() => { setView('home'); setNotice('Workout saved.'); }} />}
      {view === 'history' && <WorkoutHistory store={workouts} initialId={selected} />}
      {view === 'analysis' && <AnalysisWorkspace />}
      {view === 'routines' && <WorkoutRoutines store={workouts} onStarted={() => navigate('workout')} onResume={() => navigate('workout')} />}
      {view === 'progress' && <WorkoutProgress data={state.data} available={available} onHome={() => navigate('home')}
        onWorkout={() => navigate('workout')} onHistory={openHistory} />}
      {view === 'backup' && <WorkoutBackup store={workouts} onHome={() => navigate('home')} />}
    </main>
  </div>;
}

function Header() {
  return (
    <header className="app-safe-top sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-none">
            <div className="text-sm font-extrabold tracking-tight text-white">
              GymBro AI
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Your second set of eyes.
            </div>
          </div>
        </div>
        <span className="chip border border-white/5 bg-white/5 text-[11px] text-slate-300">
          <ShieldIcon width={13} className="text-accent" />
          <span className="hidden sm:inline">On-device processing</span>
          <span className="sm:hidden">On-device</span>
        </span>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-electric/20">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 9v6M20 9v6M7 12h10M7 8v8M17 8v8"
          stroke="#4ade80"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
