// Helper to find the Monday (YYYY-MM-DD) of a given date
export function getMondayOfDate(dateStr) {
  const dateObj = new Date(dateStr);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const mondayObj = new Date(dateObj.setDate(diff));
  
  const yyyy = mondayObj.getFullYear();
  const mm = String(mondayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(mondayObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to find Sunday of a given Monday (YYYY-MM-DD)
export function getSundayOfMonday(mondayStr) {
  const mondayObj = new Date(mondayStr);
  const sundayObj = new Date(mondayObj.setDate(mondayObj.getDate() + 6));
  
  const yyyy = sundayObj.getFullYear();
  const mm = String(sundayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(sundayObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to calculate median of a numeric array
export function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].filter(v => v !== null && v !== undefined && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper to get logs falling into a specific date range [refDate - days + 1, refDate]
export function getRollingLogsForDate(logs, refDateStr, days = 7) {
  const refDate = new Date(refDateStr);
  const startDate = new Date(refDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = refDate.toISOString().split('T')[0];
  
  return logs.filter(log => log.date >= startStr && log.date <= endStr);
}

// Helper to calculate rolling median for a given reference date and field
export function getRollingMedianForDate(logs, refDateStr, field, days = 7) {
  const windowLogs = getRollingLogsForDate(logs, refDateStr, days);
  if (windowLogs.length === 0) return null;
  const values = windowLogs.map(l => Number(l[field]));
  return calculateMedian(values);
}

// Helper to calculate age in years from birthDate (YYYY-MM-DD)
export function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

// Helper to get previous window end date (refDate offset by offsetDays)
export function getPreviousWindowEndDate(refDateStr, offsetDays = 7) {
  const refDate = new Date(refDateStr);
  const prevDate = new Date(refDate);
  prevDate.setDate(prevDate.getDate() - offsetDays);
  return prevDate.toISOString().split('T')[0];
}
