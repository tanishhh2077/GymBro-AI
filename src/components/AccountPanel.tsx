import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import type { Account, AccountService } from '@/core/accountService';
import { mergeWorkoutSync, type SyncChoice, type SyncPreview } from '@/core/workoutSync';
import { mergeWorkoutBackup, type WorkoutBackup, type BackupMerge } from '@/core/workoutBackup';
import type { Workout, WorkoutData, WorkoutGoal, WorkoutRoutine } from '@/types/workout';
import type { WorkoutRepository } from '@/store/workoutRepository';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { plannedTarget } from './plannedTarget';
import { groupLabel, weightParts } from './weightText';

interface Props { service: AccountService | null; account: Account | null; store: WorkoutStore; guest: WorkoutRepository }
const inputClass = 'mt-2 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white disabled:opacity-60';
/** One side of a sync conflict; shows every synced field so versions differing only in notes or targets are distinguishable. */
export function RecordVersion({ value }: { value: Workout | WorkoutRoutine | null }) {
  if (!value) return <p className="text-sm text-slate-400">Deleted</p>;
  return <div className="space-y-2 break-words text-sm text-slate-300">
    <p>{value.name} · {value.unit}{'finishedAt' in value ? value.finishedAt === null ? ' · Active' : ' · Completed' : ' · Routine'}</p>
    {'note' in value && value.note && <p className="whitespace-pre-wrap">Note: {value.note}</p>}
    <ul className="space-y-2">{value.exercises.map(exercise => <li key={exercise.id}>
      <span className="font-medium">{exercise.name}</span>
      {exercise.bodyweight && <span> · Bodyweight</span>}
      {exercise.superset && <span> · Superset {exercise.superset}</span>}
      {'sets' in exercise && <span> · {exercise.sets.length ? exercise.sets.map(set => `${set.kind === 'warmup' ? 'Warm-up' : 'Regular'} ${set.reps} reps × ${weightParts(set.weight, value.unit, exercise.bodyweight === true).text}${set.rpe !== undefined ? ` RPE ${set.rpe}` : ''}`).join(', ') : 'No logged sets'}</span>}
      {'sets' in exercise && plannedTarget(exercise, value.unit) && <span> · Planned: {plannedTarget(exercise, value.unit)}</span>}
      {!('sets' in exercise) && <span> · {exercise.targetSets ?? '—'} sets / {exercise.targetReps ?? '—'} reps{exercise.targetWeight !== undefined ? ` / ${exercise.targetWeight} ${value.unit}` : ''} planned</span>}
    </li>)}</ul>
  </div>;
}
/** One side of a goal conflict, with every synced goal field. */
export function GoalVersion({ value }: { value: WorkoutGoal | null }) {
  if (!value) return <p className="text-sm text-slate-400">Deleted</p>;
  return <p className="break-words text-sm text-slate-300">{groupLabel(value)} · {value.reps} {value.reps === 1 ? 'rep' : 'reps'} × {weightParts(value.weight, value.unit, value.bodyweight === true).text}
    {' '}· Created {new Date(value.createdAt).toLocaleDateString()}</p>;
}
function counts(data: WorkoutData): string {
  const goals = data.goals?.length ?? 0;
  return `${data.history.length} completed workouts, ${data.routines?.length ?? 0} routines and ${goals} ${goals === 1 ? 'goal' : 'goals'}`;
}
export function AccountPanel({ service, account, store, guest }: Props) {
  const baseId = useId();
  const state = useStore(store);
  const [email, setEmail] = useState(''); const [sentTo, setSentTo] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, SyncChoice>>({});
  const [copy, setCopy] = useState<{ backup: WorkoutBackup; revision: number; merge: BackupMerge } | null>(null);
  const operation = useRef(0); const running = useRef(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const previewBtnRef = useRef<HTMLButtonElement | null>(null);
  const guestCopyBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevSentTo = useRef(sentTo);

  useEffect(() => () => { operation.current++; }, []);

  useEffect(() => {
    if (sentTo && !prevSentTo.current) {
      codeInputRef.current?.focus();
    } else if (!sentTo && prevSentTo.current) {
      emailInputRef.current?.focus();
    }
    prevSentTo.current = sentTo;
  }, [sentTo]);

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
  // Conflicts listed without choices, so a chosen conflict stays visible with its selected radio.
  let unchosen: Pick<ReturnType<typeof mergeWorkoutSync>, 'conflicts' | 'goalConflicts'> = { conflicts: [], goalConflicts: [] };
  if (current) {
    try {
      merged = mergeWorkoutSync(current.base, state.data, current.remote.data, choices);
      unchosen = mergeWorkoutSync(current.base, state.data, current.remote.data);
    } catch (failure) { mergeError = failure instanceof Error ? failure.message : 'Preview sync again.'; }
  }

  function handleConflictKeyDown(key: string, event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      setChoices(value => ({ ...value, [key]: 'cloud' }));
      const fieldset = event.currentTarget.closest('fieldset');
      fieldset?.querySelector<HTMLInputElement>('input[value="cloud"]')?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setChoices(value => ({ ...value, [key]: 'device' }));
      const fieldset = event.currentTarget.closest('fieldset');
      fieldset?.querySelector<HTMLInputElement>('input[value="device"]')?.focus();
    }
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
    <p className="text-sm text-slate-400">Sync includes workout logs, routines and goals. Video processing stays on your device.</p>
    {error && <p role="alert" className="break-words text-sm text-warn">{error}</p>}
    <p role="status" aria-live="polite" className="text-sm text-accent">{busy ? 'Working…' : notice}</p>
    {!service ? <div className="card p-5"><h2 className="font-semibold text-white">Accounts are not configured</h2>
      <p className="mt-2 text-sm text-slate-400">Guest workouts are available. The app owner needs to connect Supabase using the account setup instructions.</p></div> :
      !account ? <form aria-label="Sign in" onSubmit={submitCode} className="space-y-4">
        <label htmlFor={`${baseId}-email`} className="block text-sm text-slate-300">Email address
          <input ref={emailInputRef} id={`${baseId}-email`} aria-label="Email address" type="email" autoComplete="email" maxLength={254} required disabled={busy || !!sentTo}
            className={inputClass} value={email} onChange={event => setEmail(event.target.value)} /></label>
        {sentTo && <label htmlFor={`${baseId}-code`} className="block text-sm text-slate-300">Email code
          <input ref={codeInputRef} id={`${baseId}-code`} aria-label="Email code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required
            disabled={busy} className={inputClass} value={code} onChange={event => setCode(event.target.value)} /></label>}
        <div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={busy} type="submit">{sentTo ? 'Verify email code' : 'Send email code'}</button>
          {sentTo && <button className="btn-ghost" disabled={busy} type="button" onClick={() => { setSentTo(''); setCode(''); setError(''); setNotice(''); }}>Request another code</button>}</div>
        <p className="text-xs text-slate-500">Your guest library stays available when you sign out. Signing in opens a separate account library.</p>
      </form> : <>
        <section className="space-y-3 rounded-xl border border-white/10 p-4">
          <h2 className="break-words font-semibold text-white">Signed in as {account.email}</h2>
          <p className="text-sm text-slate-400">Workout edits save locally. Use Preview sync, review any conflicts, then Confirm sync to transfer records.</p>
          <button ref={previewBtnRef} type="button" className="btn-primary" disabled={disabled} onClick={() => { void run(async () => {
            setPreview(null); setCopy(null); setChoices({}); const value = await store.getState().previewSync(service.cloud(account.id));
            setPreview(value); return 'Sync preview ready. Review the records before confirming.';
          }); }}>Preview sync</button>
          <button type="button" className="btn-ghost ml-2" disabled={disabled} onClick={() => {
            if (!window.confirm('Sign out and open the guest library? Account workouts stay saved on this device. Unsaved form fields will be cleared.')) return;
            void run(async () => { await service.signOut(); return 'Signed out.'; });
          }}>Sign out</button>
        </section>
        {preview && !current && <p role="status" aria-live="polite" className="text-sm text-warn">Workouts changed after the preview. Preview sync again.</p>}
        {current && <section aria-label="Sync preview" className="space-y-4 rounded-xl border border-white/10 p-4">
          <h2 className="font-semibold text-white">Sync preview</h2>
          <p className="text-sm text-slate-400">This device has {counts(state.data)}.
            {' '}Cloud has {counts(current.remote.data)}.</p>
          {mergeError && <p role="alert" className="text-sm text-warn">{mergeError}</p>}
          {merged && <p className="text-sm text-slate-300">Merged result has {counts(merged.data)},
            {' '}and {merged.data.active ? 'one active workout' : 'no active workout'}.</p>}
          {unchosen.conflicts.map(conflict => {
            const legendId = `${baseId}-conflict-${conflict.key}`;
            return (
              <fieldset key={conflict.key} role="radiogroup" aria-labelledby={legendId} className="min-w-0 space-y-3 rounded-lg border border-warn/30 p-3">
                <legend id={legendId} className="max-w-full break-words px-1 text-sm font-semibold text-white">Conflict · {conflict.name}</legend>
                {(['device', 'cloud'] as const).map(source => {
                  const inputId = `${baseId}-${conflict.key}-${source}`;
                  const detailsId = `${baseId}-${conflict.key}-${source}-details`;
                  const checked = choices[conflict.key] === source;
                  return (
                    <div key={source} className="space-y-2">
                      <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-white">
                        <input id={inputId} type="radio" name={conflict.key} value={source} role="radio"
                          aria-checked={checked} aria-describedby={detailsId} disabled={disabled}
                          checked={checked} onChange={() => setChoices(value => ({ ...value, [conflict.key]: source }))}
                          onKeyDown={e => handleConflictKeyDown(conflict.key, e)} />
                        {source === 'device' ? 'Keep device version' : 'Keep cloud version'}
                      </label>
                      <div id={detailsId}><RecordVersion value={conflict[source]} /></div>
                    </div>
                  );
                })}
              </fieldset>
            );
          })}
          {unchosen.goalConflicts.map(conflict => {
            const legendId = `${baseId}-goal-conflict-${conflict.key}`;
            return (
              <fieldset key={conflict.key} role="radiogroup" aria-labelledby={legendId} className="min-w-0 space-y-3 rounded-lg border border-warn/30 p-3">
                <legend id={legendId} className="max-w-full break-words px-1 text-sm font-semibold text-white">Goal conflict · {conflict.name}</legend>
                {(['device', 'cloud'] as const).map(source => {
                  const inputId = `${baseId}-${conflict.key}-${source}`;
                  const detailsId = `${baseId}-${conflict.key}-${source}-details`;
                  const checked = choices[conflict.key] === source;
                  return (
                    <div key={source} className="space-y-2">
                      <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-white">
                        <input id={inputId} type="radio" name={conflict.key} value={source} role="radio"
                          aria-checked={checked} aria-describedby={detailsId} disabled={disabled}
                          checked={checked} onChange={() => setChoices(value => ({ ...value, [conflict.key]: source }))}
                          onKeyDown={e => handleConflictKeyDown(conflict.key, e)} />
                        {source === 'device' ? 'Keep device goal' : 'Keep cloud goal'}
                      </label>
                      <div id={detailsId}><GoalVersion value={conflict[source]} /></div>
                    </div>
                  );
                })}
              </fieldset>
            );
          })}
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={disabled || !merged || !!merged.conflicts.length || !!merged.goalConflicts.length} onClick={() => { void run(async () => {
            const result = await store.getState().confirmSync(current, choices, service.cloud(account.id));
            setPreview(null);
            previewBtnRef.current?.focus();
            if (!result.ok) throw new Error(result.message);
            return 'Sync complete. Workout records are saved on this device and in your account.';
          }); }}>Confirm sync</button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => {
              setPreview(null);
              previewBtnRef.current?.focus();
            }}>Cancel sync</button></div>
        </section>}
        <section className="space-y-3 border-t border-white/10 pt-5">
          <h2 className="font-semibold text-white">Bring guest records into this account</h2>
          <p className="text-sm text-slate-400">Preview a copy of this device’s guest workouts and routines. After copying, use sync to transfer them to your account.</p>
          <button ref={guestCopyBtnRef} type="button" className="btn-ghost" disabled={disabled} onClick={() => { void run(async () => {
            setCopy(null); setPreview(null);
            const revision = state.data.revision;
            const backup: WorkoutBackup = { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: Date.now(), data: await guest.load() };
            const merge = mergeWorkoutBackup(state.data, backup); setCopy({ backup, revision, merge });
            return 'Guest copy preview ready.';
          }); }}>Preview guest copy</button>
          {copy && <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <p className="text-sm text-slate-300">Add {copy.merge.addedWorkouts} completed workouts, {copy.merge.addedRoutines} routines,
              {' '}{copy.merge.addedGoals} {copy.merge.addedGoals === 1 ? 'goal' : 'goals'} and {copy.merge.addedActive ? 'one active workout' : 'no active workout'}. Skip {copy.merge.duplicates} identical records.
              {copy.merge.skippedGoals > 0 && ` Skip ${copy.merge.skippedGoals} guest ${copy.merge.skippedGoals === 1 ? 'goal' : 'goals'} because this account already has a goal for that exercise.`}</p>
            <button type="button" className="btn-primary" disabled={disabled || copy.revision !== state.data.revision} onClick={() => { void run(async () => {
              const result = await store.getState().restoreBackup(copy.backup, copy.revision);
              setCopy(null);
              guestCopyBtnRef.current?.focus();
              if (!result.ok) throw new Error(result.message); return 'Guest records copied into this account’s local library.';
            }); }}>Copy guest records</button>
            {copy.revision !== state.data.revision && <p role="status" aria-live="polite" className="text-sm text-warn">Workouts changed. Preview the guest copy again.</p>}
          </div>}
        </section>
      </>}
  </div>;
}
