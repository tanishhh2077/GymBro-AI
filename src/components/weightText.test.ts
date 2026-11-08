import { describe, expect, it } from 'vitest';
import { groupLabel, weightParts } from './weightText';
import { WorkoutError } from '@/core/workouts';

const MINUS = '−';

describe('weightParts - plain bodyweight sets', () => {
  it('returns "Bodyweight" for text and null for alternate when load is zero', () => {
    expect(weightParts(0, 'kg', true)).toEqual({
      text: 'Bodyweight',
      alternate: null,
    });
    expect(weightParts(0, 'lb', true)).toEqual({
      text: 'Bodyweight',
      alternate: null,
    });
  });

  it('treats negative zero (-0) identically to positive zero for bodyweight', () => {
    expect(weightParts(-0, 'kg', true)).toEqual({
      text: 'Bodyweight',
      alternate: null,
    });
    expect(weightParts(-0, 'lb', true)).toEqual({
      text: 'Bodyweight',
      alternate: null,
    });
  });
});

describe('weightParts - added and assisted bodyweight sets', () => {
  it('formats positive added load with plus signs in both text and alternate', () => {
    expect(weightParts(20, 'lb', true)).toEqual({
      text: '+20 lb',
      alternate: '+9 kg',
    });
    expect(weightParts(15, 'kg', true)).toEqual({
      text: '+15 kg',
      alternate: '+33 lb',
    });
    expect(weightParts(0.25, 'kg', true)).toEqual({
      text: '+0.25 kg',
      alternate: '+0.5 lb',
    });
  });

  it('formats negative assisted load with minus signs and strips "assist" from alternate', () => {
    const parts = weightParts(-30, 'lb', true);
    expect(parts.text).toBe(`${MINUS}30 lb assist`);
    // Crucial: alternate must NOT have the trailing "assist" so "≈ -13.5 kg" can render cleanly
    expect(parts.alternate).toBe(`${MINUS}13.5 kg`);
    expect(parts.alternate).not.toContain('assist');

    const kgParts = weightParts(-10, 'kg', true);
    expect(kgParts.text).toBe(`${MINUS}10 kg assist`);
    expect(kgParts.alternate).toBe(`${MINUS}22 lb`);
  });

  it('handles small assisted load where alternate rounds to unsigned zero', () => {
    const parts = weightParts(-0.55, 'lb', true);
    expect(parts.text).toBe(`${MINUS}0.55 lb assist`);
    expect(parts.alternate).toBe('0 kg');
  });
});

describe('weightParts - standard loaded exercises (non-bodyweight)', () => {
  it('formats standard loads with primary text and alternate conversion', () => {
    expect(weightParts(100, 'kg')).toEqual({
      text: '100 kg',
      alternate: '220.5 lb',
    });
    expect(weightParts(100, 'kg', false)).toEqual({
      text: '100 kg',
      alternate: '220.5 lb',
    });
    expect(weightParts(225, 'lb')).toEqual({
      text: '225 lb',
      alternate: '102 kg',
    });
  });

  it('formats zero and negative zero for standard loaded exercises', () => {
    expect(weightParts(0, 'kg')).toEqual({
      text: '0 kg',
      alternate: '0 lb',
    });
    expect(weightParts(-0, 'lb')).toEqual({
      text: '0 lb',
      alternate: '0 kg',
    });
  });

  it('formats large loads for standard exercises', () => {
    expect(weightParts(100000, 'kg')).toEqual({
      text: '100000 kg',
      alternate: '220462.5 lb',
    });
  });
});

describe('weightParts - rejection of invalid inputs', () => {
  it('propagates validation errors for non-finite weights', () => {
    expect(() => weightParts(Number.NaN, 'kg')).toThrow(WorkoutError);
    expect(() => weightParts(Number.POSITIVE_INFINITY, 'lb')).toThrow('This weight cannot be displayed.');
    expect(() => weightParts(Number.NEGATIVE_INFINITY, 'kg')).toThrow('This weight cannot be displayed.');
  });

  it('propagates validation errors for invalid units', () => {
    expect(() => weightParts(100, 'invalid' as never)).toThrow(WorkoutError);
  });
});

describe('groupLabel - formatting exercise progress and goal groups', () => {
  it('formats loaded exercises with unit in parentheses', () => {
    expect(groupLabel({ name: 'Bench Press', unit: 'kg' })).toBe('Bench Press (kg)');
    expect(groupLabel({ name: 'Squat', unit: 'lb', bodyweight: false })).toBe('Squat (lb)');
    expect(groupLabel({ name: 'Deadlift', unit: 'kg', bodyweight: undefined })).toBe('Deadlift (kg)');
  });

  it('formats bodyweight exercises with ", bodyweight" inside parentheses', () => {
    expect(groupLabel({ name: 'Pull-up', unit: 'lb', bodyweight: true })).toBe('Pull-up (lb, bodyweight)');
    expect(groupLabel({ name: 'Dip', unit: 'kg', bodyweight: true })).toBe('Dip (kg, bodyweight)');
  });

  it('handles edge-case exercise names such as empty or with parentheses', () => {
    expect(groupLabel({ name: '', unit: 'kg' })).toBe(' (kg)');
    expect(groupLabel({ name: 'Dumbbell Press (Incline)', unit: 'lb' })).toBe('Dumbbell Press (Incline) (lb)');
    expect(groupLabel({ name: 'Chin-up (Neutral Grip)', unit: 'kg', bodyweight: true })).toBe(
      'Chin-up (Neutral Grip) (kg, bodyweight)',
    );
  });
});
