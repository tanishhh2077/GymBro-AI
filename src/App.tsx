import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { useStore } from 'zustand';
import { useSessionStore, type SessionStore } from '@/store/useSessionStore';
import { resolveSetLink } from '@/core/setLinks';
import type { SetLink } from '@/types';
import { workoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import { useAppearance } from '@/store/useAppearance';
import { AppearanceControl } from '@/components/AppearanceControl';
import { connectNativeLifecycle } from '@/mobile/nativeLifecycle';
import { WorkoutHome } from '@/components/WorkoutHome';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import { WorkoutHistory } from '@/components/WorkoutHistory';
import { WorkoutRestTimer, type WorkoutRestTimerHandle } from '@/components/WorkoutRestTimer';
import { WorkoutRoutines } from '@/components/WorkoutRoutines';
import { WorkoutProgress } from '@/components/WorkoutProgress';
import { WorkoutBackup } from '@/components/WorkoutBackup';
import { ShieldIcon } from '@/components/icons';

const AnalysisWorkspace = lazy(() => import('@/components/AnalysisWorkspace').then(module => ({ default: module.AnalysisWorkspace })));

/** Keep logging available if the optional analysis screen cannot be loaded. */
class AnalysisBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
      <p>Video analysis could not be opened. Reload the app to try again.</p>
      <button type="button" className="mt-3 underline underline-offset-4" onClick={() => window.location.reload()}>Reload app</button>
    </div>;
  }
}

type View = 'home' | 'workout' | 'analysis' | 'history' | 'routines' | 'progress' | 'backup';
export default function App({ workouts = workoutStore, session = useSessionStore }: { workouts?: WorkoutStore; session?: SessionStore } = {}) {
  const appearance = useAppearance();
  useEffect(() => connectNativeLifecycle({
    isNative: Capacitor.isNativePlatform(), app: NativeApp, session, document,
  }), [session]);
  useEffect(() => { void workouts.getState().load(); }, [workouts]);
  const state = useStore(workouts);
  const [view, setView] = useState<View>('home');
  const [selected, setSelected] = useState<string | undefined>();
  const [notice, setNotice] = useState('');
  const [pendingLink, setPendingLink] = useState<SetLink | undefined>();
  // The session holds at most one clip. Selecting only its ID and link keeps App
  // from re-rendering on every processing progress update.
  const openClipId = session(s => s.clips[0]?.id);
  const openLink = session(s => s.clips[0]?.link);
  const detachLink = session(s => s.detachLink);
  const main = useRef<HTMLElement>(null);
  const restTimer = useRef<WorkoutRestTimerHandle>(null);
  const previousView = useRef<View>('home');
  // A set row requested by Back to set; this parent effect runs after the new
  // view's children render, so it can focus the row instead of <main>.
  const focusSet = useRef<string | null>(null);
  // Set navigation focus before paint so a later effect cannot steal a user's focus.
  useLayoutEffect(() => {
    if (previousView.current !== view) {
      const row = focusSet.current ? document.getElementById(`set-row-${focusSet.current}`) : null;
      (row ?? main.current)?.focus();
    }
    focusSet.current = null;
    previousView.current = view;
  }, [view]);
  const available = state.loaded && !state.needsReload;
  // Detach on any screen, before a later restore could bring back the same IDs.
  // Unloaded data would make every link look deleted, so only loaded data counts.
  useEffect(() => {
    if (!available || !openClipId || !openLink) return;
    if (!resolveSetLink(state.data, openLink)) detachLink(openClipId);
  }, [available, openClipId, openLink, detachLink, state.data]);
  function navigate(next: View) {
    setView(next); setNotice('');
    // A pending link only applies while its Analyze screen is showing.
    if (next !== 'analysis') setPendingLink(undefined);
  }
  function openHistory(id?: string) { setSelected(id); navigate('history'); }
  function backToSet(link: SetLink) {
    const found = resolveSetLink(state.data, link);
    if (!found) return;
    focusSet.current = link.setId;
    if (found.place === 'active') navigate('workout'); else openHistory(link.workoutId);
  }
  const analysis = {
    openLink,
    onAnalyze: (link: SetLink) => { setPendingLink(link); setView('analysis'); setNotice(''); },
    onView: () => navigate('analysis'),
  };
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
      {state.data.active && <WorkoutRestTimer key={state.data.active.id} ref={restTimer} />}
      {view === 'home' && <WorkoutHome data={state.data} available={available} busy={state.busy}
        onWorkout={() => navigate('workout')} onAnalyze={() => navigate('analysis')}
        onRoutines={() => navigate('routines')}
        onProgress={() => navigate('progress')} onBackup={() => navigate('backup')} onHistory={openHistory}
        appearance={<AppearanceControl settings={appearance} />} />}
      {view === 'workout' && <WorkoutEditor store={workouts} analysis={analysis} onSetLogged={workoutId => {
        if (workouts.getState().data.active?.id === workoutId) restTimer.current?.afterSetLogged();
      }} onFinished={() => { setView('home'); setNotice('Workout saved.'); }} />}
      {view === 'history' && <WorkoutHistory store={workouts} initialId={selected} analysis={analysis} />}
      {view === 'analysis' && <AnalysisBoundary><Suspense fallback={<p role="status" className="text-sm text-slate-400">Opening video analysis…</p>}>
        <AnalysisWorkspace session={session} data={state.data} available={available} pendingLink={pendingLink}
          onClearPending={() => setPendingLink(undefined)} onBackToSet={backToSet} />
      </Suspense></AnalysisBoundary>}
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-accent">
        <path
          d="M4 9v6M20 9v6M7 12h10M7 8v8M17 8v8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
