import { useId, useMemo, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { BODY_MEASUREMENT_NAMES } from '@/core/workouts';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { BodyEntry, BodyEntryInput, BodyMeasurementName, LengthUnit } from '@/types/body';
import type { WeightUnit } from '@/types/workout';
import { useUnsavedChanges } from './unsavedChanges';

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

const STALE = 'Body log changed';
const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';

function toDateInputValue(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(dateStr: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return Number.NaN;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return Number.NaN;
  return date.getTime();
}

export interface BodyEntryDraft {
  readonly date: string;
  readonly weight: string;
  readonly unit: WeightUnit;
  readonly measurements: Readonly<Record<BodyMeasurementName, string>>;
  readonly lengthUnit: LengthUnit;
  readonly note: string;
}

function emptyMeasurements(): Record<BodyMeasurementName, string> {
  return {
    neck: '',
    chest: '',
    waist: '',
    hips: '',
    leftArm: '',
    rightArm: '',
    leftThigh: '',
    rightThigh: '',
  };
}

function initialDraftFrom(entry?: BodyEntry): BodyEntryDraft {
  if (!entry) {
    return {
      date: toDateInputValue(Date.now()),
      weight: '',
      unit: 'lb',
      measurements: emptyMeasurements(),
      lengthUnit: 'in',
      note: '',
    };
  }

  const measurements = emptyMeasurements();
  if (entry.measurements) {
    for (const key of BODY_MEASUREMENT_KEYS) {
      const val = entry.measurements[key];
      if (val !== undefined) measurements[key] = String(val);
    }
  }

  return {
    date: toDateInputValue(entry.date),
    weight: entry.weight !== undefined ? String(entry.weight) : '',
    unit: entry.unit ?? 'lb',
    measurements,
    lengthUnit: entry.lengthUnit ?? 'in',
    note: entry.note ?? '',
  };
}

function draftToInput(draft: BodyEntryDraft): BodyEntryInput {
  const date = draft.date ? fromDateInputValue(draft.date) : Number.NaN;
  const trimmedWeight = draft.weight.trim();
  const weight = trimmedWeight === '' ? undefined : Number(trimmedWeight);
  const unit = weight !== undefined ? draft.unit : undefined;

  const measurementPairs = Object.entries(draft.measurements)
    .filter(([, v]) => v.trim() !== '')
    .map(([k, v]) => [k, Number(v.trim())]);

  const measurements = measurementPairs.length > 0
    ? Object.fromEntries(measurementPairs)
    : undefined;
  const lengthUnit = measurements !== undefined ? draft.lengthUnit : undefined;

  const note = draft.note.replace(/\r\n?/g, '\n').trim();

  return {
    date,
    ...(weight !== undefined ? { weight, unit } : {}),
    ...(measurements !== undefined ? { measurements, lengthUnit } : {}),
    ...(note ? { note } : {}),
  };
}

export interface BodyEntryEditing {
  readonly id: string | null;
  readonly revision: number;
  readonly entry?: BodyEntry;
}

export interface BodyEntryFormProps {
  readonly store: WorkoutStore;
  readonly editing: BodyEntryEditing;
  readonly onReopen: () => void;
  readonly onClose: (saved: boolean) => void;
}

export function BodyEntryForm({
  store,
  editing,
  onReopen,
  onClose,
}: BodyEntryFormProps) {
  const state = useStore(store);
  const id = useId();

  const [draft, setDraft] = useState<BodyEntryDraft>(() => initialDraftFrom(editing.entry));
  const initialDraft = useMemo(() => initialDraftFrom(editing.entry), [editing.entry]);
  const [error, setError] = useState('');

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft),
    [draft, initialDraft]
  );
  useUnsavedChanges(dirty);

  const disabled = !state.loaded || state.busy || state.needsReload;

  function updateField<K extends keyof BodyEntryDraft>(key: K, value: BodyEntryDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function updateMeasurement(key: BodyMeasurementName, value: string) {
    setDraft(current => ({
      ...current,
      measurements: { ...current.measurements, [key]: value },
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const input = draftToInput(draft);
    const result = editing.id
      ? await store.getState().updateBodyEntry(editing.id, editing.revision, input)
      : await store.getState().addBodyEntry(input);

    if (result.ok) {
      onClose(true);
    } else {
      setError(result.message);
    }
  }

  return (
    <form
      aria-label="Save body log entry"
      noValidate
      onSubmit={handleSubmit}
      className="card min-w-0 space-y-4 p-4"
    >
      <h3 className="text-lg font-semibold text-white">
        {editing.id ? 'Edit body log entry' : 'Add body log entry'}
      </h3>
      <p className="text-xs text-slate-400">
        Record your body weight or circumference measurements for this day.
      </p>

      {error && (
        <div role="alert" className="space-y-2 text-sm text-warn">
          <p className="break-words">{error}</p>
          {editing.id && error.startsWith(STALE) && (
            <p>Your draft is kept below. Reopen the entry to load the saved version, then edit again.</p>
          )}
        </div>
      )}

      {editing.id && error.startsWith(STALE) && (
        <button
          type="button"
          className="btn-ghost"
          aria-label="Reopen entry"
          onClick={onReopen}
        >
          Reopen / Reload entry
        </button>
      )}

      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <div>
          <label htmlFor={`${id}-date`} className="block text-sm font-medium text-slate-300">
            Date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            className={inputClass}
            value={draft.date}
            onChange={e => updateField('date', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${id}-weight`} className="block text-sm font-medium text-slate-300">
              Body weight ({draft.unit})
            </label>
            <input
              id={`${id}-weight`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0.1"
              max="1000"
              placeholder="e.g. 175"
              className={inputClass}
              value={draft.weight}
              onChange={e => updateField('weight', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${id}-unit`} className="block text-sm font-medium text-slate-300">
              Weight unit
            </label>
            <select
              id={`${id}-unit`}
              className={inputClass}
              value={draft.unit}
              onChange={e => updateField('unit', e.target.value as WeightUnit)}
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">Tape measurements</h4>
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-length-unit`} className="text-xs text-slate-300">
                Length unit
              </label>
              <select
                id={`${id}-length-unit`}
                className="rounded-lg border border-white/15 bg-ink-900 px-2 py-1 text-xs text-white"
                value={draft.lengthUnit}
                onChange={e => updateField('lengthUnit', e.target.value as LengthUnit)}
              >
                <option value="in">Inches (in)</option>
                <option value="cm">Centimeters (cm)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BODY_MEASUREMENT_KEYS.map(key => (
              <div key={key}>
                <label
                  htmlFor={`${id}-${key}`}
                  className="block text-xs font-medium text-slate-300"
                >
                  {BODY_MEASUREMENT_LABELS[key]}
                </label>
                <input
                  id={`${id}-${key}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.1"
                  max="500"
                  placeholder={`in ${draft.lengthUnit}`}
                  className={inputClass}
                  value={draft.measurements[key]}
                  onChange={e => updateMeasurement(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-note`} className="block text-sm font-medium text-slate-300">
            Note (optional)
          </label>
          <textarea
            id={`${id}-note`}
            rows={3}
            maxLength={500}
            placeholder="Add observations, morning weigh-in details, etc."
            className={inputClass}
            value={draft.note}
            onChange={e => updateField('note', e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className="btn-primary">
            Save entry
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onClose(false)}
          >
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
