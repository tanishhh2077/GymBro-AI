import { describe, expect, it } from 'vitest';
import type { Workout, WorkoutData, WorkoutExercise } from '@/types/workout';
import { isBenchPressName, resolveSetLink } from './setLinks';

const set = (id: string, reps = 5, weight = 100) => ({ id, reps, weight });
const exercise = (id: string, name: string, sets: WorkoutExercise['sets']): WorkoutExercise => ({ id, name, sets });
const workout = (id: string, finishedAt: number | null, exercises: WorkoutExercise[]): Workout =>
  ({ id, name: `Workout ${id}`, unit: 'kg', startedAt: 1, finishedAt, exercises });

// The saved workout reuses the active workout's exercise and set IDs, which
// validation allows (they are unique only inside one workout).
function library(): WorkoutData {
  return {
    version: 2, revision: 3,
    active: workout('w1', null, [
      exercise('e1', 'Bench press', [set('s1'), set('s2', 3, 120)]),
      exercise('e2', 'Squat', [set('s3')]),
    ]),
    history: [workout('w2', 10, [exercise('e1', 'Bench press', [set('s1', 8, 60)])])],
  };
}

describe('bench-press exercise names', () => {
  it.each(['Bench press', 'BENCH  PRESS', ' bench-press ', 'bench_press', 'Bench', 'Barbell bench press',
    'Flat Bench Press', 'flat barbell bench-press'])('accepts %j', name => {
    expect(isBenchPressName(name)).toBe(true);
  });
  it.each(['Incline bench press', 'Decline bench press', 'Dumbbell bench press', 'Close-grip bench press',
    'Smith machine bench press', 'Bench dip', 'Benchpress', 'Squat', ''])('rejects %j', name => {
    expect(isBenchPressName(name)).toBe(false);
  });
});

describe('resolving a set link', () => {
  it('finds an active-workout set with its current position', () => {
    const found = resolveSetLink(library(), { workoutId: 'w1', exerciseId: 'e1', setId: 's2' });
    expect(found).toMatchObject({ place: 'active', setNumber: 2, set: { reps: 3, weight: 120 } });
    expect(found?.workout.id).toBe('w1');
  });

  it('resolves shared exercise and set IDs only inside the named workout', () => {
    const found = resolveSetLink(library(), { workoutId: 'w2', exerciseId: 'e1', setId: 's1' });
    expect(found).toMatchObject({ place: 'history', setNumber: 1, set: { reps: 8, weight: 60 } });
    expect(resolveSetLink(library(), { workoutId: 'w1', exerciseId: 'e1', setId: 's1' })?.set.reps).toBe(5);
  });

  it('rejects a triple whose parts do not belong together', () => {
    const data = library();
    expect(resolveSetLink(data, { workoutId: 'w1', exerciseId: 'e1', setId: 's3' })).toBeNull();
    expect(resolveSetLink(data, { workoutId: 'w2', exerciseId: 'e1', setId: 's2' })).toBeNull();
    expect(resolveSetLink(data, { workoutId: 'missing', exerciseId: 'e1', setId: 's1' })).toBeNull();
  });

  it('rejects a set of a non-bench exercise', () => {
    expect(resolveSetLink(library(), { workoutId: 'w1', exerciseId: 'e2', setId: 's3' })).toBeNull();
  });

  it('renumbers after an earlier set is removed and fails once its own records are gone', () => {
    const data = library();
    const [bench, squat] = data.active!.exercises;
    const withoutFirst = { ...data, active: { ...data.active!, exercises: [{ ...bench, sets: bench.sets.slice(1) }, squat] } };
    expect(resolveSetLink(withoutFirst, { workoutId: 'w1', exerciseId: 'e1', setId: 's2' })?.setNumber).toBe(1);
    const withoutExercise = { ...data, active: { ...data.active!, exercises: [squat] } };
    expect(resolveSetLink(withoutExercise, { workoutId: 'w1', exerciseId: 'e1', setId: 's2' })).toBeNull();
    expect(resolveSetLink({ ...data, active: null }, { workoutId: 'w1', exerciseId: 'e1', setId: 's2' })).toBeNull();
    expect(resolveSetLink({ ...data, history: [] }, { workoutId: 'w2', exerciseId: 'e1', setId: 's1' })).toBeNull();
  });
});
