import {
  openDB,
  sanitizeForIndexedDB,
  bulkWrite
} from './db/core';

import {
  getAllLogs,
  saveLog,
  deleteLog,
  getUnsyncedLogs,
  getPendingDeletions,
  clearPendingDeletions
} from './db/logsStore';

import {
  getAllMeasurements,
  saveMeasurement,
  deleteMeasurement,
  getUnsyncedMeasurements,
  getPendingMeasurementDeletions,
  clearPendingMeasurementDeletions
} from './db/measurementsStore';

import {
  syncLogs
} from './db/syncService';

import {
  exportAllData,
  importAllData,
  migrateGuestLogsInDB
} from './db/exportImportService';

export {
  openDB,
  sanitizeForIndexedDB,
  bulkWrite,
  getAllLogs,
  saveLog,
  deleteLog,
  getUnsyncedLogs,
  getPendingDeletions,
  clearPendingDeletions,
  getAllMeasurements,
  saveMeasurement,
  deleteMeasurement,
  getUnsyncedMeasurements,
  getPendingMeasurementDeletions,
  clearPendingMeasurementDeletions,
  syncLogs,
  exportAllData,
  importAllData,
  migrateGuestLogsInDB
};

// Expose helpers to window for easy, native unit testing in browser context
if (typeof window !== 'undefined') {
  window.__db = {
    openDB,
    getAllLogs,
    saveLog,
    deleteLog,
    getUnsyncedLogs,
    getPendingDeletions,
    clearPendingDeletions,
    getAllMeasurements,
    saveMeasurement,
    deleteMeasurement,
    getUnsyncedMeasurements,
    getPendingMeasurementDeletions,
    clearPendingMeasurementDeletions,
    migrateGuestLogsInDB,
    syncLogs,
    bulkWrite,
    exportAllData,
    importAllData,
    sanitizeForIndexedDB
  };
}
