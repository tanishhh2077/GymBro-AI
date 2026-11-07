import type { WorkoutData } from '@/types/workout';

interface CatalogExercise {
  readonly name: string;
  readonly muscle: string;
  readonly equipment: string;
  readonly aliases?: readonly string[];
}
export interface ExerciseOption extends CatalogExercise { readonly source: 'Built-in' | 'Saved exercise' }

export const BUILT_IN_EXERCISES: readonly CatalogExercise[] = [
  { name: 'Bench press', muscle: 'Chest', equipment: 'Barbell', aliases: ['flat bench press', 'barbell bench press'] },
  { name: 'Dumbbell bench press', muscle: 'Chest', equipment: 'Dumbbell' },
  { name: 'Incline bench press', muscle: 'Chest', equipment: 'Barbell' },
  { name: 'Incline dumbbell press', muscle: 'Chest', equipment: 'Dumbbell' },
  { name: 'Decline bench press', muscle: 'Chest', equipment: 'Barbell' },
  { name: 'Chest press', muscle: 'Chest', equipment: 'Machine' },
  { name: 'Dumbbell fly', muscle: 'Chest', equipment: 'Dumbbell', aliases: ['flye'] },
  { name: 'Cable fly', muscle: 'Chest', equipment: 'Cable', aliases: ['crossover', 'flye'] },
  { name: 'Push-up', muscle: 'Chest', equipment: 'Bodyweight', aliases: ['pushup', 'push up'] },
  { name: 'Pull-up', muscle: 'Back', equipment: 'Bodyweight', aliases: ['pullup', 'pull up'] },
  { name: 'Chin-up', muscle: 'Back', equipment: 'Bodyweight', aliases: ['chinup', 'chin up'] },
  { name: 'Lat pulldown', muscle: 'Back', equipment: 'Cable', aliases: ['pull down'] },
  { name: 'Seated cable row', muscle: 'Back', equipment: 'Cable' },
  { name: 'Bent-over row', muscle: 'Back', equipment: 'Barbell', aliases: ['barbell row', 'bent over row'] },
  { name: 'One-arm dumbbell row', muscle: 'Back', equipment: 'Dumbbell', aliases: ['single arm row'] },
  { name: 'Chest-supported row', muscle: 'Back', equipment: 'Dumbbell', aliases: ['chest supported row'] },
  { name: 'Machine row', muscle: 'Back', equipment: 'Machine' },
  { name: 'Deadlift', muscle: 'Back', equipment: 'Barbell' },
  { name: 'Romanian deadlift', muscle: 'Legs', equipment: 'Barbell', aliases: ['RDL'] },
  { name: 'Back squat', muscle: 'Legs', equipment: 'Barbell', aliases: ['barbell squat'] },
  { name: 'Front squat', muscle: 'Legs', equipment: 'Barbell' },
  { name: 'Goblet squat', muscle: 'Legs', equipment: 'Dumbbell' },
  { name: 'Bulgarian split squat', muscle: 'Legs', equipment: 'Dumbbell' },
  { name: 'Lunge', muscle: 'Legs', equipment: 'Dumbbell', aliases: ['lunges'] },
  { name: 'Leg press', muscle: 'Legs', equipment: 'Machine' },
  { name: 'Leg extension', muscle: 'Legs', equipment: 'Machine' },
  { name: 'Seated leg curl', muscle: 'Legs', equipment: 'Machine' },
  { name: 'Lying leg curl', muscle: 'Legs', equipment: 'Machine' },
  { name: 'Hip thrust', muscle: 'Glutes', equipment: 'Barbell' },
  { name: 'Glute bridge', muscle: 'Glutes', equipment: 'Bodyweight' },
  { name: 'Cable kickback', muscle: 'Glutes', equipment: 'Cable' },
  { name: 'Standing calf raise', muscle: 'Calves', equipment: 'Machine' },
  { name: 'Seated calf raise', muscle: 'Calves', equipment: 'Machine' },
  { name: 'Overhead press', muscle: 'Shoulders', equipment: 'Barbell', aliases: ['OHP', 'military press'] },
  { name: 'Dumbbell shoulder press', muscle: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral raise', muscle: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Cable lateral raise', muscle: 'Shoulders', equipment: 'Cable' },
  { name: 'Front raise', muscle: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Reverse dumbbell fly', muscle: 'Shoulders', equipment: 'Dumbbell', aliases: ['rear delt fly'] },
  { name: 'Face pull', muscle: 'Shoulders', equipment: 'Cable' },
  { name: 'Upright row', muscle: 'Shoulders', equipment: 'Barbell' },
  { name: 'Barbell curl', muscle: 'Arms', equipment: 'Barbell', aliases: ['biceps'] },
  { name: 'Dumbbell curl', muscle: 'Arms', equipment: 'Dumbbell', aliases: ['biceps'] },
  { name: 'Hammer curl', muscle: 'Arms', equipment: 'Dumbbell', aliases: ['biceps'] },
  { name: 'Cable curl', muscle: 'Arms', equipment: 'Cable', aliases: ['biceps'] },
  { name: 'Preacher curl', muscle: 'Arms', equipment: 'Machine', aliases: ['biceps'] },
  { name: 'Triceps pushdown', muscle: 'Arms', equipment: 'Cable' },
  { name: 'Overhead triceps extension', muscle: 'Arms', equipment: 'Dumbbell' },
  { name: 'Skull crusher', muscle: 'Arms', equipment: 'EZ bar', aliases: ['triceps extension'] },
  { name: 'Dip', muscle: 'Arms', equipment: 'Bodyweight', aliases: ['dips', 'triceps'] },
  { name: 'Crunch', muscle: 'Core', equipment: 'Bodyweight', aliases: ['abs'] },
  { name: 'Cable crunch', muscle: 'Core', equipment: 'Cable', aliases: ['abs'] },
  { name: 'Hanging knee raise', muscle: 'Core', equipment: 'Bodyweight', aliases: ['abs'] },
  { name: 'Leg raise', muscle: 'Core', equipment: 'Bodyweight', aliases: ['abs'] },
  { name: 'Russian twist', muscle: 'Core', equipment: 'Bodyweight', aliases: ['abs'] },
  { name: 'Back extension', muscle: 'Back', equipment: 'Bodyweight' },
  { name: 'Shrug', muscle: 'Shoulders', equipment: 'Dumbbell', aliases: ['traps'] },
];

export function buildExerciseLibrary(data: WorkoutData): readonly ExerciseOption[] {
  const options = new Map<string, ExerciseOption>(BUILT_IN_EXERCISES.map(exercise => [exercise.name, { ...exercise, source: 'Built-in' }]));
  const records = [...(data.active ? [data.active] : []), ...data.history, ...(data.routines ?? [])];
  for (const record of records) {
    for (const exercise of record.exercises) {
      if (!options.has(exercise.name)) options.set(exercise.name, {
        name: exercise.name, muscle: '', equipment: '', source: 'Saved exercise',
      });
    }
  }
  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export const EXERCISE_EQUIPMENT = [...new Set(BUILT_IN_EXERCISES.map(exercise => exercise.equipment))].sort();

export function searchExerciseLibrary(library: readonly ExerciseOption[], query: string, equipment = '', favorites: readonly string[] = []): readonly ExerciseOption[] {
  const normalized = query.trim().toLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const favoriteNames = new Set(favorites);
  return library.filter(exercise => {
    if (equipment && exercise.source === 'Built-in' && exercise.equipment !== equipment) return false;
    const text = [exercise.name, exercise.muscle, exercise.equipment, ...(exercise.aliases ?? [])].join(' ').toLowerCase();
    return terms.every(term => text.includes(term));
  }).sort((left, right) => Number(favoriteNames.has(right.name)) - Number(favoriteNames.has(left.name)) ||
    Number(right.name.toLowerCase() === normalized) - Number(left.name.toLowerCase() === normalized) ||
    left.name.localeCompare(right.name));
}
