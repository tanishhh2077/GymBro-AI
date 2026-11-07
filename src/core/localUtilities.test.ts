import { beforeEach, expect, it, vi } from 'vitest';
import { readProfiles, saveProfiles, readReminder, saveReminder, WEEK, PROFILE_KEY, REMINDER_KEY } from './localUtilities';
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const profile = { name: 'Home', unit: 'lb' as const, bar: '45', inventory: [{ weight: '45', pairs: '2' }] };
it('round trips named equipment without workout data', () => {
  expect(saveProfiles([profile]).notice).toBe('');
  expect(readProfiles().value).toEqual([profile]);
  expect(saveProfiles([]).value).toEqual([]);
});
it('rejects duplicate names, invalid inventory and excessive profiles', () => {
  expect(() => saveProfiles([profile, profile])).toThrow();
  expect(() => saveProfiles([{ ...profile, inventory: [{ weight: '0', pairs: '2' }] }])).toThrow();
  expect(() => saveProfiles(Array.from({ length: 21 }, (_, i) => ({ ...profile, name: String(i) })))).toThrow();
});
it.each(['broken', '{"version":99}', 'x'.repeat(50001)])('preserves unreadable profiles %s', raw => {
  localStorage.setItem(PROFILE_KEY, raw);
  expect(readProfiles().notice).toContain('screen');
  expect(saveProfiles([profile]).notice).toContain('screen');
  expect(localStorage.getItem(PROFILE_KEY)).toBe(raw);
});
it('defaults reminders off and round trips a weekly deadline', () => {
  expect(readReminder().value).toEqual({ enabled: false, nextDue: null });
  expect(saveReminder({ enabled: true, nextDue: 1000 + WEEK }).notice).toBe('');
  expect(readReminder().value.nextDue).toBe(1000 + WEEK);
});
it('preserves unknown reminder fields and fails safely on denied writes', () => {
  const raw = '{"version":1,"enabled":false,"nextDue":null,"future":true}';
  localStorage.setItem(REMINDER_KEY, raw);
  expect(saveReminder({ enabled: true, nextDue: WEEK }).notice).toContain('screen');
  expect(localStorage.getItem(REMINDER_KEY)).toBe(raw);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  expect(saveProfiles([profile]).value).toEqual([profile]);
  expect(saveProfiles([profile]).notice).toContain('screen');
});
it('blocks unsupported profile fields without overwriting them', () => {
  const raw = JSON.stringify({ version: 1, value: [{ ...profile, future: 'keep' }] });
  localStorage.setItem(PROFILE_KEY, raw);
  expect(saveProfiles([]).notice).toContain('preserved');
  expect(localStorage.getItem(PROFILE_KEY)).toBe(raw);
});
it('keeps unit profiles distinct and rejects invalid reminder deadlines', () => {
  expect(saveProfiles([profile, { ...profile, unit: 'kg' }]).value).toHaveLength(2);
  expect(() => saveReminder({ enabled: true, nextDue: NaN })).toThrow();
  expect(() => saveReminder({ enabled: false, nextDue: 1 })).toThrow();
});
it('handles denied reads without erasing existing data', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  const write = vi.spyOn(Storage.prototype, 'setItem');
  expect(readReminder().notice).toContain('screen');
  expect(saveProfiles([profile]).notice).toContain('screen');
  expect(write).not.toHaveBeenCalled();
});
