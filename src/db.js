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

// Generic Bulk Write Helper
export async function bulkWrite(storeName, { puts = [], deletes = [] }) {
  if (puts.length === 0 && deletes.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    for (const item of puts) {
      store.put(item);
    }
    for (const id of deletes) {
      store.delete(id);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('Transaction aborted'));
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

export async function saveLog(log, userId = 'guest') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOGS, 'readwrite');
    const store = transaction.objectStore(STORE_LOGS);
    
    // Ensure ID is present
    if (!log.id) {
      log.id = crypto.randomUUID();
    }
    log.user_id = userId;
    
    const request = store.put(log);

    request.onsuccess = () => resolve(log);
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

    if (!log.id) {
      log.id = crypto.randomUUID();
    }
    log.user_id = userId;

    const request = store.put(log);

    request.onsuccess = () => resolve(log);
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

// Migrate local guest logs to authenticated user
export async function migrateGuestLogsInDB(newUserId) {
  if (!newUserId || newUserId === 'guest') return;
  
  const guestLogs = await getAllLogs('guest');
  if (guestLogs.length > 0) {
    const updatedLogs = guestLogs.map(log => ({
      ...log,
      user_id: newUserId,
      synced: false // Trigger upload
    }));
    await bulkWrite(STORE_LOGS, { puts: updatedLogs });
    console.log(`Migrated ${guestLogs.length} logs from Guest to user ${newUserId}`);
  }

  // Migrate measurements
  const guestMeasurements = await getAllMeasurements('guest');
  if (guestMeasurements.length > 0) {
    const updatedMeasurements = guestMeasurements.map(log => ({
      ...log,
      user_id: newUserId,
      synced: false
    }));
    await bulkWrite(STORE_MEASUREMENTS, { puts: updatedMeasurements });
    console.log(`Migrated ${guestMeasurements.length} measurements from Guest to user ${newUserId}`);
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
    // --- 1. Sync Logs ---

    // Sync deletions for this user to Supabase
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

    // 2. Sync unsynced additions/updates for this user to Supabase
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
        const logsToUpdate = unsynced.map(log => ({
          ...log,
          synced: true
        }));
        await bulkWrite(STORE_LOGS, { puts: logsToUpdate });
        console.log('Pushed unsynced logs successfully:', unsynced);
      } else {
        console.error('Error pushing unsynced logs to remote:', pushError);
        throw pushError;
      }
    }

    // 3. Fetch latest data from Supabase for this user to sync down
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

    // --- 2. Sync Measurements ---

    // Sync measurement deletions
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

    // Sync unsynced measurements
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
        const measurementsToUpdate = unsyncedM.map(log => ({
          ...log,
          synced: true
        }));
        await bulkWrite(STORE_MEASUREMENTS, { puts: measurementsToUpdate });
        console.log('Pushed unsynced measurements successfully:', unsyncedM);
      } else {
        console.error('Error pushing unsynced measurements:', mPushError);
        throw mPushError;
      }
    }

    // Pull remote measurements
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

    return { success: true };
  } catch (error) {
    console.error('Sync process failed:', error);
    return { success: false, error };
  }
}
