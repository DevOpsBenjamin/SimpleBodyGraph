const DB_NAME = 'SimpleBodyGraphDB';
const DB_VERSION = 3; // Bumping version to trigger user_id index upgrades & measurements
const STORE_LOGS = 'logs';
const STORE_DELETIONS = 'deletions';
const STORE_MEASUREMENTS = 'measurements';
const STORE_MEASUREMENTS_DELETIONS = 'measurement_deletions';

export {
  DB_NAME,
  DB_VERSION,
  STORE_LOGS,
  STORE_DELETIONS,
  STORE_MEASUREMENTS,
  STORE_MEASUREMENTS_DELETIONS
};

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
