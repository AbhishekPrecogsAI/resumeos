import { describe, it, expect } from 'vitest';
import { formatMonth, formatRange, compareMonths, isValidMonth } from '../src/dates.js';

describe('dates', () => {
  it('formats month values without timezone shift', () => {
    expect(formatMonth('2023-01')).toBe('Jan 2023');
    expect(formatMonth('2023-12')).toBe('Dec 2023');
    expect(formatMonth('2023')).toBe('2023');
  });

  it('rejects invalid values', () => {
    expect(isValidMonth('2023-13')).toBe(false);
    expect(isValidMonth('23-01')).toBe(false);
    expect(formatMonth('nonsense')).toBe('');
  });

  it('formats ranges including current roles', () => {
    expect(formatRange('2020-02', '2022-07')).toBe('Feb 2020 – Jul 2022');
    expect(formatRange('2020-02', '', { current: true })).toBe('Feb 2020 – Present');
    expect(formatRange('', '')).toBe('');
  });

  it('compares months', () => {
    expect(compareMonths('2020-02', '2020-01')).toBeGreaterThan(0);
    expect(compareMonths('2020', '2020-01')).toBe(0);
  });
});
