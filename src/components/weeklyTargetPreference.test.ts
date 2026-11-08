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
