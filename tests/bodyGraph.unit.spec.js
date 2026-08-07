import { describe, it, expect } from 'vitest';
import { getMondayOfDate, calculateMedian } from '../src/stores/bodyGraph';

describe('calculateMedian', () => {
  it('should return 0 if the array is null, undefined, or empty', () => {
    expect(calculateMedian(null)).toBe(0);
    expect(calculateMedian(undefined)).toBe(0);
    expect(calculateMedian([])).toBe(0);
  });

  it('should calculate the median of an odd-length numeric array', () => {
    expect(calculateMedian([5])).toBe(5);
    expect(calculateMedian([3, 1, 2])).toBe(2);
    expect(calculateMedian([10, 20, 30, 40, 50])).toBe(30);
  });

  it('should calculate the median of an even-length numeric array', () => {
    expect(calculateMedian([1, 2])).toBe(1.5);
    expect(calculateMedian([4, 1, 3, 2])).toBe(2.5);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
  });

  it('should correctly handle negative and decimal numbers', () => {
    expect(calculateMedian([-5, -1, -3])).toBe(-3);
    expect(calculateMedian([1.5, 2.5, 3.5])).toBe(2.5);
    expect(calculateMedian([-1.5, 1.5])).toBe(0);
  });

  it('should filter out null, undefined, and NaN values, and calculate the median of the remaining elements', () => {
    expect(calculateMedian([1, null, 3, undefined, 2])).toBe(2);
    expect(calculateMedian([1, NaN, 2])).toBe(1.5);
    expect(calculateMedian([null, undefined, NaN])).toBe(0);
  });
});

describe('getMondayOfDate', () => {
  it('should correctly find Monday for standard weekdays', () => {
    // 2026-06-17 is a Wednesday. Monday of that week should be 2026-06-15.
    expect(getMondayOfDate('2026-06-17')).toBe('2026-06-15');

    // 2026-06-18 is a Thursday. Monday should be 2026-06-15.
    expect(getMondayOfDate('2026-06-18')).toBe('2026-06-15');

    // 2026-06-16 is a Tuesday. Monday should be 2026-06-15.
    expect(getMondayOfDate('2026-06-16')).toBe('2026-06-15');
  });

  it('should return the same date if the given date is already a Monday', () => {
    // 2026-06-15 is a Monday.
    expect(getMondayOfDate('2026-06-15')).toBe('2026-06-15');
  });

  it('should correctly handle Sunday (day 0) edge case', () => {
    // 2026-06-14 is a Sunday. The helper treats Sunday as the last day of the week,
    // returning the Monday of that same week (2026-06-08).
    expect(getMondayOfDate('2026-06-14')).toBe('2026-06-08');
  });

  it('should correctly handle month boundaries', () => {
    // 2026-06-01 is a Monday. Should return itself.
    expect(getMondayOfDate('2026-06-01')).toBe('2026-06-01');

    // 2026-06-02 is a Tuesday. Should return 2026-06-01.
    expect(getMondayOfDate('2026-06-02')).toBe('2026-06-01');

    // 2026-06-04 is a Thursday. Should return 2026-06-01.
    expect(getMondayOfDate('2026-06-04')).toBe('2026-06-01');

    // 2026-06-07 is a Sunday. Should return 2026-06-01.
    expect(getMondayOfDate('2026-06-07')).toBe('2026-06-01');

    // 2026-07-01 is a Wednesday. Monday of that week is 2026-06-29 (crosses month boundary).
    expect(getMondayOfDate('2026-07-01')).toBe('2026-06-29');

    // 2026-07-05 is a Sunday. Monday of that week is 2026-06-29.
    expect(getMondayOfDate('2026-07-05')).toBe('2026-06-29');
  });

  it('should correctly handle year boundaries', () => {
    // 2026-01-01 is a Thursday. Monday of that week is 2025-12-29 (crosses year boundary).
    expect(getMondayOfDate('2026-01-01')).toBe('2025-12-29');

    // 2026-01-04 is a Sunday. Monday of that week is 2025-12-29.
    expect(getMondayOfDate('2026-01-04')).toBe('2025-12-29');
  });

  it('should correctly handle leap years', () => {
    // 2024 is a leap year (Feb has 29 days).
    // 2024-02-29 is a Thursday. Monday of that week is 2024-02-26.
    expect(getMondayOfDate('2024-02-29')).toBe('2024-02-26');

    // 2024-03-01 is a Friday. Monday of that week is 2024-02-26.
    expect(getMondayOfDate('2024-03-01')).toBe('2024-02-26');

    // 2024-03-03 is a Sunday. Monday of that week is 2024-02-26.
    expect(getMondayOfDate('2024-03-03')).toBe('2024-02-26');
  });
});
