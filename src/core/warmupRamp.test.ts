import { describe, expect, it } from 'vitest';
import { suggestWarmupRamp, heaviestWeight } from './warmupRamp';

describe('suggestWarmupRamp', () => {
  it('ramps 40/60/80 percent in pounds rounded to 5 lb', () => {
    expect(suggestWarmupRamp(225, 'lb')).toEqual([{ reps: 5, weight: 90 }, { reps: 3, weight: 135 }, { reps: 2, weight: 180 }]);
  });
  it('rounds kilograms to 2.5 kg', () => {
    expect(suggestWarmupRamp(100, 'kg')).toEqual([{ reps: 5, weight: 40 }, { reps: 3, weight: 60 }, { reps: 2, weight: 80 }]);
    expect(suggestWarmupRamp(87.5, 'kg')).toEqual([{ reps: 5, weight: 35 }, { reps: 3, weight: 52.5 }, { reps: 2, weight: 70 }]);
  });
  it('drops duplicate and zero loads for tiny weights', () => {
    expect(suggestWarmupRamp(10, 'lb')).toEqual([{ reps: 5, weight: 5 }]);
    expect(suggestWarmupRamp(45, 'lb')).toEqual([{ reps: 5, weight: 20 }, { reps: 3, weight: 25 }, { reps: 2, weight: 35 }]);
  });
  it('returns nothing when no step stays below the working weight', () => {
    expect(suggestWarmupRamp(5, 'lb')).toEqual([]);
    expect(suggestWarmupRamp(2.5, 'kg')).toEqual([]);
    expect(suggestWarmupRamp(0.5, 'kg')).toEqual([]);
  });
  it('never reaches the working weight and handles heavy loads', () => {
    for (const weight of [7, 12.5, 62.3, 405, 1000, 9999]) {
      const ramp = suggestWarmupRamp(weight, 'lb');
      expect(ramp.length).toBeLessThanOrEqual(4);
      for (const row of ramp) { expect(row.weight).toBeGreaterThan(0); expect(row.weight).toBeLessThan(weight); expect(row.weight % 5).toBe(0); }
    }
    expect(suggestWarmupRamp(1000, 'kg').map(r => r.weight)).toEqual([400, 600, 800]);
  });
  it('rejects zero, negative, non-finite and unsupported input', () => {
    for (const bad of [0, -5, NaN, Infinity, -Infinity]) expect(() => suggestWarmupRamp(bad, 'lb')).toThrow('working weight');
    expect(() => suggestWarmupRamp(100, 'stone' as never)).toThrow('unit');
  });
});

describe('heaviestWeight', () => {
  it('returns the largest set weight or undefined', () => {
    expect(heaviestWeight([{ id: 'a', reps: 5, weight: 100 }, { id: 'b', reps: 5, weight: 120 }])).toBe(120);
    expect(heaviestWeight([])).toBeUndefined();
    expect(heaviestWeight([{ id: 'a', reps: 5, weight: 0 }])).toBeUndefined();
  });
});
