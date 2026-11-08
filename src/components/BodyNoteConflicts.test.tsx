import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BackupMerge } from '@/core/workoutBackup';
import type { BodySyncConflict, ExerciseNoteSyncConflict } from '@/core/workoutSync';
import type { BodyEntry } from '@/types/body';
import {
  BackupBodyNoteCounts,
  BodyNoteConflicts,
  BodyVersion,
  ExerciseNoteVersion,
} from './BodyNoteConflicts';

vi.setConfig({ testTimeout: 30_000 });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

const sampleBodyEntry: BodyEntry = {
  id: 'b1',
  date: 1_700_000_000_000,
  weight: 80.5,
  unit: 'kg',
  measurements: { waist: 82, leftArm: 35.5 },
  lengthUnit: 'cm',
  note: 'Morning before breakfast.',
};

describe('BodyVersion', () => {
  it('renders "Deleted" when value is null', async () => {
    await act(async () => {
      root.render(<BodyVersion value={null} />);
    });
    expect(container.textContent).toBe('Deleted');
  });

  it('renders date, weight with unit, measurements, and note', async () => {
    await act(async () => {
      root.render(<BodyVersion value={sampleBodyEntry} />);
    });
    const text = container.textContent ?? '';
    expect(text).toContain(new Date(sampleBodyEntry.date).toLocaleDateString());
    expect(text).toContain('80.5 kg');
    expect(text).toContain('Waist: 82 cm');
    expect(text).toContain('Left arm: 35.5 cm');
    expect(text).toContain('Morning before breakfast.');
  });

  it('handles entry without weight or without unit', async () => {
    const entryWithoutWeight: BodyEntry = {
      id: 'b2',
      date: 1_700_000_000_000,
      measurements: { neck: 38 },
      lengthUnit: 'in',
    };
    await act(async () => {
      root.render(<BodyVersion value={entryWithoutWeight} />);
    });
    expect(container.textContent).not.toContain('Weight');
    expect(container.textContent).toContain('Neck: 38 in');
  });
});

describe('ExerciseNoteVersion', () => {
  it('renders "Deleted" when value is null', async () => {
    await act(async () => {
      root.render(<ExerciseNoteVersion name="Bench press" value={null} />);
    });
    expect(container.textContent).toBe('Deleted');
  });

  it('renders exercise name, note text, and updated timestamp when provided', async () => {
    const timestamp = 1_700_000_000_000;
    await act(async () => {
      root.render(
        <ExerciseNoteVersion
          name="Bench press"
          value="Tuck elbows and drive feet."
          timestamp={timestamp}
        />
      );
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Bench press');
    expect(text).toContain('Tuck elbows and drive feet.');
    expect(text).toContain(`Updated ${new Date(timestamp).toLocaleDateString()}`);
  });

  it('renders cleanly without timestamp', async () => {
    await act(async () => {
      root.render(
        <ExerciseNoteVersion
          name="Barbell Squat"
          value="Brace core before descent."
        />
      );
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Barbell Squat');
    expect(text).toContain('Brace core before descent.');
    expect(text).not.toContain('Updated');
  });
});

describe('BodyNoteConflicts', () => {
  it('renders body conflict with side-by-side radio choices and triggers onChoose', async () => {
    const onChoose = vi.fn();
    const bodyConflict: BodySyncConflict = {
      key: 'body/b1',
      date: sampleBodyEntry.date,
      device: sampleBodyEntry,
      cloud: { ...sampleBodyEntry, weight: 81.2, note: 'Evening weigh-in.' },
    };

    await act(async () => {
      root.render(
        <BodyNoteConflicts
          bodyConflicts={[bodyConflict]}
          noteConflicts={[]}
          choices={{}}
          onChoose={onChoose}
        />
      );
    });

    const fieldset = container.querySelector('fieldset')!;
    expect(fieldset).toBeDefined();
    expect(fieldset.textContent).toContain('Body conflict');
    expect(fieldset.textContent).toContain('80.5 kg');
    expect(fieldset.textContent).toContain('81.2 kg');

    const radios = fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0].name).toBe('body/b1');
    expect(radios[1].name).toBe('body/b1');
    expect(radios[0].value).toBe('device');
    expect(radios[1].value).toBe('cloud');
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(false);

    await act(async () => {
      radios[0].click();
    });
    expect(onChoose).toHaveBeenCalledWith('body/b1', 'device');

    await act(async () => {
      radios[1].click();
    });
    expect(onChoose).toHaveBeenCalledWith('body/b1', 'cloud');
  });

  it('renders exercise note conflict with choices and handles deleted side', async () => {
    const onChoose = vi.fn();
    const noteConflict: ExerciseNoteSyncConflict = {
      key: 'note/Overhead Press',
      name: 'Overhead Press',
      device: 'Squeeze glutes at lockout.',
      cloud: null,
    };

    await act(async () => {
      root.render(
        <BodyNoteConflicts
          bodyConflicts={[]}
          noteConflicts={[noteConflict]}
          choices={{ 'note/Overhead Press': 'cloud' }}
          onChoose={onChoose}
        />
      );
    });

    const fieldset = container.querySelector('fieldset')!;
    expect(fieldset.textContent).toContain('Exercise note conflict · Overhead Press');
    expect(fieldset.textContent).toContain('Squeeze glutes at lockout.');
    expect(fieldset.textContent).toContain('Deleted');

    const cloudRadio = fieldset.querySelector<HTMLInputElement>('input[value="cloud"]')!;
    expect(cloudRadio.checked).toBe(true);

    const deviceRadio = fieldset.querySelector<HTMLInputElement>('input[value="device"]')!;
    expect(deviceRadio.checked).toBe(false);

    await act(async () => {
      deviceRadio.click();
    });
    expect(onChoose).toHaveBeenCalledWith('note/Overhead Press', 'device');
  });

  it('displays updated timestamp on note conflict when present', async () => {
    const onChoose = vi.fn();
    const noteConflict: ExerciseNoteSyncConflict & { updatedAt: number } = {
      key: 'note/Row',
      name: 'Row',
      device: 'Keep elbows tucked.',
      cloud: 'Pull to sternum.',
      updatedAt: 1_700_000_000_000,
    };

    await act(async () => {
      root.render(
        <BodyNoteConflicts
          bodyConflicts={[]}
          noteConflicts={[noteConflict]}
          choices={{}}
          onChoose={onChoose}
        />
      );
    });

    expect(container.textContent).toContain(
      `Updated ${new Date(1_700_000_000_000).toLocaleDateString()}`
    );
  });

  it('handles 80-character long names and notes without breaking', async () => {
    const longName = 'A'.repeat(80);
    const longNote = 'B'.repeat(80);
    const noteConflict: ExerciseNoteSyncConflict = {
      key: `note/${longName}`,
      name: longName,
      device: longNote,
      cloud: 'Short note',
    };

    await act(async () => {
      root.render(
        <BodyNoteConflicts
          bodyConflicts={[]}
          noteConflicts={[noteConflict]}
          choices={{}}
          onChoose={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain(longName);
    expect(container.textContent).toContain(longNote);
  });

  it('renders null when there are no conflicts', async () => {
    await act(async () => {
      root.render(
        <BodyNoteConflicts
          bodyConflicts={[]}
          noteConflicts={[]}
          choices={{}}
          onChoose={vi.fn()}
        />
      );
    });
    expect(container.innerHTML).toBe('');
  });
});

describe('BackupBodyNoteCounts', () => {
  it('renders plain sentences for each non-zero count', async () => {
    const merge: BackupMerge = {
      data: {} as never,
      addedWorkouts: 0,
      addedRoutines: 0,
      addedGoals: 0,
      skippedGoals: 0,
      addedBodyEntries: 3,
      addedExerciseNotes: 2,
      skippedExerciseNotes: 2,
      addedActive: false,
      duplicates: 0,
    };

    await act(async () => {
      root.render(<BackupBodyNoteCounts merge={merge} />);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('3 body entries added.');
    expect(text).toContain('2 exercise notes added.');
    expect(text).toContain(
      '2 exercise notes skipped: you already have a note for that exercise.'
    );
  });

  it('formats singular counts correctly', async () => {
    const merge: BackupMerge = {
      data: {} as never,
      addedWorkouts: 0,
      addedRoutines: 0,
      addedGoals: 0,
      skippedGoals: 0,
      addedBodyEntries: 1,
      addedExerciseNotes: 1,
      skippedExerciseNotes: 1,
      addedActive: false,
      duplicates: 0,
    };

    await act(async () => {
      root.render(<BackupBodyNoteCounts merge={merge} />);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('1 body entry added.');
    expect(text).toContain('1 exercise note added.');
    expect(text).toContain(
      '1 exercise note skipped: you already have a note for that exercise.'
    );
  });

  it('renders null when all counts are 0', async () => {
    const merge: BackupMerge = {
      data: {} as never,
      addedWorkouts: 0,
      addedRoutines: 0,
      addedGoals: 0,
      skippedGoals: 0,
      addedBodyEntries: 0,
      addedExerciseNotes: 0,
      skippedExerciseNotes: 0,
      addedActive: false,
      duplicates: 0,
    };

    await act(async () => {
      root.render(<BackupBodyNoteCounts merge={merge} />);
    });

    expect(container.innerHTML).toBe('');
  });
});
