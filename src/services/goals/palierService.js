import { getMondayOfDate, calculateMedian } from '../../utils/dateAndMath';

/**
 * Validates and auto-progresses paliers according to rolling weekly medians (min 4 logs/week).
 */
export function evaluatePalierAutoValidation(paliers = [], logsWithEstimates = []) {
  if (!paliers || paliers.length < 2) return { changed: false, updatedPaliers: paliers };

  const p1 = paliers[0];
  const p2 = paliers[1];
  const isWeightGain = Number(p2.mass) >= Number(p1.mass);
  const isFatGain = Number(p2.fat) >= Number(p1.fat);

  // Group raw logs into weeks
  const groups = {};
  for (const log of logsWithEstimates) {
    const mon = getMondayOfDate(log.date);
    if (!groups[mon]) {
      groups[mon] = [];
    }
    groups[mon].push(log);
  }

  const validWeeks = [];
  for (const [mon, weekLogs] of Object.entries(groups)) {
    if (weekLogs.length >= 4) {
      const masses = weekLogs.map(l => Number(l.mass));
      const fats = weekLogs.map(l => Number(l.body_fat));
      const medianMass = calculateMedian(masses);
      const medianFat = calculateMedian(fats);

      validWeeks.push({
        monday: mon,
        medianMass,
        medianFat
      });
    }
  }

  if (validWeeks.length === 0) return { changed: false, updatedPaliers: paliers };

  let changed = false;
  const updatedPaliers = paliers.map((palier) => {
    if (palier.validated) return palier;

    const targetMass = Number(palier.mass);
    const targetFat = Number(palier.fat);

    const passed = validWeeks.some(week => {
      const wMass = Number(week.medianMass);
      const wFat = Number(week.medianFat);

      const massPassed = isWeightGain ? (wMass >= targetMass) : (wMass <= targetMass);
      const fatPassed = isFatGain ? (wFat >= targetFat) : (wFat <= targetFat);

      return massPassed && fatPassed;
    });

    if (passed) {
      changed = true;
      return { ...palier, validated: true };
    }
    return palier;
  });

  return { changed, updatedPaliers };
}
