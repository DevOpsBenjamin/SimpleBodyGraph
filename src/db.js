import { supabase } from './supabase';

const DB_NAME = 'SimpleBodyGraphDB';
const DB_VERSION = 3; // Bumping version to trigger user_id index upgrades & measurements
const STORE_LOGS = 'logs';
const STORE_DELETIONS = 'deletions';
const STORE_MEASUREMENTS = 'measurements';
const STORE_MEASUREMENTS_DELETIONS = 'measurement_deletions';

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      let store;
      
      // Store for active logs
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        store = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
      } else {
        store = request.transaction.objectStore(STORE_LOGS);
      }
      
      if (!store.indexNames.contains('date')) {
        store.createIndex('date', 'date', { unique: false });
      }
      if (!store.indexNames.contains('synced')) {
        store.createIndex('synced', 'synced', { unique: false });
      }
      if (!store.indexNames.contains('user_id')) {
        store.createIndex('user_id', 'user_id', { unique: false });
      }
      
      // Store for deleted log IDs (to sync deletions when online)
      if (!db.objectStoreNames.contains(STORE_DELETIONS)) {
        db.createObjectStore(STORE_DELETIONS, { keyPath: 'id' });
      }

      // Store for active measurements
      let measurementsStore;
      if (!db.objectStoreNames.contains(STORE_MEASUREMENTS)) {
        measurementsStore = db.createObjectStore(STORE_MEASUREMENTS, { keyPath: 'id' });
      } else {
        measurementsStore = request.transaction.objectStore(STORE_MEASUREMENTS);
      }

      if (!measurementsStore.indexNames.contains('date')) {
        measurementsStore.createIndex('date', 'date', { unique: false });
      }
      if (!measurementsStore.indexNames.contains('synced')) {
        measurementsStore.createIndex('synced', 'synced', { unique: false });
      }
      if (!measurementsStore.indexNames.contains('user_id')) {
        measurementsStore.createIndex('user_id', 'user_id', { unique: false });
      }

      // Store for deleted measurement IDs
      if (!db.objectStoreNames.contains(STORE_MEASUREMENTS_DELETIONS)) {
        db.createObjectStore(STORE_MEASUREMENTS_DELETIONS, { keyPath: 'id' });
      }
    };
  });
}

// Database Helper Methods (Isolated by userId)
export async function getAllLogs(userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOGS, 'readonly');
    const store = transaction.objectStore(STORE_LOGS);
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      // Sort logs descending by date
      const logs = request.result || [];
      logs.sort((a, b) => b.date.localeCompare(a.date));
      resolve(logs);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Ensures an object is safe for IndexedDB structured cloning by stripping
 * Vue reactivity Proxies, non-serializable fields, getters, or circular references.
 * @param {any} record
 * @returns {any}
 */
export function sanitizeForIndexedDB(record) {
  if (!record || typeof record !== 'object') return record;
  try {
    return JSON.parse(JSON.stringify(record));
  } catch (e) {
    const clean = Array.isArray(record) ? [] : {};
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val !== 'function' && typeof val !== 'symbol') {
        clean[key] = val && typeof val === 'object' ? sanitizeForIndexedDB(val) : val;
      }
    }
    return clean;
  }
}

export async function saveLog(log, userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOGS, 'readwrite');
    const store = transaction.objectStore(STORE_LOGS);
    
    const cleanLog = sanitizeForIndexedDB(log);
    // Ensure ID is present
    if (!cleanLog.id) {
      cleanLog.id = crypto.randomUUID();
    }
    cleanLog.user_id = userId;
    
    const request = store.put(cleanLog);

    request.onsuccess = () => resolve(cleanLog);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLog(id, userId = 'guest') {
  const db = await openDB();
  
  // Track deletion offline
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_DELETIONS);
    const request = store.put({ id, user_id: userId });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Delete locally
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOGS, 'readwrite');
    const store = transaction.objectStore(STORE_LOGS);
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getUnsyncedLogs(userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOGS, 'readonly');
    const store = transaction.objectStore(STORE_LOGS);
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const all = request.result || [];
      resolve(all.filter(log => !log.synced));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingDeletions(userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DELETIONS, 'readonly');
    const store = transaction.objectStore(STORE_DELETIONS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result || [];
      resolve(all.filter(d => d.user_id === userId));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingDeletions(ids) {
  return bulkWrite(STORE_DELETIONS, { deletes: ids });
}

// ---------------- MEASUREMENTS ----------------
export async function getAllMeasurements(userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS, 'readonly');
    const store = transaction.objectStore(STORE_MEASUREMENTS);
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const logs = request.result || [];
      logs.sort((a, b) => b.date.localeCompare(a.date));
      resolve(logs);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMeasurement(log, userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS, 'readwrite');
    const store = transaction.objectStore(STORE_MEASUREMENTS);

    const cleanLog = sanitizeForIndexedDB(log);
    if (!cleanLog.id) {
      cleanLog.id = crypto.randomUUID();
    }
    cleanLog.user_id = userId;

    const request = store.put(cleanLog);

    request.onsuccess = () => resolve(cleanLog);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMeasurement(id, userId = 'guest') {
  const db = await openDB();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_MEASUREMENTS_DELETIONS);
    const request = store.put({ id, user_id: userId });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS, 'readwrite');
    const store = transaction.objectStore(STORE_MEASUREMENTS);
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getUnsyncedMeasurements(userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS, 'readonly');
    const store = transaction.objectStore(STORE_MEASUREMENTS);
    const index = store.index('user_id');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const all = request.result || [];
      resolve(all.filter(log => !log.synced));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingMeasurementDeletions(userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS_DELETIONS, 'readonly');
    const store = transaction.objectStore(STORE_MEASUREMENTS_DELETIONS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result || [];
      resolve(all.filter(d => d.user_id === userId));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingMeasurementDeletions(ids) {
  return bulkWrite(STORE_MEASUREMENTS_DELETIONS, { deletes: ids });
}

export async function bulkWrite(storeName, { puts = [], deletes = [] }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    for (const item of puts) {
      store.put(sanitizeForIndexedDB(item));
    }
    for (const id of deletes) {
      store.delete(id);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('Transaction aborted'));
  });
}

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
      heart_rate: l.heart_rate ? Number(l.heart_rate) : null,
      impedances: l.impedances || null
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
        heart_rate: log.heart_rate ? Number(log.heart_rate) : null,
        impedances: log.impedances || null,
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

// Helper Sync Sub-functions
async function syncLogDeletions(userId) {
  const deletions = await getPendingDeletions(userId);
  if (deletions.length > 0) {
    const deletionIds = deletions.map(d => d.id);
    const { error: delError } = await supabase
      .from('logs')
      .delete()
      .in('id', deletionIds);

    if (!delError) {
      await clearPendingDeletions(deletionIds);
      console.log('Synced deletions successfully:', deletionIds);
    } else {
      console.error('Error syncing deletions to remote:', delError);
      throw delError;
    }
  }
}

async function syncUnsyncedLogs(userId, db) {
  const unsynced = await getUnsyncedLogs(userId);
  if (unsynced.length > 0) {
    const recordsToPush = unsynced.map(log => ({
      id: log.id,
      date: log.date,
      mass: Number(log.mass),
      body_fat: Number(log.body_fat),
      user_id: userId
    }));

    const { error: pushError } = await supabase
      .from('logs')
      .upsert(recordsToPush);

    if (!pushError) {
      // Mark locally as synced
      for (const log of unsynced) {
        log.synced = true;
      }
      await bulkWrite(STORE_LOGS, { puts: unsynced });
      console.log('Pushed unsynced logs successfully:', unsynced);
    } else {
      console.error('Error pushing unsynced logs to remote:', pushError);
      throw pushError;
    }
  }
  return unsynced;
}

async function syncRemoteLogs(userId, db, unsynced) {
  const { data: remoteLogs, error: pullError } = await supabase
    .from('logs')
    .select('*')
    .order('date', { ascending: false });

  if (!pullError && remoteLogs) {
    const currentLocalLogs = await getAllLogs(userId);
    const unsyncedMap = new Map(unsynced.map(l => [l.id, l]));

    const puts = [];
    const deletes = [];

    // Put all remote logs in local store (if not in local unsynced list)
    for (const rLog of remoteLogs) {
      if (!unsyncedMap.has(rLog.id)) {
        puts.push({
          ...rLog,
          synced: true
        });
      }
    }

    // Check if any local synced log was deleted on remote, and remove it locally
    const remoteIds = new Set(remoteLogs.map(l => l.id));
    for (const lLog of currentLocalLogs) {
      if (lLog.synced && !remoteIds.has(lLog.id) && !unsyncedMap.has(lLog.id)) {
        deletes.push(lLog.id);
      }
    }

    await bulkWrite(STORE_LOGS, { puts, deletes });
    console.log('Pulled remote logs successfully.');
  } else if (pullError) {
    console.error('Error pulling remote logs:', pullError);
    throw pullError;
  }
}

async function syncMeasurementDeletions(userId) {
  const mDeletions = await getPendingMeasurementDeletions(userId);
  if (mDeletions.length > 0) {
    const mDeletionIds = mDeletions.map(d => d.id);
    const { error: mDelError } = await supabase
      .from('measurements')
      .delete()
      .in('id', mDeletionIds);

    if (!mDelError) {
      await clearPendingMeasurementDeletions(mDeletionIds);
      console.log('Synced measurement deletions successfully:', mDeletionIds);
    } else {
      console.error('Error syncing measurement deletions:', mDelError);
      throw mDelError;
    }
  }
}

async function syncUnsyncedMeasurements(userId, db) {
  const unsyncedM = await getUnsyncedMeasurements(userId);
  if (unsyncedM.length > 0) {
    const recordsToPush = unsyncedM.map(log => ({
      id: log.id,
      date: log.date,
      waist: log.waist !== null && log.waist !== '' ? Number(log.waist) : null,
      chest: log.chest !== null && log.chest !== '' ? Number(log.chest) : null,
      arms: log.arms !== null && log.arms !== '' ? Number(log.arms) : null,
      thighs: log.thighs !== null && log.thighs !== '' ? Number(log.thighs) : null,
      user_id: userId
    }));

    const { error: mPushError } = await supabase
      .from('measurements')
      .upsert(recordsToPush);

    if (!mPushError) {
      for (const log of unsyncedM) {
        log.synced = true;
      }
      await bulkWrite(STORE_MEASUREMENTS, { puts: unsyncedM });
      console.log('Pushed unsynced measurements successfully:', unsyncedM);
    } else {
      console.error('Error pushing unsynced measurements:', mPushError);
      throw mPushError;
    }
  }
  return unsyncedM;
}

async function syncRemoteMeasurements(userId, db, unsyncedM) {
  const { data: remoteM, error: mPullError } = await supabase
    .from('measurements')
    .select('*')
    .order('date', { ascending: false });

  if (!mPullError && remoteM) {
    const currentLocalM = await getAllMeasurements(userId);
    const unsyncedMMap = new Map(unsyncedM.map(l => [l.id, l]));

    const puts = [];
    const deletes = [];

    for (const rLog of remoteM) {
      if (!unsyncedMMap.has(rLog.id)) {
        puts.push({
          ...rLog,
          synced: true
        });
      }
    }

    const remoteMIds = new Set(remoteM.map(l => l.id));
    for (const lLog of currentLocalM) {
      if (lLog.synced && !remoteMIds.has(lLog.id) && !unsyncedMMap.has(lLog.id)) {
        deletes.push(lLog.id);
      }
    }

    await bulkWrite(STORE_MEASUREMENTS, { puts, deletes });
    console.log('Pulled remote measurements successfully.');
  } else if (mPullError) {
    console.error('Error pulling remote measurements:', mPullError);
    throw mPullError;
  }
}

// Synchronization Manager
export async function syncLogs(userId = 'guest') {
  if (userId === 'guest') {
    return { success: false, reason: 'guest_user_no_sync' };
  }
  if (!navigator.onLine || !supabase) {
    return { success: false, reason: 'offline_or_no_supabase' };
  }

  try {
    const db = await openDB();

    // --- 1. Sync Logs ---
    await syncLogDeletions(userId);
    const unsynced = await syncUnsyncedLogs(userId, db);
    await syncRemoteLogs(userId, db, unsynced);

    // --- 2. Sync Measurements ---
    await syncMeasurementDeletions(userId);
    const unsyncedM = await syncUnsyncedMeasurements(userId, db);
    await syncRemoteMeasurements(userId, db, unsyncedM);

    return { success: true };
  } catch (error) {
    console.error('Sync process failed:', error);
    return { success: false, error };
  }
}

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
