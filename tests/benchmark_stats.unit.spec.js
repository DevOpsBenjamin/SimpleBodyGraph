import { vi, describe, it, expect } from 'vitest';
import { calculateMedian, getRollingLogsForDate } from '../src/stores/bodyGraph';

// Helper to get previous window end date (refDate offset by offsetDays)
function getPreviousWindowEndDate(refDateStr, offsetDays = 7) {
  const refDate = new Date(refDateStr);
  const prevDate = new Date(refDate);
  prevDate.setDate(prevDate.getDate() - offsetDays);
  return prevDate.toISOString().split('T')[0];
}

// Original implementation style
function getRollingMedianForDateOrig(logs, refDateStr, field, days = 7) {
  const windowLogs = getRollingLogsForDate(logs, refDateStr, days);
  if (windowLogs.length === 0) return null;
  const values = windowLogs.map(l => Number(l[field]));
  return calculateMedian(values);
}

function runOriginalStats(logs) {
  const latestDateStr = logs[0].date;
  const prevWindowEndDateStr = getPreviousWindowEndDate(latestDateStr, 7);

  const rollingMedianMass = getRollingMedianForDateOrig(logs, latestDateStr, 'mass', 7);
  const rollingMedianFat = getRollingMedianForDateOrig(logs, latestDateStr, 'body_fat', 7);
  const rollingMedianLeanMass = getRollingMedianForDateOrig(logs, latestDateStr, 'lean_mass', 7);
  const rollingMedianFatMass = (rollingMedianMass !== null && rollingMedianFat !== null)
    ? rollingMedianMass * (rollingMedianFat / 100)
    : null;

  const prevRollingMedianMass = getRollingMedianForDateOrig(logs, prevWindowEndDateStr, 'mass', 7);
  const prevRollingMedianFat = getRollingMedianForDateOrig(logs, prevWindowEndDateStr, 'body_fat', 7);
  const prevRollingMedianLeanMass = getRollingMedianForDateOrig(logs, prevWindowEndDateStr, 'lean_mass', 7);
  const prevRollingMedianFatMass = (prevRollingMedianMass !== null && prevRollingMedianFat !== null)
    ? prevRollingMedianMass * (prevRollingMedianFat / 100)
    : null;

  return {
    rollingMedianMass,
    rollingMedianFat,
    rollingMedianLeanMass,
    rollingMedianFatMass,
    prevRollingMedianMass,
    prevRollingMedianFat,
    prevRollingMedianLeanMass,
    prevRollingMedianFatMass,
  };
}

// Optimized implementation style
function runOptimizedStats(logs) {
  const latestDateStr = logs[0].date;
  const prevWindowEndDateStr = getPreviousWindowEndDate(latestDateStr, 7);

  const currentWindowLogs = getRollingLogsForDate(logs, latestDateStr, 7);
  const prevWindowLogs = getRollingLogsForDate(logs, prevWindowEndDateStr, 7);

  const rollingMedianMass = currentWindowLogs.length > 0 ? calculateMedian(currentWindowLogs.map(l => Number(l.mass))) : null;
  const rollingMedianFat = currentWindowLogs.length > 0 ? calculateMedian(currentWindowLogs.map(l => Number(l.body_fat))) : null;
  const rollingMedianLeanMass = currentWindowLogs.length > 0 ? calculateMedian(currentWindowLogs.map(l => Number(l.lean_mass))) : null;
  const rollingMedianFatMass = (rollingMedianMass !== null && rollingMedianFat !== null)
    ? rollingMedianMass * (rollingMedianFat / 100)
    : null;

  const prevRollingMedianMass = prevWindowLogs.length > 0 ? calculateMedian(prevWindowLogs.map(l => Number(l.mass))) : null;
  const prevRollingMedianFat = prevWindowLogs.length > 0 ? calculateMedian(prevWindowLogs.map(l => Number(l.body_fat))) : null;
  const prevRollingMedianLeanMass = prevWindowLogs.length > 0 ? calculateMedian(prevWindowLogs.map(l => Number(l.lean_mass))) : null;
  const prevRollingMedianFatMass = (prevRollingMedianMass !== null && prevRollingMedianFat !== null)
    ? prevRollingMedianMass * (prevRollingMedianFat / 100)
    : null;

  return {
    rollingMedianMass,
    rollingMedianFat,
    rollingMedianLeanMass,
    rollingMedianFatMass,
    prevRollingMedianMass,
    prevRollingMedianFat,
    prevRollingMedianLeanMass,
    prevRollingMedianFatMass,
  };
}

describe('Stats calculation performance benchmark', () => {
  it('measures speedup of pre-filtering over redundant full-array filtering', () => {
    // Generate a large dataset of logs (e.g. 3000 logs, about 8 years of daily logs)
    const logs = [];
    const baseDate = new Date('2026-07-20');
    for (let i = 0; i < 3000; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      logs.push({
        id: `log_${i}`,
        date: d.toISOString().split('T')[0],
        mass: 100 - (i * 0.005),
        body_fat: 30 - (i * 0.002),
        lean_mass: 70 - (i * 0.003),
      });
    }

    // Verify both implementations produce identical results
    const origResult = runOriginalStats(logs);
    const optResult = runOptimizedStats(logs);

    expect(optResult).toEqual(origResult);

    // Run original multiple times
    const iterations = 1000;

    const startOrig = performance.now();
    for (let i = 0; i < iterations; i++) {
      runOriginalStats(logs);
    }
    const endOrig = performance.now();
    const durationOrig = endOrig - startOrig;

    // Run optimized multiple times
    const startOpt = performance.now();
    for (let i = 0; i < iterations; i++) {
      runOptimizedStats(logs);
    }
    const endOpt = performance.now();
    const durationOpt = endOpt - startOpt;

    console.log(`\n=================== BENCHMARK RESULTS ===================`);
    console.log(`Calculating rolling medians on ${logs.length} logs (${iterations} iterations):`);
    console.log(`Original (redundant full-array filtering): ${durationOrig.toFixed(2)} ms`);
    console.log(`Optimized (pre-filtered single pass per window): ${durationOpt.toFixed(2)} ms`);
    const speedup = ((durationOrig - durationOpt) / durationOrig * 100).toFixed(2);
    console.log(`Improvement: ${speedup}% speedup`);
    console.log(`=========================================================\n`);

    expect(durationOpt).toBeLessThan(durationOrig);
  });
});
