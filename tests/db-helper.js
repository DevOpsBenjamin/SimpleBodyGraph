export const MOCK_LOGS = [
  // --- July 2026 (Reduced weight & fat) ---
  { id: 'j1', date: '2026-07-15', mass: 100.20, body_fat: 32.1, synced: true, user_id: 'guest' },
  { id: 'j2', date: '2026-07-12', mass: 100.80, body_fat: 32.2, synced: true, user_id: 'guest' },
  { id: 'j3', date: '2026-07-08', mass: 101.40, body_fat: 32.4, synced: true, user_id: 'guest' },
  { id: 'j4', date: '2026-07-05', mass: 101.90, body_fat: 32.5, synced: true, user_id: 'guest' },
  { id: 'j5', date: '2026-07-01', mass: 102.30, body_fat: 32.7, synced: true, user_id: 'guest' },

  // --- June 2026 (Baseline) ---
  { id: '1', date: '2026-06-17', mass: 105.35, body_fat: 34.2, synced: true, user_id: 'guest' },
  { id: '2', date: '2026-06-16', mass: 105.78, body_fat: 34.3, synced: true, user_id: 'guest' },
  { id: '3', date: '2026-06-15', mass: 106.20, body_fat: 34.4, synced: true, user_id: 'guest' },
  { id: '4', date: '2026-06-14', mass: 107.40, body_fat: 34.6, synced: true, user_id: 'guest' },
  { id: '5', date: '2026-06-13', mass: 106.60, body_fat: 34.3, synced: true, user_id: 'guest' },
  { id: '6', date: '2026-06-12', mass: 105.80, body_fat: 34.1, synced: true, user_id: 'guest' },
  { id: '7', date: '2026-06-11', mass: 106.08, body_fat: 34.2, synced: true, user_id: 'guest' },
  { id: '8', date: '2026-06-10', mass: 106.35, body_fat: 34.3, synced: true, user_id: 'guest' },
  { id: '9', date: '2026-06-09', mass: 106.35, body_fat: 34.6, synced: true, user_id: 'guest' },
  { id: '10', date: '2026-06-08', mass: 106.35, body_fat: 34.8, synced: true, user_id: 'guest' },
  { id: '11', date: '2026-06-07', mass: 106.80, body_fat: 34.9, synced: true, user_id: 'guest' },
  { id: '12', date: '2026-06-06', mass: 107.25, body_fat: 35.0, synced: true, user_id: 'guest' },
  { id: '13', date: '2026-06-05', mass: 107.65, body_fat: 35.1, synced: true, user_id: 'guest' },

  // --- May 2026 (Higher weight & fat) ---
  { id: 'y1', date: '2026-05-25', mass: 110.80, body_fat: 36.2, synced: true, user_id: 'guest' },
  { id: 'y2', date: '2026-05-20', mass: 111.20, body_fat: 36.3, synced: true, user_id: 'guest' },
  { id: 'y3', date: '2026-05-15', mass: 111.50, body_fat: 36.4, synced: true, user_id: 'guest' },
  { id: 'y4', date: '2026-05-10', mass: 112.10, body_fat: 36.5, synced: true, user_id: 'guest' },
  { id: 'y5', date: '2026-05-05', mass: 112.40, body_fat: 36.6, synced: true, user_id: 'guest' }
];

export const MOCK_MEASUREMENTS = [
  { id: 'm1', date: '2026-06-17', waist: 95, chest: 104, arms: 38, thighs: 62, synced: true, user_id: 'guest' },
  { id: 'm2', date: '2026-06-10', waist: 96, chest: 105, arms: 38.5, thighs: 63, synced: true, user_id: 'guest' },
  { id: 'm3', date: '2026-06-03', waist: 97, chest: 106, arms: 39, thighs: 64, synced: true, user_id: 'guest' }
];

/**
 * Seed IndexedDB with specific logs and measurements.
 */
export async function seedIndexedDB(page, logs = [], measurements = []) {
  await page.evaluate(({ logs, measurements }) => {
    return new Promise((resolve, reject) => {
      const DB_NAME = 'SimpleBodyGraphDB';
      const DB_VERSION = 3;
      const STORE_LOGS = 'logs';
      const STORE_MEASUREMENTS = 'measurements';

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([STORE_LOGS, STORE_MEASUREMENTS], 'readwrite');

        const logsStore = transaction.objectStore(STORE_LOGS);
        logsStore.clear();
        logs.forEach(log => logsStore.put(log));

        const measurementsStore = transaction.objectStore(STORE_MEASUREMENTS);
        measurementsStore.clear();
        measurements.forEach(m => measurementsStore.put(m));

        transaction.oncomplete = () => {
          resolve('Seeded successfully');
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
      };
    });
  }, { logs, measurements });
}

/**
 * Clear all IndexedDB stores to ensure test isolation.
 */
export async function clearIndexedDB(page) {
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const DB_NAME = 'SimpleBodyGraphDB';
      const DB_VERSION = 3;

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const stores = Array.from(db.objectStoreNames);
        if (stores.length === 0) {
          resolve();
          return;
        }

        const transaction = db.transaction(stores, 'readwrite');
        stores.forEach(storeName => {
          transaction.objectStore(storeName).clear();
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
}
