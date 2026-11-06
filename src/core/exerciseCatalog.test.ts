import { expect, it } from 'vitest';
import { emptyWorkoutData } from './workouts';
import { buildExerciseLibrary, searchExerciseLibrary } from './exerciseCatalog';

it('searches equipment and muscle groups with case-insensitive words in any order', () => {
  const library = buildExerciseLibrary(emptyWorkoutData());
  const names = searchExerciseLibrary(library, ' DUMBBELL   chest ').map(exercise => exercise.name);
  expect(names).toEqual(expect.arrayContaining(['Dumbbell bench press', 'Incline dumbbell press', 'Dumbbell fly']));
  expect(names).not.toContain('Bench press');
  expect(names).not.toContain('Dumbbell curl');
});

it('matches common aliases and puts an exact exercise name before partial matches', () => {
  const library = buildExerciseLibrary(emptyWorkoutData());
  expect(searchExerciseLibrary(library, 'rdl').map(exercise => exercise.name)).toEqual(['Romanian deadlift']);
  expect(searchExerciseLibrary(library, 'barbell bench')[0].name).toBe('Bench press');
  expect(searchExerciseLibrary(library, 'bench press')[0].name).toBe('Bench press');
  expect(searchExerciseLibrary(library, 'unmatched-zxy').length).toBe(0);
});

it('offers names from active workouts, completed history and routines without changing stored names', () => {
  const data = emptyWorkoutData();
  const active = { id: 'active', name: 'Today', unit: 'kg' as const, startedAt: 3_000, finishedAt: null,
    exercises: [{ id: 'active-exercise', name: 'My cable press', sets: [] }] };
  const history = [{ ...active, id: 'history', finishedAt: 4_000,
    exercises: [{ id: 'history-exercise', name: 'bench press', sets: [{ id: 'set', reps: 8, weight: 60 }] }] }];
  const routines = [{ id: 'routine', name: 'Plan', unit: 'lb' as const,
    exercises: [{ id: 'routine-exercise', name: 'My row', targetReps: 12 }] }];
  const source = { ...data, active, history, routines };
  const before = JSON.stringify(source);
  const library = buildExerciseLibrary(source);
  expect(library.filter(exercise => exercise.source === 'Saved exercise').map(exercise => exercise.name))
    .toEqual(expect.arrayContaining(['My cable press', 'bench press', 'My row']));
  expect(library.find(exercise => exercise.name === 'Bench press')?.source).toBe('Built-in');
  expect(JSON.stringify(source)).toBe(before);
});

it('deduplicates exact saved names while keeping case-distinct history available', () => {
  const data = { ...emptyWorkoutData(), routines: [{ id: 'routine', name: 'Plan', unit: 'kg' as const,
    exercises: [{ id: 'one', name: 'Custom row' }, { id: 'two', name: 'Custom row' }, { id: 'three', name: 'custom row' }] }] };
  const matches = searchExerciseLibrary(buildExerciseLibrary(data), 'custom row');
  expect(matches.map(exercise => exercise.name).sort()).toEqual(['Custom row', 'custom row']);
});

it('returns the browsable library for an empty query without mutating its order', () => {
  const library = buildExerciseLibrary(emptyWorkoutData());
  const names = library.map(exercise => exercise.name);
  expect(searchExerciseLibrary(library, '  ').map(exercise => exercise.name)).toEqual(names);
  searchExerciseLibrary(library, 'bench press');
  expect(library.map(exercise => exercise.name)).toEqual(names);
});
