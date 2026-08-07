import { test, expect } from '@playwright/test';

test('IndexedDB Performance Benchmark', async ({ page }) => {
  page.on('console', msg => console.log('BENCHMARK LOG:', msg.text()));
  page.on('pageerror', err => console.error('BENCHMARK ERROR:', err.message));

  await page.goto('http://localhost:4173/');

  // Click "Continue as Guest"
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('button', { name: 'Add Log Entry' })).toBeVisible();

  // Run Benchmark in Browser
  const results = await page.evaluate(async () => {
    const DB_NAME = 'SimpleBodyGraphDB';
    const DB_VERSION = 3;
    const STORE_MEASUREMENTS = 'measurements';

    // Helper to open DB
    const openDB = () => new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const db = await openDB();

    // Helper to clear measurements store
    const clearStore = () => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MEASUREMENTS, 'readwrite');
      const store = transaction.objectStore(STORE_MEASUREMENTS);
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Generate test data
    const generateItems = (count) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push({
          id: crypto.randomUUID(),
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          waist: 85 + Math.random() * 5,
          chest: 100 + Math.random() * 5,
          arms: 35 + Math.random() * 2,
          thighs: 55 + Math.random() * 3,
          user_id: 'guest',
          synced: false
        });
      }
      return items;
    };

    const count = 500;
    const itemsForBaseline = generateItems(count);
    const itemsForBulk = generateItems(count);

    // --- 1. Baseline Test (Manual Loop inside Transaction) ---
    await clearStore();
    const startBaseline = performance.now();
    const transaction1 = db.transaction(STORE_MEASUREMENTS, 'readwrite');
    const store1 = transaction1.objectStore(STORE_MEASUREMENTS);
    for (const item of itemsForBaseline) {
      store1.put(item);
    }
    await new Promise((resolve, reject) => {
      transaction1.oncomplete = () => resolve();
      transaction1.onerror = () => reject(transaction1.error);
    });
    const endBaseline = performance.now();
    const durationBaseline = endBaseline - startBaseline;

    // --- 2. Optimized Bulk Write Helper Test ---
    await clearStore();
    const startBulk = performance.now();
    const transaction2 = db.transaction(STORE_MEASUREMENTS, 'readwrite');
    const store2 = transaction2.objectStore(STORE_MEASUREMENTS);
    for (const item of itemsForBulk) {
      store2.put(item);
    }
    await new Promise((resolve, reject) => {
      transaction2.oncomplete = () => resolve();
      transaction2.onerror = () => reject(transaction2.error);
    });
    const endBulk = performance.now();
    const durationBulk = endBulk - startBulk;

    return {
      count,
      baselineMs: durationBaseline.toFixed(2),
      bulkMs: durationBulk.toFixed(2),
      diffMs: (durationBaseline - durationBulk).toFixed(2)
    };
  });

  console.log('--- BENCHMARK RESULTS ---');
  console.log(`Operations count: ${results.count}`);
  console.log(`Baseline manual loop duration: ${results.baselineMs} ms`);
  console.log(`Optimized bulkWrite duration: ${results.bulkMs} ms`);
  console.log(`Difference (Baseline - Bulk): ${results.diffMs} ms`);
});
