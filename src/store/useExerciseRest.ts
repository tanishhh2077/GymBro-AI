import { useMemo, useSyncExternalStore } from 'react';

export const REST_DURATIONS = [30, 60, 90, 120, 180, 300];
const SESSION_NOTICE = 'Rest defaults apply for this session. Device settings storage is unavailable.';
interface RestSnapshot { values: ReadonlyMap<string, number>; notice: string }
export interface ExerciseRestSettings {
  getDuration: (name: string) => number;
  setDuration: (name: string, seconds: number) => void;
  notice: string;
}
export function createExerciseRestPreferences(scope: string) {
  const key = `gymbro-ai:exercise-rest:${scope}`;
  const listeners = new Set<() => void>();
  let persistent = true;
  function read(): Map<string, number> {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return new Map();
    if (raw.length > 128_000) throw new Error('Rest preferences exceed the supported size.');
    const value = JSON.parse(raw) as { version?: unknown; entries?: unknown };
    if (!value || typeof value !== 'object' || Object.keys(value).length !== 2 || value.version !== 1 ||
      !Array.isArray(value.entries) || value.entries.length > 1000) throw new Error('Unknown rest preferences.');
    const values = new Map<string, number>();
    for (const pair of value.entries) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' ||
        !pair[0] || pair[0].trim() !== pair[0] || pair[0].length > 80 || typeof pair[1] !== 'number' ||
        !REST_DURATIONS.includes(pair[1]) || values.has(pair[0])) throw new Error('Invalid rest preferences.');
      values.set(pair[0], pair[1]);
    }
    return values;
  }
  let current: RestSnapshot;
  try { current = { values: read(), notice: '' }; }
  catch { persistent = false; current = { values: new Map(), notice: SESSION_NOTICE }; }
  return {
    snapshot: () => current,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setDuration: (name: string, seconds: number) => {
      if (!name || name.trim() !== name || name.length > 80 || !REST_DURATIONS.includes(seconds)) throw new Error('Choose a named exercise and a supported rest duration.');
      let values = new Map(current.values); values.set(name, seconds);
      if (persistent) {
        try {
          const fresh = read(); fresh.set(name, seconds);
          if (fresh.size > 1000) throw new Error('Too many saved rest preferences.');
          window.localStorage.setItem(key, JSON.stringify({ version: 1, entries: [...fresh] }));
          values = fresh;
        } catch { persistent = false; }
      }
      current = { values, notice: persistent ? '' : SESSION_NOTICE };
      listeners.forEach(listener => listener());
    },
  };
}
export function useExerciseRest(scope: string): ExerciseRestSettings {
  const controller = useMemo(() => createExerciseRestPreferences(scope), [scope]);
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  return { getDuration: name => state.values.get(name) ?? 90, setDuration: controller.setDuration, notice: state.notice };
}
