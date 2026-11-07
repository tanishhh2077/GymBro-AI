import { calculatePlates, type PlateInventory } from './plateCalculator';
import type { WeightUnit } from '@/types/workout';
export const PROFILE_KEY = 'gymbro.equipment-profiles.v1';
export const REMINDER_KEY = 'gymbro.backup-reminder.v1';
export const DAY = 86_400_000;
export const WEEK = 7 * DAY;
export interface EquipmentProfile { name: string; unit: WeightUnit; bar: string; inventory: PlateInventory[] }
export interface ReminderPreference { enabled: boolean; nextDue: number | null }
interface Preference<T> { value: T; notice: string }
const fallback = 'Changes last only while this screen is open. Device storage is unavailable or contains unsupported data; existing data was preserved.';
function keys(value: unknown, expected: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === expected.sort().join(',');
}
function validProfiles(value: unknown): value is EquipmentProfile[] {
  if (!Array.isArray(value) || value.length > 20) return false;
  const names = new Set<string>();
  return value.every(p => {
    if (!keys(p, ['name', 'unit', 'bar', 'inventory']) || typeof p.name !== 'string' || !p.name.trim() || p.name !== p.name.trim() || p.name.length > 60 || Array.from(p.name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) || (p.unit !== 'lb' && p.unit !== 'kg') || typeof p.bar !== 'string' || p.bar.length > 20 || !Array.isArray(p.inventory) || p.inventory.length > 12) return false;
    const identity = `${p.unit}:${p.name}`;
    if (names.has(identity)) return false;
    names.add(identity);
    if (!p.inventory.every(e => keys(e, ['weight', 'pairs']) && typeof e.weight === 'string' && e.weight.length <= 20 && typeof e.pairs === 'string' && e.pairs.length <= 3)) return false;
    return calculatePlates(p.bar, p.bar, p.inventory as PlateInventory[]).status === 'exact';
  });
}
function validReminder(value: unknown): value is ReminderPreference {
  return keys(value, ['enabled', 'nextDue']) && typeof value.enabled === 'boolean' &&
    (value.enabled ? typeof value.nextDue === 'number' && Number.isSafeInteger(value.nextDue) && value.nextDue >= 0 && value.nextDue <= 8.64e15 : value.nextDue === null);
}
function read<T>(key: string, initial: T, validate: (v: unknown) => v is T): Preference<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { value: initial, notice: '' };
    if (raw.length > 50_000) throw new Error();
    const parsed: unknown = JSON.parse(raw);
    if (!keys(parsed, ['version', 'value']) || parsed.version !== 1 || !validate(parsed.value)) throw new Error();
    return { value: parsed.value, notice: '' };
  } catch { return { value: initial, notice: fallback }; }
}
function save<T>(key: string, value: T, initial: T, validate: (v: unknown) => v is T, screenOnly = false): Preference<T> {
  if (!validate(value)) throw new Error('Check the name and equipment values. Use at most 20 profiles with unique names per unit.');
  // Once a screen enters fallback, never overwrite newer data from another tab.
  if (screenOnly || read(key, initial, validate).notice) return { value, notice: fallback };
  try { localStorage.setItem(key, JSON.stringify({ version: 1, value })); return { value, notice: '' }; }
  catch { return { value, notice: fallback }; }
}
export const readProfiles = () => read(PROFILE_KEY, [], validProfiles);
export const saveProfiles = (value: EquipmentProfile[], screenOnly = false) => save(PROFILE_KEY, value, [], validProfiles, screenOnly);
export const readReminder = () => read(REMINDER_KEY, { enabled: false, nextDue: null }, validReminder);
export const saveReminder = (value: ReminderPreference, screenOnly = false) => save(REMINDER_KEY, value, { enabled: false, nextDue: null }, validReminder, screenOnly);
