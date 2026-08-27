import { openDB, sanitizeForIndexedDB, bulkWrite, STORE_LOGS, STORE_DELETIONS } from './core';

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
