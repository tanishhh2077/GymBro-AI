// A device-local flag kept apart from workout records and backups. The version
// in the key lets a substantially rewritten intro be shown once more later.
export const INTRO_KEY = 'gymbro-intro-v1';
const SEEN = 'seen';

/** Unreadable storage counts as not seen: a skippable intro is better than none. */
export function introSeen(): boolean {
  try { return window.localStorage.getItem(INTRO_KEY) === SEEN; } catch { return false; }
}

/** Returns false when the device refuses the write, so the caller can close for this session only. */
export function rememberIntroSeen(): boolean {
  try { window.localStorage.setItem(INTRO_KEY, SEEN); return true; } catch { return false; }
}
