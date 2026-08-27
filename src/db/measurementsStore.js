import { openDB, sanitizeForIndexedDB, bulkWrite, STORE_MEASUREMENTS, STORE_MEASUREMENTS_DELETIONS } from './core';

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
