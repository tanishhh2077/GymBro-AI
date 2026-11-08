import { useId, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { exerciseNoteFor } from '@/core/bodyLog';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import { useConfirmLeave, useUnsavedChanges } from './unsavedChanges';

const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';

export function ExerciseNoteField({ store, name }: { store: WorkoutStore; name: string }) {
  const state = useStore(store);
  const textareaId = useId();
  const saved = exerciseNoteFor(state.data, name) ?? '';
  const revision = state.data.revision;

  const [draft, setDraft] = useState(saved);
  const [base, setBase] = useState(saved);
  const [opened, setOpened] = useState(revision);
  const [seenName, setSeenName] = useState(name);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);

  if (seenName !== name) {
    setSeenName(name);
    setDraft(saved);
    setBase(saved);
    setOpened(revision);
    setError('');
    setStatus('');
    setConflict(false);
  } else if (draft.trim() === base) {
    if (saved !== base) {
      setBase(saved);
      setDraft(saved);
    }
    if (opened !== revision) {
      setOpened(revision);
    }
  }

  const dirty = draft.trim() !== saved;
  useUnsavedChanges(dirty);
  useConfirmLeave();

  const disabled = !state.loaded || state.busy || state.needsReload;

  function loadCurrentNote() {
    const latest = exerciseNoteFor(store.getState().data, name) ?? '';
    setDraft(latest);
    setBase(latest);
    setOpened(store.getState().data.revision);
    setConflict(false);
    setError('');
    setStatus('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    setError('');
    setConflict(false);
    const result = await store.getState().setExerciseNote(name, draft, opened);
    if (result.ok) {
      const stored = exerciseNoteFor(store.getState().data, name) ?? '';
      setBase(stored);
      setDraft(stored);
      setOpened(store.getState().data.revision);
      setStatus(stored ? 'Note saved.' : 'Note removed.');
    } else {
      setError(result.message);
      if (result.message.includes('Exercise notes changed')) {
        setConflict(true);
      }
    }
  }

  return (
    <details className="min-w-0 max-w-full rounded-lg border border-white/10 bg-ink-900/40 p-2.5">
      <summary className="cursor-pointer select-none text-sm font-medium text-slate-300 hover:text-white break-words">
        <span className="font-semibold text-white">Exercise note</span>
        <span className="ml-2 text-xs text-slate-400">
          {saved ? `: ${saved.length > 40 ? `${saved.slice(0, 37)}...` : saved}` : ' (none)'}
        </span>
      </summary>
      <form aria-label={`Exercise note for ${name}`} onSubmit={save} className="mt-3 min-w-0 space-y-3">
        {error && (
          <div role="alert" className="space-y-1 text-sm text-warn">
            <p className="break-words">{error}</p>
            {conflict && (
              <p className="text-slate-300">
                Your typed note is kept above. Load the saved note to see newer changes.
              </p>
            )}
          </div>
        )}
        {conflict && (
          <button type="button" className="btn-ghost" onClick={loadCurrentNote}>
            Load current note
          </button>
        )}
        <fieldset disabled={disabled} className="min-w-0 space-y-3">
          <div>
            <label htmlFor={textareaId} className="block text-sm text-slate-300">
              Exercise note
            </label>
            <textarea
              id={textareaId}
              rows={3}
              maxLength={500}
              aria-describedby={`${textareaId}-count`}
              className={inputClass}
              value={draft}
              onChange={event => {
                setDraft(event.target.value);
                setStatus('');
              }}
              placeholder="Form cues, seat settings, warmup tips..."
            />
            <p id={`${textareaId}-count`} className="mt-1 text-xs text-slate-500">
              {draft.length} / 500 characters{dirty ? ' · Not saved yet' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary">
              Save note
            </button>
            {status && (
              <span role="status" aria-live="polite" className="text-sm text-accent">
                {status}
              </span>
            )}
          </div>
        </fieldset>
      </form>
    </details>
  );
}
