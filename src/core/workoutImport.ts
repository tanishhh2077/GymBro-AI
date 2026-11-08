import type { WeightUnit, Workout, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { emptyWorkoutData, validateWorkoutData, WorkoutError } from './workouts';
import { MAX_BACKUP_BYTES, type WorkoutBackup } from './workoutBackup';

// Format provenance (2026-11-07), headers/data descriptions only, no third-party parser code:
// Strong legacy export: https://forum.intervals.icu/t/import-strong-data-weightlifting-app/5531
// Hevy user's actual exported header/rows: https://www.reddit.com/r/Hevy/comments/1nwf0i4/
// FitNotes Android 25.1 actual exporter experiment (header only): https://kinoku.app/compare/kinoku-vs-fitnotes
// Official export instructions: https://help.strongapp.io/article/235-export-workout-data
// https://help.hevyapp.com/hc/en-us/articles/43708290987415-Exporting-Your-Data-from-Hevy
// These are bounded observed variants, not a promise to accept every app/version/platform.
export interface ImportOptions { unit?: WeightUnit; utcOffsetMinutes: number }
export interface WorkoutImport { format: 'Strong' | 'Hevy' | 'FitNotes Android'; backup: WorkoutBackup; warnings: string[]; sets: number }
function invalid(message: string): never { throw new WorkoutError('validation', message); }

function csv(text: string): string[][] {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) invalid('Choose a CSV of at most 4 MiB.');
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false, closed = false;
  function cell() { row.push(field); field = ''; closed = false; if (row.length > 32) invalid('CSV has too many columns.'); }
  function line() { cell(); if (row.some(value => value !== '')) rows.push(row); row = []; if (rows.length > 10001) invalid('Choose a CSV with at most 10000 set rows.'); }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += char;
    } else if (char === separator) cell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i + 1] === '\n') i++; line(); }
    else if (char === '"' && !field && !closed) quoted = true;
    else { if (closed || char === '"') invalid('Malformed CSV quoting. Export a fresh file.'); field += char; }
  }
  if (quoted) invalid('Unclosed CSV quote. Export a fresh file.');
  if (field || row.length || closed) line();
  if (rows.length < 2) invalid('Choose a CSV containing a header and at least one set.');
  const header = rows[0];
  if (new Set(header).size !== header.length || rows.some(item => item.length !== header.length)) invalid('CSV columns do not match the header.');
  return rows;
}
function number(text: string, label: string): number {
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) invalid(`Enter a numeric ${label} in every row.`);
  return Number(text);
}
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function time(text: string, offset: number): number {
  let match: string[] | null = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (!match) {
    const named = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4}),? (\d{2}):(\d{2})$/.exec(text);
    if (named) match = ['', named[3], String(months.indexOf(named[2]) + 1), named[1], named[4], named[5], '0'];
  }
  if (!match) invalid('Unsupported date. Use the original English export (YYYY-MM-DD or Hevy D Mon YYYY, HH:mm).');
  const [year, month, day, hour, minute, second] = match.slice(1).map(value => Number(value ?? 0));
  const value = Date.UTC(year, month - 1, day, hour, minute, second), date = new Date(value);
  if (year < 1970 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day ||
      date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) invalid('Invalid calendar date or time in CSV.');
  return value - offset * 60_000;
}
function duration(text: string): number {
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  const parts = /^(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?$/.exec(text);
  if (parts && parts.slice(1).some(Boolean)) return (Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0)) * 1000;
  const clock = /^(\d+):(\d{2}):(\d{2})$/.exec(text);
  if (clock && Number(clock[2]) < 60 && Number(clock[3]) < 60) return (Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])) * 1000;
  return invalid('Unsupported Strong duration. Export the original CSV again.');
}
// Two independent integer hashes give short, stable IDs even on HTTP where subtle crypto is absent.
// A hash collision cannot overwrite: the backup merge compares full records and stops on conflict.
function id(value: string): string {
  let a = 2166136261, b = 3339675911;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b ^ value.charCodeAt(i), 2246822519); }
  return `csv_${(a >>> 0).toString(16)}_${(b >>> 0).toString(16)}`;
}
export function parseWorkoutImport(text: string, options: ImportOptions): WorkoutImport {
  if (!Number.isInteger(options.utcOffsetMinutes) || Math.abs(options.utcOffsetMinutes) > 14 * 60) invalid('Choose the source UTC offset in minutes, from -840 to 840.');
  const [headers, ...rows] = csv(text), has = (key: string) => headers.includes(key);
  const format = has('Workout Name') && has('Exercise Name') ? 'Strong' : has('exercise_title') && has('start_time') ? 'Hevy' :
    has('Date') && has('Exercise') && has('Weight') && has('Weight Unit') ? 'FitNotes Android' : invalid('Unsupported CSV header. Choose a supported English Strong, Hevy or FitNotes Android export.');
  const required = format === 'Strong' ? ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps'] : format === 'Hevy' ?
    ['title', 'start_time', 'end_time', 'exercise_title', 'set_index', 'set_type', 'reps'] : ['Date', 'Exercise', 'Category', 'Weight', 'Weight Unit', 'Reps', 'Distance', 'Distance Unit', 'Time'];
  if (!required.every(has)) invalid(`Missing required ${format} CSV columns. Use the original supported export.`);
  if (format === 'Hevy' && (!has('weight_lbs') || has('weight_kg'))) invalid('This supported Hevy variant requires weight_lbs. Metric export variants are not supported yet.');
  if (format === 'Strong' && options.unit !== 'kg' && options.unit !== 'lb') invalid('Choose the weight unit used in this Strong export; the file does not specify it.');
  const known = format === 'Strong' ? [...required, 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'] : format === 'Hevy' ? [...required, 'description', 'superset_id', 'exercise_notes', 'weight_lbs', 'distance_miles', 'duration_seconds', 'rpe'] : required;
  if (headers.some(header => !known.includes(header))) invalid('Unrecognized CSV columns. This export variant is unsupported; no records were saved.');
  const warnings = new Set<string>(['Only external-load weight-and-reps exercises are supported. Confirm the preview; exercise types are not reliably encoded in these exports.',
    'Times without a timezone use your chosen fixed UTC offset. Exported times do not encode historical daylight-saving changes.']);
  const workouts = new Map<string, Workout>();
  const indices = new Map<string, Set<string>>(); let sets = 0;
  for (let i = 0; i < rows.length; i++) {
    const get = (key: string) => (rows[i][headers.indexOf(key)] ?? '').replace(/\r\n?/g, '\n').trim();
    const date = get(format === 'Hevy' ? 'start_time' : 'Date');
    const name = format === 'FitNotes Android' ? `FitNotes ${date}` : get(format === 'Hevy' ? 'title' : 'Workout Name');
    const exerciseName = get(format === 'Hevy' ? 'exercise_title' : format === 'Strong' ? 'Exercise Name' : 'Exercise');
    if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(name) || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(exerciseName)) invalid(`Row ${i + 2}: workout and exercise names cannot contain control or hidden formatting characters.`);
    let unit: WeightUnit, weightText: string;
    if (format === 'FitNotes Android') {
      const sourceUnit = get('Weight Unit');
      if (!['kg', 'kgs', 'lb', 'lbs'].includes(sourceUnit)) invalid(`Row ${i + 2}: unsupported FitNotes weight unit. Use the original kg/kgs/lb/lbs export.`);
      unit = sourceUnit === 'kg' || sourceUnit === 'kgs' ? 'kg' : 'lb'; weightText = get('Weight');
      warnings.add('FitNotes date-only rows are grouped by date and unit. Start and finish use the same midnight; actual time and duration are unavailable.');
      warnings.add('FitNotes does not encode warm-up set kind here; imported sets are Regular.');
    } else { unit = format === 'Strong' ? options.unit! : 'lb'; weightText = get(format === 'Strong' ? 'Weight' : unit === 'kg' ? 'weight_kg' : 'weight_lbs'); }
    const weight = number(weightText, 'weight'), reps = number(get('Reps') || get('reps'), 'rep count');
    if (weight <= 0 || /body\s*weight|assisted|weighted\s*(?:pull|chin|dip)|(?:pull|chin)[ -]?up|chest dip/i.test(exerciseName)) invalid(`Row ${i + 2}: bodyweight, assisted, zero or negative loads need manual logging and are not imported.`);
    for (const key of ['Distance', 'Seconds', 'distance_km', 'distance_miles', 'duration_seconds', 'Time']) {
      if (get(key) && !/^0+(?:\.0+)?$/.test(get(key))) invalid(`Row ${i + 2}: timed or distance sets are unsupported; no rows have been saved.`);
    }
    const kindText = get('set_type');
    if (format === 'Hevy' && kindText !== 'normal' && kindText !== 'warmup') invalid(`Row ${i + 2}: unsupported Hevy set type. Only normal and warmup are supported.`);
    if (format === 'Strong') warnings.add('This Strong export does not encode set kinds; imported sets are Regular.');
    if (['Notes', 'Workout Notes', 'exercise_notes', 'description', 'Category', 'superset_id'].some(key => get(key))) warnings.add('Notes, categories and superset labels are not imported. Keep your original CSV for that information.');
    const startedAt = time(date, options.utcOffsetMinutes);
    const finishedAt = format === 'Hevy' ? time(get('end_time'), options.utcOffsetMinutes) : startedAt + (format === 'Strong' ? duration(get('Duration')) : 0);
    const key = JSON.stringify([format, date, name, unit]), workoutId = id(key);
    let workout = workouts.get(key);
    if (!workout) { workout = { id: workoutId, name, unit, startedAt, finishedAt, exercises: [] }; workouts.set(key, workout); }
    if (workout.finishedAt !== finishedAt) invalid(`Row ${i + 2}: conflicting duration for the same workout.`);
    let exercise = workout.exercises.find(item => item.name === exerciseName);
    if (!exercise) { exercise = { id: id(`${key}/${exerciseName}`), name: exerciseName, sets: [] }; (workout.exercises as WorkoutExercise[]).push(exercise); }
    const order = format === 'FitNotes Android' ? String(exercise.sets.length + 1) : get(format === 'Hevy' ? 'set_index' : 'Set Order');
    if (!/^\d+$/.test(order)) invalid(`Row ${i + 2}: unsupported set order or set kind.`);
    const indexKey = `${workoutId}/${exercise.id}`, seen = indices.get(indexKey) ?? new Set<string>();
    if (seen.has(String(Number(order)))) invalid(`Row ${i + 2}: repeated set index; workouts or exercise blocks cannot be distinguished safely.`);
    seen.add(String(Number(order))); indices.set(indexKey, seen);
    const rpe = get('RPE') || get('rpe');
    (exercise.sets as WorkoutSet[]).push({ id: id(`${indexKey}/${order}`), reps, weight, kind: kindText === 'warmup' ? 'warmup' : 'regular', ...(rpe ? { rpe: number(rpe, 'RPE') } : {}) });
    sets++;
  }
  const data = validateWorkoutData({ ...emptyWorkoutData(), history: [...workouts.values()] });
  return { format, backup: { format: 'gymbro-ai-workout-backup', version: 1, exportedAt: 0, data }, warnings: [...warnings], sets };
}
