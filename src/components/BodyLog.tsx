import { useId, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { bodyLogNewestFirst } from '@/core/bodyLog';
import { BODY_MEASUREMENT_NAMES } from '@/core/workouts';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { BodyEntry, BodyMeasurementName } from '@/types/body';
import { BodyEntryForm, type BodyEntryEditing } from './BodyEntryForm';
import { BodyTrendChart } from './BodyTrendChart';
import { useConfirmLeave } from './unsavedChanges';
import { weightParts } from './weightText';

const BODY_MEASUREMENT_KEYS = BODY_MEASUREMENT_NAMES;

const BODY_MEASUREMENT_LABELS: Record<BodyMeasurementName, string> = {
  neck: 'Neck',
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  leftArm: 'Left arm',
  rightArm: 'Right arm',
  leftThigh: 'Left thigh',
  rightThigh: 'Right thigh',
};

function toDateInputValue(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function BodyLog({
  store,
  onHome,
}: {
  readonly store: WorkoutStore;
  readonly onHome: () => void;
}) {
  const state = useStore(store);
  const titleId = useId();
  const confirmLeave = useConfirmLeave();

  const [editing, setEditing] = useState<BodyEntryEditing | null>(null);
  const [notice, setNotice] = useState('');

  const entries = useMemo(
    () => bodyLogNewestFirst(state.data.bodyLog ?? []),
    [state.data.bodyLog]
  );

  function handleHome() {
    if (confirmLeave()) onHome();
  }

  function open(entry?: BodyEntry) {
    setNotice('');
    setEditing({
      id: entry?.id ?? null,
      revision: state.data.revision,
      entry,
    });
  }

  async function remove(entry: BodyEntry) {
    const dateStr = toDateInputValue(entry.date);
    if (!window.confirm(`Delete body log entry for ${dateStr}?`)) return;
    const result = await store.getState().deleteBodyEntry(entry.id);
    setNotice(result.ok ? 'Body log entry deleted.' : result.message);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleHome}
          className="text-sm font-medium text-accent underline underline-offset-4"
          aria-label="Back to home"
        >
          ← Back to home
        </button>
      </div>

      <header className="space-y-1">
        <h1 id={titleId} className="text-2xl font-bold tracking-tight text-white">
          Body Log
        </h1>
        <p className="text-sm text-slate-400">
          Track body weight and tape measurements over time. Values are stored in their entered units without conversion.
        </p>
      </header>

      {notice && (
        <p role="status" aria-live="polite" className="text-sm text-accent">
          {notice}
        </p>
      )}

      {/* Trend chart */}
      <BodyTrendChart entries={state.data.bodyLog ?? []} />

      {/* Form or Add button */}
      {editing ? (
        <BodyEntryForm
          key={`${editing.id ?? 'new'}:${editing.revision}`}
          store={store}
          editing={editing}
          onReopen={() => {
            const saved = store.getState().data.bodyLog?.find(e => e.id === editing.id);
            if (saved) {
              open(saved);
            } else {
              setEditing(null);
              setNotice('This body log entry was deleted on another screen.');
            }
          }}
          onClose={saved => {
            setEditing(null);
            if (saved) setNotice('Body log entry saved.');
          }}
        />
      ) : (
        <div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => open()}
          >
            Add entry
          </button>
        </div>
      )}

      {/* Entry list */}
      <section aria-label="Body log entries" className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">No body log entries yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map(entry => (
              <li key={entry.id}>
                <BodyEntryCard
                  entry={entry}
                  onEdit={!editing ? () => open(entry) : undefined}
                  onDelete={!editing ? () => void remove(entry) : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default BodyLog;

function BodyEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  readonly entry: BodyEntry;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
}) {
  const dateStr = toDateInputValue(entry.date);
  const formattedDate = new Date(entry.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const weightInfo = entry.weight !== undefined && entry.unit !== undefined
    ? weightParts(entry.weight, entry.unit)
    : null;

  const measurementsList = entry.measurements && entry.lengthUnit
    ? BODY_MEASUREMENT_KEYS.filter(k => entry.measurements?.[k] !== undefined).map(k => ({
        key: k,
        label: BODY_MEASUREMENT_LABELS[k],
        value: entry.measurements![k],
        unit: entry.lengthUnit,
      }))
    : [];

  return (
    <article
      aria-label={`Body log entry for ${dateStr}`}
      className="card min-w-0 space-y-3 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <span className="font-semibold text-white">{formattedDate}</span>
        <span className="text-xs text-slate-400">{dateStr}</span>
      </div>

      {weightInfo && (
        <div className="text-sm text-slate-200">
          <span className="font-medium text-slate-300">Weight: </span>
          <span className="tabular-nums">{weightInfo.text}</span>
          {weightInfo.alternate && (
            <span className="text-xs text-slate-400"> (≈ {weightInfo.alternate})</span>
          )}
        </div>
      )}

      {measurementsList.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-400">Measurements:</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-200 sm:grid-cols-4">
            {measurementsList.map(m => (
              <div key={m.key} className="tabular-nums">
                <span className="text-slate-400">{m.label}: </span>
                <span>
                  {m.value} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.note && (
        <div className="rounded-lg bg-white/5 p-2 text-sm text-slate-300">
          <span className="sr-only">Note: </span>
          <p className="break-words whitespace-pre-wrap">{entry.note}</p>
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onEdit && (
            <button
              type="button"
              className="btn-ghost text-xs"
              aria-label={`Edit entry for ${dateStr}`}
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn-ghost text-xs"
              aria-label={`Delete entry for ${dateStr}`}
              onClick={onDelete}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}
