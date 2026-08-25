import {
  getMondayOfDate,
  getSundayOfMonday,
  calculateMedian,
  getRollingLogsForDate,
  getPreviousWindowEndDate
} from '../../utils/dateAndMath';

/**
 * Computes derived fat_mass and lean_mass for all raw logs.
 */
export function computeLogsWithEstimates(logs = []) {
  return logs.map(log => {
    const mass = Number(log.mass);
    const body_fat = Number(log.body_fat);
    const fat_mass = mass * (body_fat / 100);
    const lean_mass = mass - fat_mass;

    return {
      ...log,
      fat_mass,
      lean_mass
    };
  });
}

/**
 * Groups logs into calendar months and computes median & average stats.
 */
export function computeGroupedMonths(logsWithEstimates = [], startYear = null, endYear = null) {
  if (logsWithEstimates.length === 0) return [];

  let logsToUse = logsWithEstimates;
  if (startYear !== null && endYear !== null) {
    logsToUse = logsToUse.filter(log => {
      const yr = new Date(log.date).getFullYear();
      return yr >= startYear && yr <= endYear;
    });
  }

  const groups = {};
  for (const log of logsToUse) {
    const monthKey = log.date.substring(0, 7);
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(log);
  }

  const months = [];
  for (const [monthKey, monthLogs] of Object.entries(groups)) {
    const masses = monthLogs.map(l => Number(l.mass));
    const fats = monthLogs.map(l => Number(l.body_fat));

    const medianMass = calculateMedian(masses);
    const medianFat = calculateMedian(fats);
    const medianFatMass = medianMass * (medianFat / 100);
    const medianLeanMass = medianMass - medianFatMass;

    const avgMass = masses.length > 0 ? masses.reduce((sum, val) => sum + val, 0) / masses.length : 0;
    const avgFat = fats.length > 0 ? fats.reduce((sum, val) => sum + val, 0) / fats.length : 0;
    const avgFatMass = avgMass * (avgFat / 100);
    const avgLeanMass = avgMass - avgFatMass;

    const startDateStr = `${monthKey}-01`;
    const dateObj = new Date(startDateStr);
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    months.push({
      id: monthKey,
      startDate: startDateStr,
      label,
      logs: monthLogs,
      medianMass,
      medianFat,
      medianFatMass,
      medianLeanMass,
      avgMass,
      avgFat,
      avgFatMass,
      avgLeanMass
    });
  }

  // Sort descending by month
  months.sort((a, b) => b.id.localeCompare(a.id));
  return months;
}

/**
 * Groups logs into weeks (Monday to Sunday) and computes median & average stats.
 */
export function computeGroupedWeeks(logsWithEstimates = [], startYear = null, endYear = null) {
  if (logsWithEstimates.length === 0) return [];

  let logsToUse = logsWithEstimates;
  if (startYear !== null && endYear !== null) {
    logsToUse = logsToUse.filter(log => {
      const yr = new Date(log.date).getFullYear();
      return yr >= startYear && yr <= endYear;
    });
  }

  const groups = {};
  for (const log of logsToUse) {
    const monday = getMondayOfDate(log.date);
    if (!groups[monday]) {
      groups[monday] = [];
    }
    groups[monday].push(log);
  }

  const weeks = [];
  for (const [monday, weekLogs] of Object.entries(groups)) {
    const sunday = getSundayOfMonday(monday);
    const masses = weekLogs.map(l => Number(l.mass));
    const fats = weekLogs.map(l => Number(l.body_fat));

    const medianMass = calculateMedian(masses);
    const medianFat = calculateMedian(fats);
    const medianFatMass = medianMass * (medianFat / 100);
    const medianLeanMass = medianMass - medianFatMass;

    const avgMass = masses.length > 0 ? masses.reduce((sum, val) => sum + val, 0) / masses.length : 0;
    const avgFat = fats.length > 0 ? fats.reduce((sum, val) => sum + val, 0) / fats.length : 0;
    const avgFatMass = avgMass * (avgFat / 100);
    const avgLeanMass = avgMass - avgFatMass;

    const monDate = new Date(monday);
    const sunDate = new Date(sunday);
    const label = `${monDate.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${sunDate.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

    weeks.push({
      id: monday,
      monday,
      sunday,
      label,
      logs: weekLogs,
      medianMass,
      medianFat,
      medianFatMass,
      medianLeanMass,
      avgMass,
      avgFat,
      avgFatMass,
      avgLeanMass
    });
  }

  // Sort descending by week start date
  weeks.sort((a, b) => b.monday.localeCompare(a.monday));
  return weeks;
}

/**
 * Computes rolling 7-day stats across the most recent logs.
 */
export function computeRollingStats(currentLogs = []) {
  const count = currentLogs.length;
  if (count === 0) {
    return {
      currentMass: null,
      currentFat: null,
      currentFatMass: null,
      currentLeanMass: null,
      massChange: 0,
      fatChange: 0,
      fatMassChange: 0,
      leanMassChange: 0,
      rollingMedianMass: null,
      rollingMedianFat: null,
      rollingMedianLeanMass: null,
      rollingMedianFatMass: null,
      rollingMedianMassChange: 0,
      rollingMedianFatChange: 0,
      rollingMedianLeanMassChange: 0,
      rollingMedianFatMassChange: 0,
      unsyncedCount: 0
    };
  }

  const currentEntry = currentLogs[0];
  const prevEntry = currentLogs[1] || null;
  const unsyncedCount = currentLogs.filter(log => !log.synced).length;

  const latestDateStr = currentEntry.date;
  const prevWindowEndDateStr = getPreviousWindowEndDate(latestDateStr, 7);

  const currentWindowLogs = getRollingLogsForDate(currentLogs, latestDateStr, 7);
  const prevWindowLogs = getRollingLogsForDate(currentLogs, prevWindowEndDateStr, 7);

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

  const rollingMedianMassChange = (rollingMedianMass !== null && prevRollingMedianMass !== null)
    ? rollingMedianMass - prevRollingMedianMass
    : 0;

  const rollingMedianFatChange = (rollingMedianFat !== null && prevRollingMedianFat !== null)
    ? rollingMedianFat - prevRollingMedianFat
    : 0;

  const rollingMedianLeanMassChange = (rollingMedianLeanMass !== null && prevRollingMedianLeanMass !== null)
    ? rollingMedianLeanMass - prevRollingMedianLeanMass
    : 0;

  const rollingMedianFatMassChange = (rollingMedianFatMass !== null && prevRollingMedianFat !== null)
    ? rollingMedianFatMass - prevRollingMedianFatMass
    : 0;

  return {
    currentMass: Number(currentEntry.mass),
    currentFat: Number(currentEntry.body_fat),
    currentFatMass: Number(currentEntry.fat_mass),
    currentLeanMass: Number(currentEntry.lean_mass),
    massChange: prevEntry ? Number(currentEntry.mass) - Number(prevEntry.mass) : 0,
    fatChange: prevEntry ? Number(currentEntry.body_fat) - Number(prevEntry.body_fat) : 0,
    fatMassChange: prevEntry ? Number(currentEntry.fat_mass) - Number(prevEntry.fat_mass) : 0,
    leanMassChange: prevEntry ? Number(currentEntry.lean_mass) - Number(prevEntry.lean_mass) : 0,
    rollingMedianMass,
    rollingMedianFat,
    rollingMedianLeanMass,
    rollingMedianFatMass,
    rollingMedianMassChange,
    rollingMedianFatChange,
    rollingMedianLeanMassChange,
    rollingMedianFatMassChange,
    unsyncedCount
  };
}

/**
 * Computes period-aware stats (Monthly vs previous month, Weekly vs previous 7d).
 */
export function computePeriodStats({ activeTab, groupedMonths, groupedWeeks, activeMonth, activeWeek, selectedMonthIndex, selectedWeekIndex, stats }) {
  const isMonthView = activeTab === 'monthly';
  const isWeekView = activeTab === 'weekly';

  if (isMonthView && groupedMonths.length > 0) {
    const active = activeMonth || groupedMonths[0];
    const nextMonth = groupedMonths[selectedMonthIndex + 1] || null;

    const currentMass = active.medianMass;
    const currentFat = active.medianFat;
    const currentFatMass = active.medianFatMass;
    const currentLeanMass = active.medianLeanMass;

    const prevMass = nextMonth ? nextMonth.medianMass : null;
    const prevFat = nextMonth ? nextMonth.medianFat : null;
    const prevFatMass = nextMonth ? nextMonth.medianFatMass : null;
    const prevLeanMass = nextMonth ? nextMonth.medianLeanMass : null;

    const massChange = (currentMass !== null && prevMass !== null) ? (currentMass - prevMass) : 0;
    const fatChange = (currentFat !== null && prevFat !== null) ? (currentFat - prevFat) : 0;
    const fatMassChange = (currentFatMass !== null && prevFatMass !== null) ? (currentFatMass - prevFatMass) : 0;
    const leanMassChange = (currentLeanMass !== null && prevLeanMass !== null) ? (currentLeanMass - prevLeanMass) : 0;

    return {
      currentMass,
      currentFat,
      currentFatMass,
      currentLeanMass,
      massChange,
      fatChange,
      fatMassChange,
      leanMassChange,
      comparisonLabel: 'mois préc.',
      periodBadge: 'Mois',
      hasPreviousPeriod: !!nextMonth
    };
  }

  if (isWeekView && groupedWeeks.length > 0) {
    const active = activeWeek || groupedWeeks[0];
    const nextWeek = groupedWeeks[selectedWeekIndex + 1] || null;

    const currentMass = active.medianMass;
    const currentFat = active.medianFat;
    const currentFatMass = active.medianFatMass;
    const currentLeanMass = active.medianLeanMass;

    const prevMass = nextWeek ? nextWeek.medianMass : null;
    const prevFat = nextWeek ? nextWeek.medianFat : null;
    const prevFatMass = nextWeek ? nextWeek.medianFatMass : null;
    const prevLeanMass = nextWeek ? nextWeek.medianLeanMass : null;

    const massChange = (currentMass !== null && prevMass !== null) ? (currentMass - prevMass) : 0;
    const fatChange = (currentFat !== null && prevFat !== null) ? (currentFat - prevFat) : 0;
    const fatMassChange = (currentFatMass !== null && prevFatMass !== null) ? (currentFatMass - prevFatMass) : 0;
    const leanMassChange = (currentLeanMass !== null && prevLeanMass !== null) ? (currentLeanMass - prevLeanMass) : 0;

    return {
      currentMass,
      currentFat,
      currentFatMass,
      currentLeanMass,
      massChange,
      fatChange,
      fatMassChange,
      leanMassChange,
      comparisonLabel: '7d ago',
      periodBadge: '7d Median',
      hasPreviousPeriod: !!nextWeek
    };
  }

  // Default fallback (e.g. History or Measurements view)
  const s = stats;
  return {
    currentMass: s?.rollingMedianMass ?? null,
    currentFat: s?.rollingMedianFat ?? null,
    currentFatMass: s?.rollingMedianFatMass ?? null,
    currentLeanMass: s?.rollingMedianLeanMass ?? null,
    massChange: s?.rollingMedianMassChange ?? 0,
    fatChange: s?.rollingMedianFatChange ?? 0,
    fatMassChange: s?.rollingMedianFatMassChange ?? 0,
    leanMassChange: s?.rollingMedianLeanMassChange ?? 0,
    comparisonLabel: '7d ago',
    periodBadge: '7d Median',
    hasPreviousPeriod: s?.rollingMedianMass !== null
  };
}
