import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { isWeeklyTarget, readWeeklyTarget, writeWeeklyTarget, WEEKLY_TARGET_KEY } from './weeklyTargetPreference';

beforeEach(() => localStorage.clear());
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it('accepts only whole numbers from 1 to 14', () => {
  expect([0, 1, 14, 15, 2.5, -1, NaN].map(isWeeklyTarget)).toEqual([false, true, true, false, false, false, false]);
});
it('reads none when nothing or something invalid is stored, without rewriting', () => {
  expect(readWeeklyTarget()).toEqual({ target: null, readable: true });
  localStorage.setItem(WEEKLY_TARGET_KEY, '99');
  expect(readWeeklyTarget().target).toBeNull();
  expect(localStorage.getItem(WEEKLY_TARGET_KEY)).toBe('99');
});
it('round-trips a target and clears it with null', () => {
  expect(writeWeeklyTarget(3)).toBe(true);
  expect(readWeeklyTarget().target).toBe(3);
  expect(writeWeeklyTarget(null)).toBe(true);
  expect(readWeeklyTarget().target).toBeNull();
  expect(localStorage.getItem(WEEKLY_TARGET_KEY)).toBeNull();
});
it('reports storage failures', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
  expect(readWeeklyTarget()).toEqual({ target: null, readable: false });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
  expect(writeWeeklyTarget(2)).toBe(false);
});

it('rejects all non-number and corrupt types in isWeeklyTarget', () => {
  const invalid = [
    '3', '14', '1', '0', '', ' ', 'null', 'undefined',
    null, undefined, true, false,
    {}, [], () => {}, Symbol(3),
    0.999, 1.0001, 13.999, 14.0001,
    -0, 0, -1, -14, 15, 100, 1000,
    NaN, Infinity, -Infinity,
  ];
  for (const value of invalid) {
    expect(isWeeklyTarget(value), `expected ${String(value)} to be rejected`).toBe(false);
  }
  for (let i = 1; i <= 14; i++) {
    expect(isWeeklyTarget(i), `expected ${i} to be accepted`).toBe(true);
  }
});

it('rejects corrupt, oversized, signed, formatted or out-of-range strings without rewriting storage', () => {
  const corruptValues = [
    '',
    ' ',
    ' 3 ',
    '3\n',
    '\t4',
    '3.5',
    '0.0',
    '+3',
    '-3',
    '0x3',
    '1e1',
    '00',
    '0',
    '15',
    '99',
    '100',
    '999',
    '{"target":3}',
    '[3]',
    'null',
    'undefined',
    'NaN',
    '3'.repeat(50_000),
    '٣',
    '３',
  ];
  for (const corrupt of corruptValues) {
    localStorage.setItem(WEEKLY_TARGET_KEY, corrupt);
    const read = readWeeklyTarget();
    expect(read, `expected ${JSON.stringify(corrupt.slice(0, 15))} to yield target: null`).toEqual({
      target: null,
      readable: true,
    });
    expect(localStorage.getItem(WEEKLY_TARGET_KEY)).toBe(corrupt);
  }
});

it('reads valid padded two-digit numbers correctly', () => {
  localStorage.setItem(WEEKLY_TARGET_KEY, '01');
  expect(readWeeklyTarget()).toEqual({ target: 1, readable: true });
  localStorage.setItem(WEEKLY_TARGET_KEY, '07');
  expect(readWeeklyTarget()).toEqual({ target: 7, readable: true });
});

it('handles varied localStorage write errors including quota and removeItem errors', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
  expect(writeWeeklyTarget(5)).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError');
  });
  expect(writeWeeklyTarget(5)).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage write failed');
  });
  expect(writeWeeklyTarget(5)).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw 'non-error string';
  });
  expect(writeWeeklyTarget(5)).toBe(false);

  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError');
  });
  expect(writeWeeklyTarget(null)).toBe(false);

  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('Storage remove failed');
  });
  expect(writeWeeklyTarget(null)).toBe(false);
});

it('handles varied localStorage read errors and blocked property access', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Security restriction', 'SecurityError');
  });
  expect(readWeeklyTarget()).toEqual({ target: null, readable: false });

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Hardware failure');
  });
  expect(readWeeklyTarget()).toEqual({ target: null, readable: false });

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw 'throw non error';
  });
  expect(readWeeklyTarget()).toEqual({ target: null, readable: false });

  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('localStorage is disabled', 'SecurityError');
  });
  try {
    expect(readWeeklyTarget()).toEqual({ target: null, readable: false });
    expect(writeWeeklyTarget(3)).toBe(false);
    expect(writeWeeklyTarget(null)).toBe(false);
  } finally {
    spy.mockRestore();
  }
});
