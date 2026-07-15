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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_DELETIONS);
    ids.forEach(id => store.delete(id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MEASUREMENTS_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_MEASUREMENTS_DELETIONS);
    ids.forEach(id => store.delete(id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Migrate local guest logs to authenticated user
export async function migrateGuestLogsInDB(newUserId) {
  if (!newUserId || newUserId === 'guest') return;
  
  const db = await openDB();
  const guestLogs = await getAllLogs('guest');
  if (guestLogs.length === 0) return;

  const transaction = db.transaction(STORE_LOGS, 'readwrite');
  const store = transaction.objectStore(STORE_LOGS);

  for (const log of guestLogs) {
    log.user_id = newUserId;
    log.synced = false; // Trigger upload
    store.put(log);
  }

  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  console.log(`Migrated ${guestLogs.length} logs from Guest to user ${newUserId}`);

  // Migrate measurements
  const guestMeasurements = await getAllMeasurements('guest');
  if (guestMeasurements.length > 0) {
    const mTransaction = db.transaction(STORE_MEASUREMENTS, 'readwrite');
    const mStore = mTransaction.objectStore(STORE_MEASUREMENTS);

    for (const log of guestMeasurements) {
      log.user_id = newUserId;
      log.synced = false;
      mStore.put(log);
    }

    await new Promise((resolve, reject) => {
      mTransaction.oncomplete = () => resolve();
      mTransaction.onerror = () => reject(mTransaction.error);
    });
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
    const db = await openDB();

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
        const transaction = db.transaction(STORE_LOGS, 'readwrite');
        const store = transaction.objectStore(STORE_LOGS);
        for (const log of unsynced) {
          log.synced = true;
          store.put(log);
        }
        await new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(new Error('Transaction aborted'));
        });
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
      const transaction = db.transaction(STORE_LOGS, 'readwrite');
      const store = transaction.objectStore(STORE_LOGS);
      
      const currentLocalLogs = await new Promise((resolve) => {
        const index = store.index('user_id');
        index.getAll(userId).onsuccess = (e) => resolve(e.target.result || []);
      });

      const unsyncedMap = new Map(unsynced.map(l => [l.id, l]));

      // Put all remote logs in local store (if not in local unsynced list)
      for (const rLog of remoteLogs) {
        if (!unsyncedMap.has(rLog.id)) {
          store.put({
            ...rLog,
            synced: true
          });
        }
      }

      // Check if any local synced log was deleted on remote, and remove it locally
      const remoteIds = new Set(remoteLogs.map(l => l.id));
      for (const lLog of currentLocalLogs) {
        if (lLog.synced && !remoteIds.has(lLog.id) && !unsyncedMap.has(lLog.id)) {
          store.delete(lLog.id);
        }
      }

      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
      });
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
        const transaction = db.transaction(STORE_MEASUREMENTS, 'readwrite');
        const store = transaction.objectStore(STORE_MEASUREMENTS);
        for (const log of unsyncedM) {
          log.synced = true;
          store.put(log);
        }
        await new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(new Error('Transaction aborted'));
        });
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
      const transaction = db.transaction(STORE_MEASUREMENTS, 'readwrite');
      const store = transaction.objectStore(STORE_MEASUREMENTS);

      const currentLocalM = await new Promise((resolve) => {
        const index = store.index('user_id');
        index.getAll(userId).onsuccess = (e) => resolve(e.target.result || []);
      });

      const unsyncedMMap = new Map(unsyncedM.map(l => [l.id, l]));

      for (const rLog of remoteM) {
        if (!unsyncedMMap.has(rLog.id)) {
          store.put({
            ...rLog,
            synced: true
          });
        }
      }

      const remoteMIds = new Set(remoteM.map(l => l.id));
      for (const lLog of currentLocalM) {
        if (lLog.synced && !remoteMIds.has(lLog.id) && !unsyncedMMap.has(lLog.id)) {
          store.delete(lLog.id);
        }
      }

      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
      });
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
