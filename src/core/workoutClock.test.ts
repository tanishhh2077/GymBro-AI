import { describe, expect, it } from 'vitest';
import { formatDurationLine, formatElapsedClock } from './workoutClock';

describe('formatElapsedClock', () => {
  it('shows m:ss under an hour and h:mm:ss after', () => {
    expect(formatElapsedClock(0, 0)).toBe('0:00');
    expect(formatElapsedClock(0, 59_999)).toBe('0:59');
    expect(formatElapsedClock(0, 65_000)).toBe('1:05');
    expect(formatElapsedClock(0, 3_600_000)).toBe('1:00:00');
    expect(formatElapsedClock(1000, 1000 + 3_725_000)).toBe('1:02:05');
  });
  it('handles very long sessions without wrapping', () => {
    expect(formatElapsedClock(0, 100 * 3_600_000 + 61_000)).toBe('100:01:01');
  });
  it('shows nothing for a clock that ran backwards or is invalid', () => {
    expect(formatElapsedClock(5000, 1000)).toBeNull();
    expect(formatElapsedClock(NaN, 1000)).toBeNull();
    expect(formatElapsedClock(0, Infinity)).toBeNull();
  });
});

describe('formatDurationLine', () => {
  it('rounds down to whole minutes', () => {
    expect(formatDurationLine(0, 52 * 60_000 + 59_000)).toBe('Duration 52 min');
    expect(formatDurationLine(0, 60_000)).toBe('Duration 1 min');
  });
  it('says under a minute for short sessions', () => {
    expect(formatDurationLine(0, 0)).toBe('Duration under 1 min');
    expect(formatDurationLine(0, 59_999)).toBe('Duration under 1 min');
  });
  it('uses hours for long sessions and keeps very long ones', () => {
    expect(formatDurationLine(0, 3_600_000)).toBe('Duration 1 h 0 min');
    expect(formatDurationLine(0, 125 * 60_000)).toBe('Duration 2 h 5 min');
    expect(formatDurationLine(0, 100 * 3_600_000 + 60_000)).toBe('Duration 100 h 1 min');
  });
  it('shows nothing for invalid, negative or unfinished times', () => {
    expect(formatDurationLine(5000, 1000)).toBeNull();
    expect(formatDurationLine(NaN, 1000)).toBeNull();
    expect(formatDurationLine(0, null)).toBeNull();
  });
});
