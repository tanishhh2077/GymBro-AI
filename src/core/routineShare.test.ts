import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutRoutine } from '@/types/workout';
import {
  createRoutineShare,
  MAX_ROUTINE_SHARE_BYTES,
  parseRoutineShare,
  readRoutineShareFile,
  ROUTINE_SHARE_FORMAT,
  ROUTINE_SHARE_VERSION,
  routineShareFilename,
} from './routineShare';

function sampleRoutine(overrides: Partial<WorkoutRoutine> = {}): WorkoutRoutine {
  return {
    id: 'routine-123',
    name: 'Upper Body Power',
    unit: 'lb',
    exercises: [
      { id: 'ex-1', name: 'Barbell Bench Press', targetSets: 4, targetReps: 6, targetWeight: 225 },
      { id: 'ex-2', name: 'Barbell Row', targetSets: 4, targetReps: 6, targetWeight: 185 },
      { id: 'ex-3', name: 'Overhead Press', targetSets: 3, targetReps: 8, targetWeight: 135 },
      { id: 'ex-4', name: 'Pull-up', targetSets: 3, targetReps: 10, bodyweight: true },
    ],
    ...overrides,
  };
}

describe('routineShareFilename', () => {
  it('generates a clean slugged filename for standard names', () => {
    expect(routineShareFilename('Upper Body Power')).toBe('gymbro-routine-upper-body-power.json');
    expect(routineShareFilename('Leg Day (Heavy)')).toBe('gymbro-routine-leg-day-heavy.json');
    expect(routineShareFilename('Push #1 - 5x5')).toBe('gymbro-routine-push-1-5x5.json');
  });

  it('falls back to default slug when name has no alphanumeric characters', () => {
    expect(routineShareFilename('???')).toBe('gymbro-routine-routine.json');
    expect(routineShareFilename('---')).toBe('gymbro-routine-routine.json');
  });
});

describe('createRoutineShare', () => {
  it('strips all IDs and creates valid envelope with matching format and version', () => {
    const routine = sampleRoutine({
      exercises: [
        { id: 'ex-1', name: 'Bench Press', superset: 'group-a', targetSets: 3, targetReps: 8, targetWeight: 200 },
        { id: 'ex-2', name: 'Dumbbell Row', superset: 'group-a', targetSets: 3, targetReps: 8, targetWeight: 80 },
        { id: 'ex-3', name: 'Dip', bodyweight: true, targetSets: 3, targetReps: 12, targetWeight: 25 },
        { id: 'ex-4', name: 'Bicep Curl' },
      ],
    });

    const json = createRoutineShare(routine);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: {
        name: 'Upper Body Power',
        unit: 'lb',
        exercises: [
          { name: 'Bench Press', targetSets: 3, targetReps: 8, targetWeight: 200, superset: true },
          { name: 'Dumbbell Row', targetSets: 3, targetReps: 8, targetWeight: 80, superset: true },
          { name: 'Dip', targetSets: 3, targetReps: 12, targetWeight: 25, bodyweight: true },
          { name: 'Bicep Curl' },
        ],
      },
    });

    // Ensure IDs are completely absent
    expect(parsed.routine.id).toBeUndefined();
    expect(parsed.routine.exercises[0].id).toBeUndefined();
    expect(parsed.routine.exercises[1].id).toBeUndefined();
    expect(parsed.routine.exercises[0].superset).toBe(true);
  });

  it('omits optional fields when undefined', () => {
    const routine: WorkoutRoutine = {
      id: 'r1',
      name: 'Minimal Routine',
      unit: 'kg',
      exercises: [{ id: 'e1', name: 'Squat' }],
    };

    const json = createRoutineShare(routine);
    const parsed = JSON.parse(json);

    expect(parsed.routine.exercises[0]).toEqual({ name: 'Squat' });
    expect(Object.keys(parsed.routine.exercises[0])).toEqual(['name']);
  });

  it('rejects an invalid routine input with a descriptive validation error', () => {
    expect(() => createRoutineShare({ id: 'r1', name: '', unit: 'lb', exercises: [] })).toThrow(/name/i);
    expect(() => createRoutineShare({ id: 'r1', name: 'Bad', unit: 'oz' as unknown as 'lb', exercises: [{ id: 'e1', name: 'Pushup' }] })).toThrow(/unit/i);
  });
});

describe('parseRoutineShare', () => {
  it('parses a valid share string into RoutineInput', () => {
    const source = sampleRoutine();
    const json = createRoutineShare(source);
    const parsed = parseRoutineShare(json);

    expect(parsed.name).toBe('Upper Body Power');
    expect(parsed.unit).toBe('lb');
    expect(parsed.exercises).toHaveLength(4);
    expect(parsed.exercises[0]).toEqual({
      name: 'Barbell Bench Press',
      targetSets: 4,
      targetReps: 6,
      targetWeight: 225,
    });
    expect(parsed.exercises[3]).toEqual({
      name: 'Pull-up',
      targetSets: 3,
      targetReps: 10,
      bodyweight: true,
    });
  });

  it('assigns superset group IDs to adjacent exercises marked with superset: true', () => {
    const shareObj = {
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: {
        name: 'Superset Routine',
        unit: 'kg',
        exercises: [
          { name: 'Incline Press', superset: true },
          { name: 'Chest Fly', superset: true },
          { name: 'Squat', superset: false },
          { name: 'Leg Extension', superset: true },
          { name: 'Leg Curl', superset: true },
          { name: 'Calf Raise', superset: true },
        ],
      },
    };

    const result = parseRoutineShare(JSON.stringify(shareObj));
    expect(result.exercises[0].superset).toBeDefined();
    expect(result.exercises[1].superset).toBe(result.exercises[0].superset);
    expect(result.exercises[2].superset).toBeUndefined();
    expect(result.exercises[3].superset).toBeDefined();
    expect(result.exercises[4].superset).toBe(result.exercises[3].superset);
    expect(result.exercises[5].superset).toBe(result.exercises[3].superset);
    expect(result.exercises[3].superset).not.toBe(result.exercises[0].superset);
  });

  it('rejects a lone exercise with superset: true', () => {
    const loneStart = {
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: {
        name: 'Bad Routine',
        unit: 'lb',
        exercises: [
          { name: 'Bench Press', superset: true },
          { name: 'Squat' },
        ],
      },
    };
    expect(() => parseRoutineShare(JSON.stringify(loneStart))).toThrow(/superset/i);

    const loneMiddle = {
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: {
        name: 'Bad Routine',
        unit: 'lb',
        exercises: [
          { name: 'Deadlift' },
          { name: 'Bench Press', superset: true },
          { name: 'Squat' },
        ],
      },
    };
    expect(() => parseRoutineShare(JSON.stringify(loneMiddle))).toThrow(/superset/i);

    const loneEnd = {
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: {
        name: 'Bad Routine',
        unit: 'lb',
        exercises: [
          { name: 'Deadlift' },
          { name: 'Bench Press', superset: true },
        ],
      },
    };
    expect(() => parseRoutineShare(JSON.stringify(loneEnd))).toThrow(/superset/i);
  });

  it('rejects text larger than 64 KiB', () => {
    const huge = ' '.repeat(MAX_ROUTINE_SHARE_BYTES + 1);
    expect(() => parseRoutineShare(huge)).toThrow(/64 KiB/);

    // Byte length test (multibyte characters)
    const multiByte = '{"format":"gymbro-ai-routine","version":1,"routine":{"name":"' + '💪'.repeat(20_000) + '","unit":"lb","exercises":[{"name":"Bench"}]}}';
    expect(() => parseRoutineShare(multiByte)).toThrow(/64 KiB/);
  });

  it('rejects malformed or empty text', () => {
    expect(() => parseRoutineShare('')).toThrow();
    expect(() => parseRoutineShare('   ')).toThrow();
    expect(() => parseRoutineShare('not json')).toThrow(/JSON/);
    expect(() => parseRoutineShare('null')).toThrow();
    expect(() => parseRoutineShare('[]')).toThrow();
  });

  it('rejects text containing unpaired surrogates', () => {
    const badText = '{"format":"gymbro-ai-routine","version":1,"routine":{"name":"Test \uD800","unit":"lb","exercises":[{"name":"A"}]}}';
    expect(() => parseRoutineShare(badText)).toThrow();
  });

  it('rejects invalid or unknown envelope properties', () => {
    const base = {
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: { name: 'Valid', unit: 'lb', exercises: [{ name: 'A' }] },
    };

    expect(() => parseRoutineShare(JSON.stringify({ ...base, extra: 'forbidden' }))).toThrow(/unknown/i);
    expect(() => parseRoutineShare(JSON.stringify({ ...base, format: 'wrong-format' }))).toThrow(/unsupported/i);
    expect(() => parseRoutineShare(JSON.stringify({ ...base, version: 2 }))).toThrow(/unsupported/i);
  });

  it('rejects invalid or unknown routine properties', () => {
    const baseRoutine = { name: 'Valid', unit: 'lb', exercises: [{ name: 'A' }] };
    const envelope = (routine: unknown) => JSON.stringify({ format: ROUTINE_SHARE_FORMAT, version: ROUTINE_SHARE_VERSION, routine });

    expect(() => parseRoutineShare(envelope({ ...baseRoutine, id: 'forbidden-id' }))).toThrow(/unknown/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, extra: 'bad' }))).toThrow(/unknown/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, name: '' }))).toThrow(/name/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, name: '   ' }))).toThrow(/name/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, name: ' leading' }))).toThrow(/name/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, name: 'a'.repeat(81) }))).toThrow(/name/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, unit: 'stone' }))).toThrow(/unit/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, exercises: [] }))).toThrow(/exercises/i);
    expect(() => parseRoutineShare(envelope({ ...baseRoutine, exercises: new Array(101).fill({ name: 'A' }) }))).toThrow(/exercises/i);
  });

  it('rejects unknown or invalid fields in exercise objects', () => {
    const envelope = (exercises: readonly unknown[]) => JSON.stringify({
      format: ROUTINE_SHARE_FORMAT,
      version: ROUTINE_SHARE_VERSION,
      routine: { name: 'Valid', unit: 'lb', exercises },
    });

    expect(() => parseRoutineShare(envelope([{ name: 'Bench', id: 'e1' }]))).toThrow(/unknown/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', sets: [] }]))).toThrow(/unknown/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', rpe: 8 }]))).toThrow(/unknown/i);
    expect(() => parseRoutineShare(envelope([{ name: '' }]))).toThrow(/name/i);
    expect(() => parseRoutineShare(envelope([{ name: '  untrimmed  ' }]))).toThrow(/name/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetSets: 0 }]))).toThrow(/set target/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetSets: 101 }]))).toThrow(/set target/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetSets: 3.5 }]))).toThrow(/set target/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetReps: 0 }]))).toThrow(/rep target/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetReps: 1001 }]))).toThrow(/rep target/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetReps: 8.2 }]))).toThrow(/rep target/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetWeight: -1 }]))).toThrow(/target weight/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', targetWeight: 10001 }]))).toThrow(/target weight/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Pullup', bodyweight: true, targetWeight: -1001 }]))).toThrow(/added weight/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Pullup', bodyweight: true, targetWeight: 10001 }]))).toThrow(/added weight/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Pullup', bodyweight: 'true' as unknown as boolean }]))).toThrow(/bodyweight/i);
    expect(() => parseRoutineShare(envelope([{ name: 'Bench', superset: 'yes' as unknown as boolean }]))).toThrow(/superset/i);
  });
});

describe('readRoutineShareFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const validText = () => createRoutineShare(sampleRoutine());

  it('reads a valid UTF-8 .json file and parses it', async () => {
    const file = new File([validText()], 'my-routine.json', { type: 'application/json' });
    const result = await readRoutineShareFile(file);
    expect(result.name).toBe('Upper Body Power');
  });

  it('rejects empty, oversized, or non-json files before read', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');

    await expect(readRoutineShareFile(new File([], 'empty.json'))).rejects.toThrow();
    await expect(readRoutineShareFile(new File([validText()], 'routine.txt'))).rejects.toThrow();
    await expect(readRoutineShareFile(new File([new Uint8Array(MAX_ROUTINE_SHARE_BYTES + 1)], 'huge.json'))).rejects.toThrow();

    expect(read).not.toHaveBeenCalled();
  });

  it('rejects invalid UTF-8 byte sequences', async () => {
    const file = new File([new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])], 'bad.json');
    await expect(readRoutineShareFile(file)).rejects.toThrow(/UTF-8/);
  });

  it('rejects malformed json content', async () => {
    const file = new File(['{ broken json'], 'bad.json');
    await expect(readRoutineShareFile(file)).rejects.toThrow(/JSON/);
  });

  it('cancels when AbortSignal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(readRoutineShareFile(new File([validText()], 'routine.json'), controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });

    const pending = new AbortController();
    const abortSpy = vi.spyOn(FileReader.prototype, 'abort');
    const promise = readRoutineShareFile(new File([validText()], 'routine.json'), pending.signal);
    pending.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  it('bounds stalled reads with 10 second timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(() => {});
    const controller = new AbortController();
    const promise = readRoutineShareFile(new File([validText()], 'routine.json'), controller.signal);
    const failure = promise.catch(e => e);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(await failure).toMatchObject({ message: expect.stringMatching(/timed out/i) });
  });
});
