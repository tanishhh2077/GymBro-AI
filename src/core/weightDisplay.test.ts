import { describe, expect, it } from 'vitest';
import { formatWeight } from './weightDisplay';
import { WorkoutError } from './workouts';

const MINUS = '−';

describe('formatWeight - rejection of invalid values and units', () => {
  it('rejects NaN with a validation WorkoutError', () => {
    expect(() => formatWeight(Number.NaN, 'kg')).toThrow(WorkoutError);
    expect(() => formatWeight(Number.NaN, 'lb')).toThrow('This weight cannot be displayed.');
    try {
      formatWeight(Number.NaN, 'kg');
    } catch (e) {
      expect(e).toBeInstanceOf(WorkoutError);
      expect((e as WorkoutError).kind).toBe('validation');
    }
  });

  it('rejects positive and negative Infinity', () => {
    expect(() => formatWeight(Number.POSITIVE_INFINITY, 'kg')).toThrow(WorkoutError);
    expect(() => formatWeight(Number.NEGATIVE_INFINITY, 'lb')).toThrow('This weight cannot be displayed.');
  });

  it('rejects invalid or unsupported unit strings', () => {
    expect(() => formatWeight(100, 'st' as never)).toThrow('This weight cannot be displayed.');
    expect(() => formatWeight(100, 'oz' as never)).toThrow('This weight cannot be displayed.');
    expect(() => formatWeight(100, '' as never)).toThrow(WorkoutError);
    expect(() => formatWeight(100, 'KG' as never)).toThrow(WorkoutError);
    expect(() => formatWeight(100, undefined as never)).toThrow(WorkoutError);
    expect(() => formatWeight(100, null as never)).toThrow(WorkoutError);
  });
});

describe('formatWeight - zero and negative zero handling', () => {
  it('formats zero in standard mode without signs', () => {
    expect(formatWeight(0, 'kg')).toBe('0 kg');
    expect(formatWeight(0, 'lb')).toBe('0 lb');
    expect(formatWeight(0, 'kg', { alternate: true })).toBe('0 kg · 0 lb');
    expect(formatWeight(0, 'lb', { alternate: true })).toBe('0 lb · 0 kg');
  });

  it('formats negative zero (-0) identically to positive zero in standard mode', () => {
    expect(formatWeight(-0, 'kg')).toBe('0 kg');
    expect(formatWeight(-0, 'lb')).toBe('0 lb');
    expect(formatWeight(-0, 'kg', { alternate: true })).toBe('0 kg · 0 lb');
    expect(formatWeight(-0, 'lb', { alternate: true })).toBe('0 lb · 0 kg');
  });

  it('formats zero and negative zero as "Bodyweight" for bodyweight exercises', () => {
    expect(formatWeight(0, 'kg', { bodyweight: true })).toBe('Bodyweight');
    expect(formatWeight(0, 'lb', { bodyweight: true })).toBe('Bodyweight');
    expect(formatWeight(0, 'kg', { bodyweight: true, alternate: true })).toBe('Bodyweight');
    expect(formatWeight(0, 'lb', { bodyweight: true, alternate: true })).toBe('Bodyweight');

    expect(formatWeight(-0, 'kg', { bodyweight: true })).toBe('Bodyweight');
    expect(formatWeight(-0, 'lb', { bodyweight: true })).toBe('Bodyweight');
    expect(formatWeight(-0, 'kg', { bodyweight: true, alternate: true })).toBe('Bodyweight');
    expect(formatWeight(-0, 'lb', { bodyweight: true, alternate: true })).toBe('Bodyweight');
  });
});

describe('formatWeight - standard loaded sets and unit conversions', () => {
  it('formats positive loads with and without alternate display', () => {
    expect(formatWeight(100, 'kg')).toBe('100 kg');
    expect(formatWeight(100, 'kg', { alternate: false })).toBe('100 kg');
    expect(formatWeight(100, 'kg', { alternate: true })).toBe('100 kg · 220.5 lb');

    expect(formatWeight(225, 'lb')).toBe('225 lb');
    expect(formatWeight(225, 'lb', { alternate: false })).toBe('225 lb');
    expect(formatWeight(225, 'lb', { alternate: true })).toBe('225 lb · 102 kg');
  });

  it('converts common gym barbell and plate loads', () => {
    // 20 kg barbell -> 44 lb
    expect(formatWeight(20, 'kg', { alternate: true })).toBe('20 kg · 44 lb');
    // 45 lb barbell -> 20.5 kg
    expect(formatWeight(45, 'lb', { alternate: true })).toBe('45 lb · 20.5 kg');
    // 135 lb -> 61 kg
    expect(formatWeight(135, 'lb', { alternate: true })).toBe('135 lb · 61 kg');
    // 315 lb -> 143 kg
    expect(formatWeight(315, 'lb', { alternate: true })).toBe('315 lb · 143 kg');
    // 405 lb -> 183.5 kg
    expect(formatWeight(405, 'lb', { alternate: true })).toBe('405 lb · 183.5 kg');
    // 60 kg -> 132.5 lb
    expect(formatWeight(60, 'kg', { alternate: true })).toBe('60 kg · 132.5 lb');
    // 140 kg -> 308.5 lb
    expect(formatWeight(140, 'kg', { alternate: true })).toBe('140 kg · 308.5 lb');
  });
});

describe('formatWeight - rounding at .25 and .75 boundaries and precision', () => {
  it('rounds lb to kg across 0.25 and 0.75 quarter boundaries', () => {
    // 0.55 lb / 2.20462262185 = ~0.2495 -> rounds to 0 kg
    expect(formatWeight(0.55, 'lb', { alternate: true })).toBe('0.55 lb · 0 kg');
    // 0.56 lb / 2.20462262185 = ~0.2540 -> rounds to 0.5 kg
    expect(formatWeight(0.56, 'lb', { alternate: true })).toBe('0.56 lb · 0.5 kg');

    // 1.65 lb / 2.20462262185 = ~0.7484 -> rounds to 0.5 kg
    expect(formatWeight(1.65, 'lb', { alternate: true })).toBe('1.65 lb · 0.5 kg');
    // 1.66 lb / 2.20462262185 = ~0.7529 -> rounds to 1 kg
    expect(formatWeight(1.66, 'lb', { alternate: true })).toBe('1.66 lb · 1 kg');

    // 2.75 lb / 2.20462262185 = ~1.2474 -> rounds to 1 kg
    expect(formatWeight(2.75, 'lb', { alternate: true })).toBe('2.75 lb · 1 kg');
    // 2.76 lb / 2.20462262185 = ~1.2519 -> rounds to 1.5 kg
    expect(formatWeight(2.76, 'lb', { alternate: true })).toBe('2.76 lb · 1.5 kg');

    // 3.85 lb / 2.20462262185 = ~1.7463 -> rounds to 1.5 kg
    expect(formatWeight(3.85, 'lb', { alternate: true })).toBe('3.85 lb · 1.5 kg');
    // 3.86 lb / 2.20462262185 = ~1.7509 -> rounds to 2 kg
    expect(formatWeight(3.86, 'lb', { alternate: true })).toBe('3.86 lb · 2 kg');
  });

  it('rounds kg to lb across 0.25 and 0.75 quarter boundaries', () => {
    // 0.113 kg * 2.20462262185 = ~0.2491 -> rounds to 0 lb
    expect(formatWeight(0.113, 'kg', { alternate: true })).toBe('0.113 kg · 0 lb');
    // 0.114 kg * 2.20462262185 = ~0.2513 -> rounds to 0.5 lb
    expect(formatWeight(0.114, 'kg', { alternate: true })).toBe('0.114 kg · 0.5 lb');

    // 0.339 kg * 2.20462262185 = ~0.7474 -> rounds to 0.5 lb
    expect(formatWeight(0.339, 'kg', { alternate: true })).toBe('0.339 kg · 0.5 lb');
    // 0.341 kg * 2.20462262185 = ~0.7518 -> rounds to 1 lb
    expect(formatWeight(0.341, 'kg', { alternate: true })).toBe('0.341 kg · 1 lb');

    // 0.566 kg * 2.20462262185 = ~1.2478 -> rounds to 1 lb
    expect(formatWeight(0.566, 'kg', { alternate: true })).toBe('0.566 kg · 1 lb');
    // 0.568 kg * 2.20462262185 = ~1.2522 -> rounds to 1.5 lb
    expect(formatWeight(0.568, 'kg', { alternate: true })).toBe('0.568 kg · 1.5 lb');

    // 0.793 kg * 2.20462262185 = ~1.7482 -> rounds to 1.5 lb
    expect(formatWeight(0.793, 'kg', { alternate: true })).toBe('0.793 kg · 1.5 lb');
    // 0.794 kg * 2.20462262185 = ~1.7505 -> rounds to 2 lb
    expect(formatWeight(0.794, 'kg', { alternate: true })).toBe('0.794 kg · 2 lb');
  });

  it('handles floating-point precision like 0.1 + 0.2 gracefully', () => {
    const sum = 0.1 + 0.2; // 0.30000000000000004
    expect(formatWeight(sum, 'kg')).toBe(`${sum} kg`);
    expect(formatWeight(sum, 'kg', { alternate: true })).toBe(`${sum} kg · 0.5 lb`);

    const sum2 = 0.7 + 0.1; // 0.7999999999999999
    expect(formatWeight(sum2, 'lb')).toBe(`${sum2} lb`);
    expect(formatWeight(sum2, 'lb', { alternate: true })).toBe(`${sum2} lb · 0.5 kg`);
  });

  it('handles fractional and quarter-increment logged loads', () => {
    expect(formatWeight(0.25, 'kg')).toBe('0.25 kg');
    expect(formatWeight(0.75, 'kg')).toBe('0.75 kg');
    expect(formatWeight(2.5, 'kg')).toBe('2.5 kg');
    expect(formatWeight(12.75, 'lb')).toBe('12.75 lb');
    expect(formatWeight(102.5, 'kg', { alternate: true })).toBe('102.5 kg · 226 lb');
  });
});

describe('formatWeight - bodyweight added and assisted wording', () => {
  it('formats positive added load with a leading plus sign', () => {
    expect(formatWeight(10, 'kg', { bodyweight: true })).toBe('+10 kg');
    expect(formatWeight(25, 'lb', { bodyweight: true })).toBe('+25 lb');
    expect(formatWeight(0.5, 'kg', { bodyweight: true })).toBe('+0.5 kg');
    expect(formatWeight(2.5, 'lb', { bodyweight: true })).toBe('+2.5 lb');
  });

  it('formats positive added load with alternate unit, prefixing both with plus', () => {
    // 10 kg -> 22 lb
    expect(formatWeight(10, 'kg', { bodyweight: true, alternate: true })).toBe('+10 kg · +22 lb');
    // 25 lb -> 11.5 kg
    expect(formatWeight(25, 'lb', { bodyweight: true, alternate: true })).toBe('+25 lb · +11.5 kg');
  });

  it('formats assisted negative load with Unicode minus and "assist" suffix', () => {
    expect(formatWeight(-10, 'kg', { bodyweight: true })).toBe(`${MINUS}10 kg assist`);
    expect(formatWeight(-25, 'lb', { bodyweight: true })).toBe(`${MINUS}25 lb assist`);
    expect(formatWeight(-0.5, 'kg', { bodyweight: true })).toBe(`${MINUS}0.5 kg assist`);
  });

  it('formats assisted negative load with alternate unit, placing "assist" at the end', () => {
    expect(formatWeight(-10, 'kg', { bodyweight: true, alternate: true })).toBe(
      `${MINUS}10 kg · ${MINUS}22 lb assist`,
    );
    expect(formatWeight(-25, 'lb', { bodyweight: true, alternate: true })).toBe(
      `${MINUS}25 lb · ${MINUS}11.5 kg assist`,
    );
  });

  it('handles small assisted load where converted value rounds to zero without a sign', () => {
    // -0.113 kg converts to 0 lb; signed(0, 'lb') has no sign
    expect(formatWeight(-0.113, 'kg', { bodyweight: true, alternate: true })).toBe(
      `${MINUS}0.113 kg · 0 lb assist`,
    );
    // -0.55 lb converts to 0 kg
    expect(formatWeight(-0.55, 'lb', { bodyweight: true, alternate: true })).toBe(
      `${MINUS}0.55 lb · 0 kg assist`,
    );
  });
});

describe('formatWeight - very large values', () => {
  it('formats 100,000 kg and 1,000,000 lb accurately with alternate values', () => {
    expect(formatWeight(100000, 'kg')).toBe('100000 kg');
    expect(formatWeight(100000, 'kg', { alternate: true })).toBe('100000 kg · 220462.5 lb');
    expect(formatWeight(1000000, 'lb', { alternate: true })).toBe('1000000 lb · 453592.5 kg');
  });

  it('handles Number.MAX_SAFE_INTEGER without throwing or returning NaN', () => {
    const max = Number.MAX_SAFE_INTEGER;
    const kgFormatted = formatWeight(max, 'kg', { alternate: true });
    expect(kgFormatted).toContain(`${max} kg`);
    expect(kgFormatted).toContain('·');
    expect(kgFormatted).toMatch(/lb$/);
    expect(kgFormatted).not.toContain('NaN');

    const lbFormatted = formatWeight(max, 'lb', { alternate: true });
    expect(lbFormatted).toContain(`${max} lb`);
    expect(lbFormatted).toContain('·');
    expect(lbFormatted).toMatch(/kg$/);
    expect(lbFormatted).not.toContain('NaN');
  });

  it('formats very large assisted loads with bodyweight', () => {
    expect(formatWeight(-100000, 'kg', { bodyweight: true, alternate: true })).toBe(
      `${MINUS}100000 kg · ${MINUS}220462.5 lb assist`,
    );
  });
});
