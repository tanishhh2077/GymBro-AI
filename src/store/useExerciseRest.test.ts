import { afterEach, expect, it, vi } from 'vitest';
import { createExerciseRestPreferences } from './useExerciseRest';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it('starts with ninety seconds and remembers exact exercise names across units and remounts', () => {
  const first = createExerciseRestPreferences('guest');
  expect(first.snapshot().values.get('Bench press')).toBeUndefined();
  first.setDuration('Bench press', 180); first.setDuration('Curl', 60);
  const reopened = createExerciseRestPreferences('guest');
  expect(reopened.snapshot().values.get('Bench press')).toBe(180);
  expect(reopened.snapshot().values.get('Curl')).toBe(60);
  expect(reopened.snapshot().values.has('bench press')).toBe(false);
});
it('isolates guest and authenticated account defaults', () => {
  createExerciseRestPreferences('guest').setDuration('Bench press', 180);
  createExerciseRestPreferences('account-one').setDuration('Bench press', 60);
  expect(createExerciseRestPreferences('guest').snapshot().values.get('Bench press')).toBe(180);
  expect(createExerciseRestPreferences('account-one').snapshot().values.get('Bench press')).toBe(60);
  expect(createExerciseRestPreferences('account-two').snapshot().values.size).toBe(0);
});
it('merges a fresh saved preference map before writing another exercise', () => {
  const one = createExerciseRestPreferences('guest'); const two = createExerciseRestPreferences('guest');
  one.setDuration('Bench press', 180); two.setDuration('Curl', 60);
  expect(createExerciseRestPreferences('guest').snapshot().values.size).toBe(2);
});
it('continues with session-only values when persistent writes fail', () => {
  const store = createExerciseRestPreferences('guest');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota'); });
  store.setDuration('Bench press', 120);
  expect(store.snapshot().values.get('Bench press')).toBe(120);
  expect(store.snapshot().notice).toMatch(/session/i);
});
it('preserves an unsupported saved format and uses session-only preferences', () => {
  localStorage.setItem('gymbro-ai:exercise-rest:guest', '{"version":99,"sentinel":true}');
  const store = createExerciseRestPreferences('guest'); store.setDuration('Bench press', 120);
  expect(store.snapshot().notice).toMatch(/session/i);
  expect(localStorage.getItem('gymbro-ai:exercise-rest:guest')).toContain('sentinel');
});
it('rejects unsupported durations and names without changing preferences', () => {
  const store = createExerciseRestPreferences('guest');
  expect(() => store.setDuration('Bench press', 0)).toThrow();
  expect(() => store.setDuration(' Bench press', 90)).toThrow();
  expect(store.snapshot().values.size).toBe(0);
});
it('releases its subscriptions and handles arbitrary valid exercise names safely', () => {
  const store = createExerciseRestPreferences('guest'); const receive = vi.fn(); const off = store.subscribe(receive);
  store.setDuration('__proto__', 60); expect(receive).toHaveBeenCalledOnce(); off();
  store.setDuration('__proto__', 90); expect(receive).toHaveBeenCalledOnce();
  expect(createExerciseRestPreferences('guest').snapshot().values.get('__proto__')).toBe(90);
});
