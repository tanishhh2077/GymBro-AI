import { describe, expect, it } from 'vitest';
import { calculatePlates } from './plateCalculator';

const plate = (weight: string, pairs: string) => ({ weight, pairs });
describe('calculatePlates', () => {
  it('loads fractional plates without floating-point remainders', () => {
    expect(calculatePlates('20.6', '20', [plate('0.1', '1'), plate('0.2', '1')])).toEqual({
      status: 'exact', total: 20.6, plates: [{ weight: 0.2, count: 1 }, { weight: 0.1, count: 1 }],
    });
    expect(calculatePlates('22.5', '20', [plate('1.25', '1')]).status).toBe('exact');
  });
  it('finds a solution where largest-first selection gets stuck', () => {
    expect(calculatePlates('44', '20', [plate('10', '1'), plate('6', '2')])).toEqual({
      status: 'exact', total: 44, plates: [{ weight: 6, count: 2 }],
    });
  });
  it('minimizes plates rather than just returning any exact solution', () => {
    expect(calculatePlates('32', '20', [plate('4', '1'), plate('3', '2'), plate('1', '2')])).toEqual({
      status: 'exact', total: 32, plates: [{ weight: 3, count: 2 }],
    });
  });
  it('respects pair inventory and explains an unattainable total', () => {
    expect(calculatePlates('100', '20', [plate('20', '1')])).toMatchObject({ status: 'unattainable' });
    expect(calculatePlates('25', '20', [plate('2', '10')])).toMatchObject({ status: 'unattainable' });
    expect(calculatePlates('60', '20', [plate('20', '0')])).toMatchObject({ status: 'unattainable' });
  });
  it('rejects targets below the bar and supports the bar alone', () => {
    expect(calculatePlates('19', '20', [])).toMatchObject({ status: 'invalid', message: expect.stringContaining('below') });
    expect(calculatePlates('20', '20', [])).toEqual({ status: 'exact', total: 20, plates: [] });
    expect(calculatePlates('0', '0', [])).toEqual({ status: 'exact', total: 0, plates: [] });
  });
  it.each(['', '-1', 'NaN', 'Infinity', '1e2', '1.0001', '10001'])('rejects invalid target %s', value => {
    expect(calculatePlates(value, '20', [])).toMatchObject({ status: 'invalid' });
  });
  it.each([plate('0', '1'), plate('-1', '1'), plate('1', '-1'), plate('1', '1.5'), plate('1', ''), plate('1', '101')])('rejects invalid inventory %j', entry => {
    expect(calculatePlates('20', '20', [entry])).toMatchObject({ status: 'invalid' });
  });
  it('rejects invalid bars, duplicate denominations and oversized inventories', () => {
    expect(calculatePlates('20', '', []).status).toBe('invalid');
    expect(calculatePlates('20', '20', [plate('1', '1'), plate('1.0', '2')]).status).toBe('invalid');
    expect(calculatePlates('20', '20', Array.from({ length: 13 }, () => plate('1', '1'))).status).toBe('invalid');
  });
  it('bounds unusually fine-grained searches with an explicit limitation', () => {
    expect(calculatePlates('10000', '0', [plate('0.001', '1'), plate('5000', '1')])).toMatchObject({ status: 'invalid', message: expect.stringContaining('range') });
  });
  it('matches exhaustive enumeration for small bounded inventories', () => {
    // An independent oracle enumerates every loading, rather than repeating
    // the optimized solver. This catches inventory/reconstruction mistakes.
    for (let a = 0; a <= 2; a++) for (let b = 0; b <= 2; b++) for (let c = 0; c <= 2; c++) {
      const minimum = new Map<number, number>();
      for (let x = 0; x <= a; x++) for (let y = 0; y <= b; y++) for (let z = 0; z <= c; z++) {
        const total = 20 + 2 * (7 * x + 5 * y + 3 * z);
        minimum.set(total, Math.min(minimum.get(total) ?? Infinity, x + y + z));
      }
      for (let target = 20; target <= 80; target++) {
        const result = calculatePlates(String(target), '20', [plate('7', String(a)), plate('5', String(b)), plate('3', String(c))]);
        if (!minimum.has(target)) { expect(result.status).toBe('unattainable'); continue; }
        expect(result.status).toBe('exact');
        if (result.status !== 'exact') throw new Error('Expected exact loading');
        expect(result.plates.reduce((sum, entry) => sum + entry.count, 0)).toBe(minimum.get(target));
        expect(20 + 2 * result.plates.reduce((sum, entry) => sum + entry.weight * entry.count, 0)).toBe(target);
        for (const entry of result.plates) expect(entry.count).toBeLessThanOrEqual(({ 7: a, 5: b, 3: c } as Record<number, number>)[entry.weight]);
      }
    }
  });
});
