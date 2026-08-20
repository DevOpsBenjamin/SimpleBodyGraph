import { describe, it, expect } from 'vitest';
import { getGoalLinesForMetric, getScaleLimits, CHART_THEMES } from '../src/utils/chartHelpers';

describe('chartHelpers', () => {
  const samplePaliers = [
    { id: 'p1', mass: 80, fat: 20, validated: true },
    { id: 'p2', mass: 75, fat: 15, validated: false },
    { id: 'p3', mass: 70, fat: 12, validated: false }
  ];

  describe('getGoalLinesForMetric', () => {
    it('returns empty array if no paliers', () => {
      expect(getGoalLinesForMetric('weight', [])).toEqual([]);
      expect(getGoalLinesForMetric('weight', null)).toEqual([]);
    });

    it('generates correct weight goal lines', () => {
      const lines = getGoalLinesForMetric('weight', samplePaliers, samplePaliers[1]);
      expect(lines.length).toBe(3);
      expect(lines[0].value).toBe(80);
      expect(lines[0].dashed).toBe(false); // validated palier is solid
      expect(lines[1].value).toBe(75);
      expect(lines[1].dashed).toBe(true);
      expect(lines[1].lineWidth).toBe(2); // active palier has larger width
      expect(lines[2].value).toBe(70);
    });

    it('generates correct fat percentage goal lines', () => {
      const lines = getGoalLinesForMetric('fat', samplePaliers);
      expect(lines.length).toBe(3);
      expect(lines[0].value).toBe(20);
      expect(lines[1].value).toBe(15);
      expect(lines[2].value).toBe(12);
    });

    it('generates correct lean mass goal lines', () => {
      const lines = getGoalLinesForMetric('lean', samplePaliers);
      expect(lines.length).toBe(3);
      // Palier 1: 80 - (80 * 0.20) = 64
      expect(lines[0].value).toBeCloseTo(64);
      // Palier 2: 75 - (75 * 0.15) = 63.75
      expect(lines[1].value).toBeCloseTo(63.75);
    });

    it('generates correct fat mass goal lines', () => {
      const lines = getGoalLinesForMetric('fat_mass', samplePaliers);
      expect(lines.length).toBe(3);
      // Palier 1: 80 * 0.20 = 16
      expect(lines[0].value).toBeCloseTo(16);
      // Palier 2: 75 * 0.15 = 11.25
      expect(lines[1].value).toBeCloseTo(11.25);
    });
  });

  describe('getScaleLimits', () => {
    it('returns empty object when no data points or goal lines', () => {
      expect(getScaleLimits([], 'weight', [])).toEqual({});
    });

    it('calculates min and max with margin for weight', () => {
      const dataPoints = [
        [{ x: '2026-01-01', y: 78 }, { x: '2026-02-01', y: 82 }],
        [{ x: '2026-01-01', y: 79 }, { x: '2026-02-01', y: 81 }]
      ];
      const limits = getScaleLimits(dataPoints, 'weight', samplePaliers);
      // Min val is 70 (from palier 3), max val is 82
      // Margin for weight is 2.0
      expect(limits.min).toBe(68);
      expect(limits.max).toBe(84);
    });

    it('calculates min and max with margin for fat', () => {
      const dataPoints = [
        [{ x: '2026-01-01', y: 18 }, { x: '2026-02-01', y: 22 }]
      ];
      const limits = getScaleLimits(dataPoints, 'fat', samplePaliers);
      // Min val is 12 (from palier 3), max val is 22
      // Margin for fat is 1.5
      expect(limits.min).toBe(10.5);
      expect(limits.max).toBe(23.5);
    });
  });

  describe('CHART_THEMES', () => {
    it('has all 4 color themes defined', () => {
      expect(CHART_THEMES.violet).toBeDefined();
      expect(CHART_THEMES.blue).toBeDefined();
      expect(CHART_THEMES.emerald).toBeDefined();
      expect(CHART_THEMES.amber).toBeDefined();
    });
  });
});
