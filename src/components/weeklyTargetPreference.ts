// A device-local weekly workout goal, kept apart from workout records and backups.
export const WEEKLY_TARGET_KEY = 'gymbro-ai:weekly-target-v1';
export const WEEKLY_TARGET_NOTICE = 'Your weekly target applies for this session. Device settings storage is unavailable.';
export const MAX_WEEKLY_TARGET = 14;

export function isWeeklyTarget(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_WEEKLY_TARGET;
}

/** Missing or invalid stored values read as no target and are never rewritten by a read. */
export function readWeeklyTarget(): { target: number | null; readable: boolean } {
  try {
    const raw = window.localStorage.getItem(WEEKLY_TARGET_KEY);
    const value = raw !== null && /^\d{1,2}$/.test(raw) ? Number(raw) : null;
    return { target: isWeeklyTarget(value) ? value : null, readable: true };
  } catch { return { target: null, readable: false }; }
}

/** Returns false when the device refuses the write. A null target removes the stored value. */
export function writeWeeklyTarget(target: number | null): boolean {
  try {
    if (target === null) window.localStorage.removeItem(WEEKLY_TARGET_KEY);
    else window.localStorage.setItem(WEEKLY_TARGET_KEY, String(target));
    return true;
  } catch { return false; }
}
