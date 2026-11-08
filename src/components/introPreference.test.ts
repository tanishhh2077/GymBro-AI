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

it('treats corrupt, oversized or wrong-type stored values as not seen', () => {
  const corruptValues = [
    '',
    'SEEN',
    'Seen',
    ' seen ',
    'seen\n',
    'seen\0',
    'true',
    'false',
    'null',
    'undefined',
    '0',
    '1',
    JSON.stringify({ seen: true }),
    JSON.stringify(['seen']),
    'x'.repeat(128 * 1024),
    '\u0000\uFFFF\uD83D\uDCA5',
  ];
  for (const value of corruptValues) {
    localStorage.setItem(INTRO_KEY, value);
    expect(introSeen(), `expected ${JSON.stringify(value.slice(0, 20))} to be treated as not seen`).toBe(false);
  }
});

it('never overwrites or clears unknown or corrupt stored values during read', () => {
  const corrupt = '{"unknownVersion": 2, "seen": true}';
  localStorage.setItem(INTRO_KEY, corrupt);
  expect(introSeen()).toBe(false);
  expect(localStorage.getItem(INTRO_KEY)).toBe(corrupt);

  const oversized = 'intro-data-'.repeat(10_000);
  localStorage.setItem(INTRO_KEY, oversized);
  expect(introSeen()).toBe(false);
  expect(localStorage.getItem(INTRO_KEY)).toBe(oversized);
});

it('handles varied localStorage write errors including quota and security errors', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
  expect(rememberIntroSeen()).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Access is denied.', 'SecurityError');
  });
  expect(rememberIntroSeen()).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Disk full');
  });
  expect(rememberIntroSeen()).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw 'string exception';
  });
  expect(rememberIntroSeen()).toBe(false);
});

it('handles varied localStorage read errors without throwing', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError');
  });
  expect(introSeen()).toBe(false);

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Hardware failure');
  });
  expect(introSeen()).toBe(false);

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw 'unexpected error';
  });
  expect(introSeen()).toBe(false);
});

it('handles blocked window.localStorage property access gracefully', () => {
  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('localStorage is disabled', 'SecurityError');
  });
  try {
    expect(introSeen()).toBe(false);
    expect(rememberIntroSeen()).toBe(false);
  } finally {
    spy.mockRestore();
  }
});
