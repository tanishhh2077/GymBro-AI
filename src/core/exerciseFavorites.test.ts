import { beforeEach, expect, it, vi } from 'vitest';
import { createExerciseFavorites, FAVORITES_KEY } from './exerciseFavorites';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it('persists exact names separately from workout data and merges fresh stored changes', () => {
  localStorage.setItem('unrelated', 'keep');
  const first = createExerciseFavorites();
  const second = createExerciseFavorites();
  first.toggle('Bench press');
  second.toggle('bench press');
  expect(createExerciseFavorites().snapshot().names).toEqual(['Bench press', 'bench press']);
  second.toggle('bench press');
  expect(createExerciseFavorites().snapshot().names).toEqual(['Bench press']);
  expect(localStorage.getItem('unrelated')).toBe('keep');
});

it.each(['null', '{', JSON.stringify({ version: 2, names: [] }),
  JSON.stringify({ version: 1, names: ['X', 'X'] }),
  JSON.stringify({ version: 1, names: [' padded '] }),
  JSON.stringify({ version: 1, names: ['x'.repeat(81)] }),
  JSON.stringify({ version: 1, names: Array.from({ length: 1001 }, (_, i) => `${i}`) }),
  JSON.stringify({ version: 1, names: [], unexpected: true }), 'x'.repeat(128001),
])('rejects malformed or oversized storage without overwriting it', raw => {
  localStorage.setItem(FAVORITES_KEY, raw);
  const favorites = createExerciseFavorites();
  expect(favorites.snapshot().notice).toContain('session');
  favorites.toggle('Bench press');
  expect(favorites.snapshot().names).toEqual(['Bench press']);
  expect(localStorage.getItem(FAVORITES_KEY)).toBe(raw);
});

it('retains choices in memory and notifies subscribers when writes fail', () => {
  const favorites = createExerciseFavorites();
  const notify = vi.fn();
  const unsubscribe = favorites.subscribe(notify);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  favorites.toggle('Bench press');
  expect(favorites.snapshot().names).toEqual(['Bench press']);
  expect(favorites.snapshot().notice).toContain('session');
  expect(notify).toHaveBeenCalledOnce();
  unsubscribe();
  favorites.toggle('Bench press');
  expect(notify).toHaveBeenCalledOnce();
});

it('bounds session choices and rejects invalid names', () => {
  const names = Array.from({ length: 1000 }, (_, i) => `Exercise ${i}`);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, names }));
  const favorites = createExerciseFavorites();
  favorites.toggle('One too many');
  expect(favorites.snapshot().names).toEqual(names);
  expect(favorites.snapshot().notice).toContain('1000');
  expect(() => favorites.toggle('')).toThrow();
  favorites.toggle('Exercise 0');
  expect(favorites.snapshot().names).toHaveLength(999);
});
