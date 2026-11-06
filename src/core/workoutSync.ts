import type { Workout, WorkoutData, WorkoutRoutine } from '@/types/workout';
import { validateWorkoutData, WorkoutError } from './workouts';

export type SyncChoice = 'device' | 'cloud';
export interface SyncConflict {
  readonly key: string;
  readonly name: string;
  readonly device: Workout | WorkoutRoutine | null;
  readonly cloud: Workout | WorkoutRoutine | null;
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
  choices: Readonly<Record<string, SyncChoice>> = {}): { data: WorkoutData; conflicts: SyncConflict[] } {
  base = validateWorkoutData(base);
  device = validateWorkoutData(device);
  cloud = validateWorkoutData(cloud);
  const conflicts: SyncConflict[] = [];
  function records<T extends Workout | WorkoutRoutine>(kind: string, before: readonly T[], local: readonly T[], remote: readonly T[]): T[] {
    const maps = [before, local, remote].map(values => new Map(values.map(value => [value.id, value])));
    const ids = new Set([...maps[2].keys(), ...maps[1].keys(), ...maps[0].keys()]);
    const result: T[] = [];
    for (const id of ids) {
      const [original, left, right] = maps.map(map => map.get(id) ?? null);
      let selected: T | null;
      if (canonical(left) === canonical(right)) selected = left;
      else if (canonical(left) === canonical(original)) selected = right;
      else if (canonical(right) === canonical(original)) selected = left;
      else {
        const key = `${kind}/${id}`;
        if (!choices[key]) conflicts.push({ key, name: (left ?? right)!.name, device: left, cloud: right });
        selected = choices[key] === 'cloud' ? right : left;
      }
      if (selected) result.push(selected);
    }
    return result;
  }
  const workouts = (data: WorkoutData) => [...data.history, ...(data.active ? [data.active] : [])];
  const merged = records('workout', workouts(base), workouts(device), workouts(cloud));
  const routines = records('routine', base.routines ?? [], device.routines ?? [], cloud.routines ?? []);
  const active = merged.filter(value => value.finishedAt === null);
  if (active.length > 1) throw new WorkoutError('conflict', 'There are two different active workouts. Finish one on its device, then preview sync again.');
  const history = merged.filter(value => value.finishedAt !== null)
    .sort((a, b) => b.finishedAt! - a.finishedAt! || a.id.localeCompare(b.id));
  const data = validateWorkoutData({ ...device, active: active[0] ?? null, history,
    ...((routines.length || device.routines || cloud.routines) ? { routines } : {}) });
  return { data, conflicts };
}
