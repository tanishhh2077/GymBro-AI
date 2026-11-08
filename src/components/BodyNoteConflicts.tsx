import { useId } from 'react';
import type { BackupMerge } from '@/core/workoutBackup';
import type { BodySyncConflict, ExerciseNoteSyncConflict } from '@/core/workoutSync';
import { BODY_MEASUREMENT_NAMES } from '@/core/workouts';
import type { BodyEntry, BodyMeasurementName } from '@/types/body';

const MEASUREMENT_LABELS: Record<BodyMeasurementName, string> = {
  neck: 'Neck',
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  leftArm: 'Left arm',
  rightArm: 'Right arm',
  leftThigh: 'Left thigh',
  rightThigh: 'Right thigh',
};

function parseTimestamp(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function getNoteTimestamp(conflict: ExerciseNoteSyncConflict, value?: unknown): number | undefined {
  if (value && typeof value === 'object') {
    const valObj = value as Record<string, unknown>;
    const direct = parseTimestamp(valObj.updatedAt ?? valObj.timestamp ?? valObj.date);
    if (direct !== undefined) return direct;
  }
  const confObj = conflict as unknown as Record<string, unknown>;
  return parseTimestamp(confObj.updatedAt ?? confObj.timestamp ?? confObj.date);
}

/** One side of a body log conflict. Shows date, weight with unit, measurements, and note. */
export function BodyVersion({ value }: { value: BodyEntry | null }) {
  if (!value) return <p className="text-sm text-slate-400">Deleted</p>;

  const dateStr = new Date(value.date).toLocaleDateString();
  const measurementEntries = value.measurements
    ? BODY_MEASUREMENT_NAMES
        .filter(name => value.measurements?.[name] !== undefined)
        .map(name => `${MEASUREMENT_LABELS[name] ?? name}: ${value.measurements![name]}${value.lengthUnit ? ` ${value.lengthUnit}` : ''}`)
    : [];

  return (
    <div className="min-w-0 space-y-1 break-words text-sm text-slate-300">
      <p className="font-medium text-white">{dateStr}</p>
      {value.weight !== undefined && (
        <p>
          Weight: {value.weight}
          {value.unit ? ` ${value.unit}` : ''}
        </p>
      )}
      {measurementEntries.length > 0 && (
        <p>Measurements: {measurementEntries.join(', ')}</p>
      )}
      {value.note && (
        <p className="whitespace-pre-wrap">Note: {value.note}</p>
      )}
    </div>
  );
}

/** One side of an exercise note conflict. Shows exercise name, note text, and updated timestamp. */
export function ExerciseNoteVersion({
  name,
  value,
  timestamp,
}: {
  name: string;
  value: string | null;
  timestamp?: number;
}) {
  if (value === null) return <p className="text-sm text-slate-400">Deleted</p>;

  return (
    <div className="min-w-0 space-y-1 break-words text-sm text-slate-300">
      <p className="font-medium text-white">{name}</p>
      <p className="whitespace-pre-wrap">{value}</p>
      {timestamp !== undefined && (
        <p className="text-xs text-slate-400">Updated {new Date(timestamp).toLocaleDateString()}</p>
      )}
    </div>
  );
}

export function BodyNoteConflicts({
  bodyConflicts,
  noteConflicts,
  choices,
  onChoose,
}: {
  bodyConflicts: readonly BodySyncConflict[];
  noteConflicts: readonly ExerciseNoteSyncConflict[];
  choices: Readonly<Record<string, 'device' | 'cloud'>>;
  onChoose: (key: string, choice: 'device' | 'cloud') => void;
}) {
  const baseId = useId();
  if (bodyConflicts.length === 0 && noteConflicts.length === 0) return null;

  return (
    <div className="space-y-4">
      {bodyConflicts.map((conflict, index) => (
        <fieldset key={conflict.key} className="min-w-0 max-w-full space-y-3 rounded-lg border border-warn/30 p-3">
          <legend className="max-w-full break-words px-1 text-sm font-semibold text-white">
            Body conflict · {new Date(conflict.date).toLocaleDateString()}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(['device', 'cloud'] as const).map(source => {
              const inputId = `${baseId}-body-${index}-${source}`;
              return (
                <div key={source} className="min-w-0 space-y-2">
                  <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-white">
                    <input
                      id={inputId}
                      aria-describedby={`${inputId}-details`}
                      type="radio"
                      name={conflict.key}
                      value={source}
                      checked={choices[conflict.key] === source}
                      onChange={() => onChoose(conflict.key, source)}
                    />
                    {source === 'device' ? 'Keep device' : 'Keep cloud'}
                  </label>
                  <div id={`${inputId}-details`}><BodyVersion value={conflict[source]} /></div>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {noteConflicts.map((conflict, index) => {
        const timestamp = getNoteTimestamp(conflict);
        return (
          <fieldset key={conflict.key} className="min-w-0 max-w-full space-y-3 rounded-lg border border-warn/30 p-3">
            <legend className="max-w-full break-words px-1 text-sm font-semibold text-white">
              Exercise note conflict · {conflict.name}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(['device', 'cloud'] as const).map(source => {
                const noteVal = conflict[source];
                const sourceTs = getNoteTimestamp(conflict, noteVal) ?? timestamp;
                const inputId = `${baseId}-note-${index}-${source}`;
                return (
                  <div key={source} className="min-w-0 space-y-2">
                    <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-white">
                      <input
                        id={inputId}
                        aria-describedby={`${inputId}-details`}
                        type="radio"
                        name={conflict.key}
                        value={source}
                        checked={choices[conflict.key] === source}
                        onChange={() => onChoose(conflict.key, source)}
                      />
                      {source === 'device' ? 'Keep device' : 'Keep cloud'}
                    </label>
                    <div id={`${inputId}-details`}><ExerciseNoteVersion name={conflict.name} value={noteVal} timestamp={sourceTs} /></div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function BackupBodyNoteCounts({ merge }: { merge: BackupMerge }) {
  const sentences: string[] = [];

  const addedBody = merge.addedBodyEntries ?? 0;
  const addedNotes = merge.addedExerciseNotes ?? 0;
  const skippedNotes = merge.skippedExerciseNotes ?? 0;

  if (addedBody > 0) {
    sentences.push(
      addedBody === 1
        ? '1 body entry added.'
        : `${addedBody} body entries added.`
    );
  }

  if (addedNotes > 0) {
    sentences.push(
      addedNotes === 1
        ? '1 exercise note added.'
        : `${addedNotes} exercise notes added.`
    );
  }

  if (skippedNotes > 0) {
    sentences.push(
      skippedNotes === 1
        ? '1 exercise note skipped: you already have a note for that exercise.'
        : `${skippedNotes} exercise notes skipped: you already have a note for that exercise.`
    );
  }

  if (sentences.length === 0) return null;

  return (
    <div className="space-y-1 text-sm text-slate-300">
      {sentences.map((sentence, index) => (
        <p key={index}>{sentence}</p>
      ))}
    </div>
  );
}
