import { describe, it, expect } from 'vitest';
import { getMondayOfDate, calculateMedian } from '../src/stores/bodyGraph';

describe('calculateMedian', () => {
  it('should return 0 for empty, null, or undefined arrays', () => {
    expect(calculateMedian(null)).toBe(0);
    expect(calculateMedian(undefined)).toBe(0);
    expect(calculateMedian([])).toBe(0);
  });

  it('should return the correct median for single item arrays', () => {
    expect(calculateMedian([42])).toBe(42);
  });

  it('should return the middle item for an odd-length numeric array', () => {
    // Sorted: [1, 2, 3] -> Median is 2
    expect(calculateMedian([3, 1, 2])).toBe(2);
    // Sorted: [10, 15, 20, 25, 30] -> Median is 20
    expect(calculateMedian([25, 10, 30, 15, 20])).toBe(20);
  });

  it('should return the average of the two middle items for an even-length numeric array', () => {
    // Sorted: [1, 2, 3, 4] -> Median is (2+3)/2 = 2.5
    expect(calculateMedian([4, 2, 1, 3])).toBe(2.5);
    // Sorted: [10, 20, 30, 40, 50, 60] -> Median is (30+40)/2 = 35
    expect(calculateMedian([50, 10, 40, 20, 60, 30])).toBe(35);
  });

  it('should correctly filter out null, undefined, and NaN values before calculation', () => {
    // Array: [5, null, 15, undefined, 10, NaN]
    // Filtered & Sorted: [5, 10, 15] -> Median is 10
    expect(calculateMedian([5, null, 15, undefined, 10, NaN])).toBe(10);

    // Array: [null, undefined, NaN]
    // Filtered: [] -> should return 0
    expect(calculateMedian([null, undefined, NaN])).toBe(0);
  });

  it('should handle negative numbers correctly', () => {
    // Sorted: [-10, -5, 0, 5, 10] -> Median is 0
    expect(calculateMedian([10, -5, -10, 5, 0])).toBe(0);
    // Sorted: [-20, -10, 10, 20] -> Median is (-10+10)/2 = 0
    expect(calculateMedian([20, -10, -20, 10])).toBe(0);
    // Sorted: [-5, -2] -> Median is (-5 + -2)/2 = -3.5
    expect(calculateMedian([-2, -5])).toBe(-3.5);
  });

  it('should handle floating point numbers correctly', () => {
    // Sorted: [1.5, 2.5, 3.5] -> Median is 2.5
    expect(calculateMedian([3.5, 1.5, 2.5])).toBe(2.5);
    // Sorted: [1.2, 2.4, 3.6, 4.8] -> Median is (2.4+3.6)/2 = 3.0
    expect(calculateMedian([4.8, 1.2, 3.6, 2.4])).toBe(3.0);
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
