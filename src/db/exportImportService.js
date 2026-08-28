import { bulkWrite, STORE_LOGS, STORE_MEASUREMENTS } from './core';
import { getAllLogs } from './logsStore';
import { getAllMeasurements } from './measurementsStore';

// Export all data for backup / migration
export async function exportAllData(userId = 'guest', paliers = [], profile = null, displayPreferences = null, language = null) {
  const logs = await getAllLogs(userId);
  const measurements = await getAllMeasurements(userId);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    paliers: paliers || [],
    profile: profile || null,
    displayPreferences: displayPreferences || null,
    language: language || null,
    logs: logs.map(l => ({
      id: l.id,
      date: l.date,
      mass: Number(l.mass),
      body_fat: Number(l.body_fat),
      measured_at: l.measured_at || null,
      heart_rate: l.heart_rate ? Number(l.heart_rate) : null,
      impedances: l.impedances || null,
      scale_device_id: l.scale_device_id || null
    })),
    measurements: measurements.map(m => ({
      id: m.id,
      date: m.date,
      waist: m.waist !== null && m.waist !== '' && m.waist !== undefined ? Number(m.waist) : null,
      chest: m.chest !== null && m.chest !== '' && m.chest !== undefined ? Number(m.chest) : null,
      arms: m.arms !== null && m.arms !== '' && m.arms !== undefined ? Number(m.arms) : null,
      thighs: m.thighs !== null && m.thighs !== '' && m.thighs !== undefined ? Number(m.thighs) : null
    }))
  };
}

// Import all data from backup JSON payload
export async function importAllData(data, userId = 'guest') {
  if (!data || typeof data !== 'object') {
    throw new Error('Format de fichier invalide');
  }

  const logsToImport = Array.isArray(data.logs) ? data.logs : [];
  const measurementsToImport = Array.isArray(data.measurements) ? data.measurements : [];
  const paliersToImport = Array.isArray(data.paliers) ? data.paliers : [];
  const profileToImport = (data.profile && typeof data.profile === 'object') ? data.profile : null;
  const displayPreferencesToImport = (data.displayPreferences && typeof data.displayPreferences === 'object') ? data.displayPreferences : null;
  const languageToImport = (data.language === 'fr' || data.language === 'en') ? data.language : null;

  const validLogs = [];
  for (const log of logsToImport) {
    if (log && log.date && !isNaN(Number(log.mass)) && !isNaN(Number(log.body_fat))) {
      validLogs.push({
        id: log.id || crypto.randomUUID(),
        date: log.date,
        mass: Number(log.mass),
        body_fat: Number(log.body_fat),
        measured_at: log.measured_at || null,
        heart_rate: log.heart_rate ? Number(log.heart_rate) : null,
        impedances: log.impedances || null,
        scale_device_id: log.scale_device_id || null,
        user_id: userId,
        synced: false
      });
    }
  }

  const validMeasurements = [];
  for (const m of measurementsToImport) {
    if (m && m.date) {
      validMeasurements.push({
        id: m.id || crypto.randomUUID(),
        date: m.date,
        waist: m.waist !== null && m.waist !== '' && m.waist !== undefined ? Number(m.waist) : null,
        chest: m.chest !== null && m.chest !== '' && m.chest !== undefined ? Number(m.chest) : null,
        arms: m.arms !== null && m.arms !== '' && m.arms !== undefined ? Number(m.arms) : null,
        thighs: m.thighs !== null && m.thighs !== '' && m.thighs !== undefined ? Number(m.thighs) : null,
        user_id: userId,
        synced: false
      });
    }
  }

  if (validLogs.length > 0) {
    await bulkWrite(STORE_LOGS, { puts: validLogs });
  }
  if (validMeasurements.length > 0) {
    await bulkWrite(STORE_MEASUREMENTS, { puts: validMeasurements });
  }

  return {
    importedLogsCount: validLogs.length,
    importedMeasurementsCount: validMeasurements.length,
    paliers: paliersToImport,
    profile: profileToImport,
    displayPreferences: displayPreferencesToImport,
    language: languageToImport
  };
}

// Migrate local guest logs to authenticated user
export async function migrateGuestLogsInDB(newUserId) {
  if (!newUserId || newUserId === 'guest') return;

  const guestLogs = await getAllLogs('guest');
  if (guestLogs.length > 0) {
    for (const log of guestLogs) {
      log.user_id = newUserId;
      log.synced = false; // Trigger upload
    }
    await bulkWrite(STORE_LOGS, { puts: guestLogs });
    console.log(`Migrated ${guestLogs.length} logs from Guest to user ${newUserId}`);
  }

  // Migrate measurements
  const guestMeasurements = await getAllMeasurements('guest');
  if (guestMeasurements.length > 0) {
    for (const log of guestMeasurements) {
      log.user_id = newUserId;
      log.synced = false;
    }
    await bulkWrite(STORE_MEASUREMENTS, { puts: guestMeasurements });
    console.log(`Migrated ${guestMeasurements.length} measurements from Guest to user ${newUserId}`);
  }
}
