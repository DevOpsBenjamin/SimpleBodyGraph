import { supabase } from './supabase';

const DB_NAME = 'SimpleBodyGraphDB';
const DB_VERSION = 2; // Bumping version to trigger user_id index upgrades
const STORE_LOGS = 'logs';
const STORE_DELETIONS = 'deletions';

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

    // 1. Sync deletions for this user to Supabase
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
        if (lLog.synced && !remoteIds.has(lLog.id)) {
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

    return { success: true };
  } catch (error) {
    console.error('Sync process failed:', error);
    return { success: false, error };
  }
}
