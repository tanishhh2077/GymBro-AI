import type { BodyEntry } from '@/types/body';
import type { Workout, WorkoutData, WorkoutGoal, WorkoutRoutine } from '@/types/workout';
import { validateWorkoutData, WorkoutError } from './workouts';

export type SyncChoice = 'device' | 'cloud';
export interface SyncConflict {
  readonly key: string;
  readonly name: string;
  readonly device: Workout | WorkoutRoutine | null;
  readonly cloud: Workout | WorkoutRoutine | null;
}
/** Goal conflicts are listed separately because a goal has no exercises to show; keys are `goal/<id>`. */
export interface GoalSyncConflict {
  readonly key: string;
  readonly name: string;
  readonly device: WorkoutGoal | null;
  readonly cloud: WorkoutGoal | null;
}
/** Concurrent edits to one body log entry; keys are `body/<id>`. null means that side deleted it. */
export interface BodySyncConflict {
  readonly key: string;
  readonly date: number;
  readonly device: BodyEntry | null;
  readonly cloud: BodyEntry | null;
}
/** Concurrent edits to the note for one exact exercise name; keys are `note/<name>`. null means removed. */
export interface ExerciseNoteSyncConflict {
  readonly key: string;
  readonly name: string;
  readonly device: string | null;
  readonly cloud: string | null;
}
export interface WorkoutSyncMerge {
  readonly data: WorkoutData;
  readonly conflicts: SyncConflict[];
  readonly goalConflicts: GoalSyncConflict[];
  readonly bodyConflicts: BodySyncConflict[];
  readonly noteConflicts: ExerciseNoteSyncConflict[];
}
/** True while any conflict list still needs a device or cloud choice. */
export function hasSyncConflicts(merge: WorkoutSyncMerge): boolean {
  return merge.conflicts.length + merge.goalConflicts.length + merge.bodyConflicts.length + merge.noteConflicts.length > 0;
}
export interface SharedWorkoutSnapshot { readonly revision: number; readonly data: WorkoutData }
export interface WorkoutCloud {
  read: () => Promise<SharedWorkoutSnapshot>;
  write: (expectedRevision: number, data: WorkoutData) => Promise<SharedWorkoutSnapshot>;
}
export interface SyncPreview {
  readonly localRevision: number;
  readonly remote: SharedWorkoutSnapshot;
  readonly base: WorkoutData;
  readonly local: WorkoutData;
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
  });
}
export function syncSnapshot(data: WorkoutData): WorkoutData {
  return validateWorkoutData(JSON.parse(JSON.stringify({ ...validateWorkoutData(data), revision: 0 })));
}
export function sameSyncData(a: WorkoutData, b: WorkoutData): boolean {
  return canonical(syncSnapshot(a)) === canonical(syncSnapshot(b));
}
export function validateSharedSnapshot(value: unknown): SharedWorkoutSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkoutError('validation', 'The sync snapshot is invalid.');
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length !== 2 || !Number.isSafeInteger(item.revision) || (item.revision as number) < 0) {
    throw new WorkoutError('validation', 'The sync snapshot revision is invalid.');
  }
  return { revision: item.revision as number, data: syncSnapshot(validateWorkoutData(item.data)) };
}

/** Compare whole records. Independent records merge; concurrent edits stay visible. */
export function mergeWorkoutSync(base: WorkoutData, device: WorkoutData, cloud: WorkoutData,
  choices: Readonly<Record<string, SyncChoice>> = {}): WorkoutSyncMerge {
  base = validateWorkoutData(base);
  device = validateWorkoutData(device);
  cloud = validateWorkoutData(cloud);
  const conflicts: SyncConflict[] = [], goalConflicts: GoalSyncConflict[] = [];
  const bodyConflicts: BodySyncConflict[] = [], noteConflicts: ExerciseNoteSyncConflict[] = [];
  /** Three-way merge of keyed values; the reported conflict carries the key and both sides. */
  function threeWay<T>(kind: string, maps: readonly Map<string, T>[], report: (key: string, device: T | null, cloud: T | null) => void): [string, T][] {
    const ids = new Set([...maps[2].keys(), ...maps[1].keys(), ...maps[0].keys()]);
    const result: [string, T][] = [];
    for (const id of ids) {
      const [original, left, right] = maps.map(map => map.get(id) ?? null);
      let selected: T | null;
      if (canonical(left) === canonical(right)) selected = left;
      else if (canonical(left) === canonical(original)) selected = right;
      else if (canonical(right) === canonical(original)) selected = left;
      else {
        const key = `${kind}/${id}`;
        if (!choices[key]) report(key, left, right);
        selected = choices[key] === 'cloud' ? right : left;
      }
      if (selected !== null) result.push([id, selected]);
    }
    return result;
  }
  function records<T extends Workout | WorkoutRoutine | WorkoutGoal | BodyEntry>(kind: string, before: readonly T[], local: readonly T[], remote: readonly T[],
    report: (key: string, device: T | null, cloud: T | null) => void): T[] {
    return threeWay(kind, [before, local, remote].map(values => new Map(values.map(value => [value.id, value]))), report).map(([, value]) => value);
  }
  const named = <T extends { readonly name: string }>(push: (conflict: { key: string; name: string; device: T | null; cloud: T | null }) => void) =>
    (key: string, left: T | null, right: T | null) => push({ key, name: (left ?? right)!.name, device: left, cloud: right });
  const workouts = (data: WorkoutData) => [...data.history, ...(data.active ? [data.active] : [])];
  const merged = records('workout', workouts(base), workouts(device), workouts(cloud), named<Workout | WorkoutRoutine>(item => conflicts.push(item)));
  const routines = records('routine', base.routines ?? [], device.routines ?? [], cloud.routines ?? [],
    named<Workout | WorkoutRoutine>(item => conflicts.push(item)));
  const mergedGoals = records('goal', base.goals ?? [], device.goals ?? [], cloud.goals ?? [], named<WorkoutGoal>(item => goalConflicts.push(item)));
  const bodyLog = records('body', base.bodyLog ?? [], device.bodyLog ?? [], cloud.bodyLog ?? [],
    (key, left, right) => bodyConflicts.push({ key, date: (left ?? right)!.date, device: left, cloud: right }));
  // Notes merge by exact exercise name; fromEntries keeps names like "__proto__" as own keys.
  const noteMaps = [base, device, cloud].map(data => new Map(Object.entries(data.exerciseNotes ?? {})));
  const exerciseNotes = Object.fromEntries(threeWay('note', noteMaps,
    (key, left, right) => noteConflicts.push({ key, name: key.slice('note/'.length), device: left, cloud: right })));
  // Two goals with different IDs for one exercise mean each device created its own;
  // the user chooses one under the key `goal-key/<[name, unit, bodyweight]>`.
  const byKey = new Map<string, WorkoutGoal[]>();
  for (const goal of mergedGoals) {
    const key = JSON.stringify([goal.name, goal.unit, goal.bodyweight === true]);
    byKey.set(key, [...(byKey.get(key) ?? []), goal]);
  }
  const deviceIds = new Set((device.goals ?? []).map(goal => goal.id));
  const goals: WorkoutGoal[] = [];
  for (const [key, group] of byKey) {
    if (group.length === 1) { goals.push(group[0]); continue; }
    const mine = group.find(goal => deviceIds.has(goal.id)) ?? group[0];
    const theirs = group.find(goal => goal !== mine)!;
    const choiceKey = `goal-key/${key}`;
    if (!choices[choiceKey]) goalConflicts.push({ key: choiceKey, name: mine.name, device: mine, cloud: theirs });
    goals.push(choices[choiceKey] === 'cloud' ? theirs : mine);
  }
  const active = merged.filter(value => value.finishedAt === null);
  if (active.length > 1) throw new WorkoutError('conflict', 'There are two different active workouts. Finish one on its device, then preview sync again.');
  const history = merged.filter(value => value.finishedAt !== null)
    .sort((a, b) => b.finishedAt! - a.finishedAt! || a.id.localeCompare(b.id));
  const data = validateWorkoutData({ ...device, active: active[0] ?? null, history,
    ...((routines.length || device.routines || cloud.routines) ? { routines } : {}),
    ...((goals.length || device.goals || cloud.goals) ? { goals } : {}),
    ...((bodyLog.length || device.bodyLog || cloud.bodyLog) ? { bodyLog } : {}),
    ...((Object.keys(exerciseNotes).length || device.exerciseNotes || cloud.exerciseNotes) ? { exerciseNotes } : {}) });
  return { data, conflicts, goalConflicts, bodyConflicts, noteConflicts };
}
