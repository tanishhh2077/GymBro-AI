import { describe, expect, it } from 'vitest';
import { emptyWorkoutData } from './workouts';
import { mergeWorkoutSync, syncSnapshot } from './workoutSync';
import type { Workout, WorkoutData } from '@/types/workout';

function workout(id = 'w', weight = 50, finishedAt: number | null = 20): Workout {
  return { id, name: `Workout ${id}`, unit: 'kg', startedAt: 10, finishedAt,
    exercises: [{ id: 'e', name: 'Bench press', sets: [{ id: 's', reps: 8, weight }] }] };
}
function library(...history: Workout[]): WorkoutData { return { ...emptyWorkoutData(), history }; }

describe('three-way workout synchronization', () => {
  it('merges independent device and cloud additions without depending on local revisions', () => {
    const result = mergeWorkoutSync(library(), { ...library(workout('a')), revision: 7 }, library(workout('b')));
    expect(result.conflicts).toEqual([]);
    expect(result.data.history.map(w => w.id)).toEqual(['a', 'b']);
    expect(result.data.revision).toBe(7);
  });
  it('takes a one-sided edit and preserves units, targets and actual sets', () => {
    const base = library(workout());
    const cloud = library({ ...workout(), unit: 'lb', exercises: [{ ...workout().exercises[0], targetReps: 12 }] });
    expect(mergeWorkoutSync(base, base, cloud).data.history).toEqual(cloud.history);
  });
  it('recognizes equal records regardless of JSON object property order', () => {
    const cloud = library(JSON.parse(JSON.stringify(workout(), ['exercises', 'sets', 'weight', 'reps', 'id', 'name', 'unit', 'finishedAt', 'startedAt'])));
    expect(mergeWorkoutSync(library(), library(workout()), cloud).conflicts).toEqual([]);
  });
  it('requires an explicit choice for concurrent edits', () => {
    const args = [library(workout()), library(workout('w', 55)), library(workout('w', 60))] as const;
    const result = mergeWorkoutSync(...args);
    expect(result.conflicts).toMatchObject([{ key: 'workout/w', name: 'Workout w', device: { exercises: expect.any(Array) }, cloud: { exercises: expect.any(Array) } }]);
    expect(mergeWorkoutSync(...args, { 'workout/w': 'cloud' }).data.history[0].exercises[0].sets[0].weight).toBe(60);
    expect(mergeWorkoutSync(...args, { 'workout/w': 'device' }).data.history[0].exercises[0].sets[0].weight).toBe(55);
  });
  it.each(['device', 'cloud'] as const)('propagates an unchanged record deletion from %s', side => {
    const base = library(workout());
    const result = mergeWorkoutSync(base, side === 'device' ? library() : base, side === 'cloud' ? library() : base);
    expect(result.data.history).toEqual([]); expect(result.conflicts).toEqual([]);
  });
  it('detects edit-versus-delete and honors a deliberate deletion choice', () => {
    const args = [library(workout()), library(), library(workout('w', 60))] as const;
    expect(mergeWorkoutSync(...args).conflicts[0].device).toBeNull();
    expect(mergeWorkoutSync(...args, { 'workout/w': 'device' }).data.history).toEqual([]);
    expect(mergeWorkoutSync(...args, { 'workout/w': 'cloud' }).data.history).toHaveLength(1);
  });
  it('treats first-sync collisions as conflicts instead of overwriting records', () => {
    expect(mergeWorkoutSync(library(), library(workout()), library(workout('w', 70))).conflicts).toHaveLength(1);
  });
  it('moves the same active workout to history when the other device finishes it', () => {
    const base = { ...library(), active: workout('w', 50, null) };
    const merged = mergeWorkoutSync(base, base, library(workout()));
    expect(merged.data.active).toBeNull(); expect(merged.data.history).toHaveLength(1);
  });
  it('rejects two different active workouts without silently dropping either', () => {
    expect(() => mergeWorkoutSync(library(), { ...library(), active: workout('a', 50, null) },
      { ...library(), active: workout('b', 50, null) })).toThrow(/two different active workouts/i);
  });
  it('merges routine changes independently and preserves exercise order', () => {
    const routine = { id: 'r', name: 'Upper', unit: 'kg' as const, exercises: [{ id: 'a', name: 'Bench press' }, { id: 'b', name: 'Row' }] };
    const base = { ...library(), routines: [routine] };
    const cloud = { ...library(), routines: [{ ...routine, exercises: [...routine.exercises].reverse() }] };
    const result = mergeWorkoutSync(base, { ...base, history: [workout()] }, cloud);
    expect(result.data.routines).toEqual(cloud.routines); expect(result.data.history).toHaveLength(1);
  });
  it('detects routine deletion versus edit separately from workout IDs', () => {
    const routine = { id: 'w', name: 'Upper', unit: 'kg' as const, exercises: [{ id: 'e', name: 'Bench press' }] };
    const base = { ...library(workout()), routines: [routine] };
    const cloud = { ...base, routines: [{ ...routine, name: 'Updated' }] };
    expect(mergeWorkoutSync(base, library(workout()), cloud).conflicts).toMatchObject([{ key: 'routine/w' }]);
  });
  it('recovers an uncertain prior remote write by recognizing the already-merged values', () => {
    const base = library(workout()); const device = library(workout('w', 60), workout('new'));
    const cloud = syncSnapshot(mergeWorkoutSync(base, device, base).data);
    const retry = mergeWorkoutSync(base, device, cloud);
    expect(retry.conflicts).toEqual([]); expect(retry.data.history).toHaveLength(2);
  });
  it('rejects unknown media fields and unsupported library bounds on every input', () => {
    for (let index = 0; index < 3; index++) {
      const args: WorkoutData[] = [library(), library(), library()];
      args[index] = { ...library(), video: 'private' } as WorkoutData;
      expect(() => mergeWorkoutSync(args[0], args[1], args[2])).toThrow();
    }
    expect(() => syncSnapshot({ ...library(), history: Array.from({ length: 1001 }, (_, i) => workout(`w${i}`)) })).toThrow();
  });
});
