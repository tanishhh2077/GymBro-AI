import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { Account, AccountService } from '@/core/accountService';
import { mergeWorkoutSync, type SyncChoice, type SyncPreview } from '@/core/workoutSync';
import { mergeWorkoutBackup, type WorkoutBackup, type BackupMerge } from '@/core/workoutBackup';
import type { Workout, WorkoutRoutine } from '@/types/workout';
import type { WorkoutRepository } from '@/store/workoutRepository';
import type { WorkoutStore } from '@/store/useWorkoutStore';

interface Props { service: AccountService | null; account: Account | null; store: WorkoutStore; guest: WorkoutRepository }
const inputClass = 'mt-2 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white disabled:opacity-60';
function RecordVersion({ value }: { value: Workout | WorkoutRoutine | null }) {
  if (!value) return <p className="text-sm text-slate-400">Deleted</p>;
  return <div className="space-y-2 break-words text-sm text-slate-300">
    <p>{value.name} · {value.unit}{'finishedAt' in value ? value.finishedAt === null ? ' · Active' : ' · Completed' : ' · Routine'}</p>
    <ul className="space-y-2">{value.exercises.map(exercise => <li key={exercise.id}>
      <span className="font-medium">{exercise.name}</span>
      {'sets' in exercise && <span> · {exercise.sets.length ? exercise.sets.map(set => `${set.kind === 'warmup' ? 'Warm-up' : 'Regular'} ${set.reps} reps × ${set.weight} ${value.unit}`).join(', ') : 'No logged sets'}</span>}
      {!('sets' in exercise) && <span> · {exercise.targetSets ?? '—'} sets / {exercise.targetReps ?? '—'} reps planned</span>}
    </li>)}</ul>
  </div>;
}
export function AccountPanel({ service, account, store, guest }: Props) {
  const state = useStore(store);
  const [email, setEmail] = useState(''); const [sentTo, setSentTo] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, SyncChoice>>({});
  const [copy, setCopy] = useState<{ backup: WorkoutBackup; revision: number; merge: BackupMerge } | null>(null);
  const operation = useRef(0); const running = useRef(false);
  useEffect(() => () => { operation.current++; }, []);
  async function run(job: () => Promise<string>) {
    if (running.current) return;
    running.current = true; const token = ++operation.current;
    setBusy(true); setError(''); setNotice('');
    try { const message = await job(); if (operation.current === token) setNotice(message); }
    catch (failure) { if (operation.current === token) setError(failure instanceof Error ? failure.message : 'The action could not be completed. Try again.'); }
    finally { running.current = false; if (operation.current === token) setBusy(false); }
  }
  const disabled = busy || state.busy || !state.loaded || state.needsReload;
  const current = preview?.localRevision === state.data.revision ? preview : null;
  let merged: ReturnType<typeof mergeWorkoutSync> | undefined;
  let mergeError = '';
  if (current) {
    try { merged = mergeWorkoutSync(current.base, state.data, current.remote.data, choices); }
    catch (failure) { mergeError = failure instanceof Error ? failure.message : 'Preview sync again.'; }
  }
  function submitCode(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (!service) throw new Error('Accounts are not configured.');
      if (sentTo) { await service.verifyCode(sentTo, code); return 'Signed in.'; }
      await service.sendCode(email); setSentTo(email.trim()); return 'Check your email for a sign-in code.';
    });
  }
  return <div className="max-w-2xl space-y-6">
    <div><h1 className="text-3xl font-bold text-white">Account and sync</h1>
      <p className="mt-2 text-sm text-slate-400">Use guest mode or sign in to sync your workout records across devices.</p></div>
    <p className="text-sm text-slate-400">Sync includes workout logs and routines. Video processing stays on your device.</p>
    {error && <p role="alert" className="break-words text-sm text-warn">{error}</p>}
    <p role="status" aria-live="polite" className="text-sm text-accent">{busy ? 'Working…' : notice}</p>
    {!service ? <div className="card p-5"><h2 className="font-semibold text-white">Accounts are not configured</h2>
      <p className="mt-2 text-sm text-slate-400">Guest workouts are available. The app owner needs to connect Supabase using the account setup instructions.</p></div> :
      !account ? <form onSubmit={submitCode} className="space-y-4">
        <label className="block text-sm text-slate-300">Email address
          <input aria-label="Email address" type="email" autoComplete="email" maxLength={254} required disabled={busy || !!sentTo}
            className={inputClass} value={email} onChange={event => setEmail(event.target.value)} /></label>
        {sentTo && <label className="block text-sm text-slate-300">Email code
          <input aria-label="Email code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required
            disabled={busy} className={inputClass} value={code} onChange={event => setCode(event.target.value)} /></label>}
        <div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={busy} type="submit">{sentTo ? 'Verify email code' : 'Send email code'}</button>
          {sentTo && <button className="btn-ghost" disabled={busy} type="button" onClick={() => { setSentTo(''); setCode(''); setError(''); setNotice(''); }}>Request another code</button>}</div>
        <p className="text-xs text-slate-500">Your guest library stays available when you sign out. Signing in opens a separate account library.</p>
      </form> : <>
        <section className="space-y-3 rounded-xl border border-white/10 p-4">
          <h2 className="break-words font-semibold text-white">Signed in as {account.email}</h2>
          <p className="text-sm text-slate-400">Workout edits save locally. Use Preview sync, review any conflicts, then Confirm sync to transfer records.</p>
          <button type="button" className="btn-primary" disabled={disabled} onClick={() => { void run(async () => {
            setPreview(null); setCopy(null); setChoices({}); const value = await store.getState().previewSync(service.cloud(account.id));
            setPreview(value); return 'Sync preview ready. Review the records before confirming.';
          }); }}>Preview sync</button>
          <button type="button" className="btn-ghost ml-2" disabled={disabled} onClick={() => {
            if (!window.confirm('Sign out and open the guest library? Account workouts stay saved on this device. Unsaved form fields will be cleared.')) return;
            void run(async () => { await service.signOut(); return 'Signed out.'; });
          }}>Sign out</button>
        </section>
        {preview && !current && <p role="status" className="text-sm text-warn">Workouts changed after the preview. Preview sync again.</p>}
        {current && <section aria-label="Sync preview" className="space-y-4 rounded-xl border border-white/10 p-4">
          <h2 className="font-semibold text-white">Sync preview</h2>
          <p className="text-sm text-slate-400">This device has {state.data.history.length} completed workouts and {state.data.routines?.length ?? 0} routines.
            {' '}Cloud has {current.remote.data.history.length} completed workouts and {current.remote.data.routines?.length ?? 0} routines.</p>
          {mergeError && <p role="alert" className="text-sm text-warn">{mergeError}</p>}
          {merged && <p className="text-sm text-slate-300">Merged result has {merged.data.history.length} completed workouts,
            {' '}{merged.data.routines?.length ?? 0} routines and {merged.data.active ? 'one active workout' : 'no active workout'}.</p>}
          {mergeWorkoutSync(current.base, state.data, current.remote.data).conflicts.map(conflict =>
            <fieldset key={conflict.key} className="min-w-0 space-y-3 rounded-lg border border-warn/30 p-3">
              <legend className="max-w-full break-words px-1 text-sm font-semibold text-white">Conflict · {conflict.name}</legend>
              {(['device', 'cloud'] as const).map(source => <div key={source} className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-white"><input type="radio" name={conflict.key} value={source}
                  disabled={disabled} checked={choices[conflict.key] === source} onChange={() => setChoices(value => ({ ...value, [conflict.key]: source }))} />
                  {source === 'device' ? 'Keep device version' : 'Keep cloud version'}</label>
                <RecordVersion value={conflict[source]} />
              </div>)}
            </fieldset>)}
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={disabled || !merged || !!merged.conflicts.length} onClick={() => { void run(async () => {
            const result = await store.getState().confirmSync(current, choices, service.cloud(account.id));
            setPreview(null);
            if (!result.ok) throw new Error(result.message);
            return 'Sync complete. Workout records are saved on this device and in your account.';
          }); }}>Confirm sync</button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setPreview(null)}>Cancel sync</button></div>
        </section>}
        <section className="space-y-3 border-t border-white/10 pt-5">
          <h2 className="font-semibold text-white">Bring guest records into this account</h2>
          <p className="text-sm text-slate-400">Preview a copy of this device’s guest workouts and routines. After copying, use sync to transfer them to your account.</p>
          <button type="button" className="btn-ghost" disabled={disabled} onClick={() => { void run(async () => {
            setCopy(null); setPreview(null);
            const revision = state.data.revision;
            const backup: WorkoutBackup = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: Date.now(), data: await guest.load() };
            const merge = mergeWorkoutBackup(state.data, backup); setCopy({ backup, revision, merge });
            return 'Guest copy preview ready.';
          }); }}>Preview guest copy</button>
          {copy && <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <p className="text-sm text-slate-300">Add {copy.merge.addedWorkouts} completed workouts, {copy.merge.addedRoutines} routines
              {' '}and {copy.merge.addedActive ? 'one active workout' : 'no active workout'}. Skip {copy.merge.duplicates} identical records.</p>
            <button type="button" className="btn-primary" disabled={disabled || copy.revision !== state.data.revision} onClick={() => { void run(async () => {
              const result = await store.getState().restoreBackup(copy.backup, copy.revision); setCopy(null);
              if (!result.ok) throw new Error(result.message); return 'Guest records copied into this account’s local library.';
            }); }}>Copy guest records</button>
            {copy.revision !== state.data.revision && <p className="text-sm text-warn">Workouts changed. Preview the guest copy again.</p>}
          </div>}
        </section>
      </>}
  </div>;
}
