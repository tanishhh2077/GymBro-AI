import { afterEach, expect, it, vi } from 'vitest';
import { INTRO_KEY, introSeen, rememberIntroSeen } from './introPreference';

vi.unmock('@/components/introPreference');
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it('uses a versioned device key that is separate from workout data', () => {
  expect(INTRO_KEY).toBe('gymbro-intro-v1');
});

it('treats a missing or unknown value as not seen', () => {
  expect(introSeen()).toBe(false);
  localStorage.setItem(INTRO_KEY, 'maybe');
  expect(introSeen()).toBe(false);
});

it('remembers that the intro was seen', () => {
  expect(rememberIntroSeen()).toBe(true);
  expect(localStorage.getItem(INTRO_KEY)).toBe('seen');
  expect(introSeen()).toBe(true);
});

it('reports unreadable storage as not seen instead of throwing', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
  expect(introSeen()).toBe(false);
});

it('reports a failed save so the caller can fall back to this session', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  expect(rememberIntroSeen()).toBe(false);
});
