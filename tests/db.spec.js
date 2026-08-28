import { test, expect } from '@playwright/test';
import { MOCK_LOGS, MOCK_MEASUREMENTS, seedIndexedDB } from './db-helper';

test.describe('IndexedDB Database Helpers', () => {
  test.beforeEach(async ({ page }) => {
    // Listen to browser console and errors for troubleshooting
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    // Navigate to application
    await page.goto('http://localhost:4173/');

    // Click "Continue as Guest" to transition past onboarding so that all stores and db are initialized
    const guestBtn = page.getByRole('button', { name: /Continue as Guest|Continuer en mode Invité/i });
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
    }
    // Wait for database module to initialize on window
    await page.waitForFunction(() => !!window.__db);

    // Seed IndexedDB with the global seed dataset to start with a unified, 3-month dataset
    await seedIndexedDB(page, MOCK_LOGS, MOCK_MEASUREMENTS);
  });

  test('openDB opens the database and configures correct stores', async ({ page }) => {
    const stores = await page.evaluate(async () => {
      const db = await window.__db.openDB();
      return Array.from(db.objectStoreNames);
    });

    expect(stores).toContain('logs');
    expect(stores).toContain('deletions');
    expect(stores).toContain('measurements');
    expect(stores).toContain('measurement_deletions');
  });

  test('saveLog and getAllLogs handles logs correctly by user_id and date sorting', async ({ page }) => {
    // 1. Retrieve seeded guest logs and check count & descending sorting
    const guestLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('guest');
    });

    // Check we have the 28 logs from MOCK_LOGS
    expect(guestLogs).toHaveLength(28);
    // Verify descending order by checking first and last dates
    expect(guestLogs[0].date).toBe('2026-07-15');
    expect(guestLogs[27].date).toBe('2025-11-12');

    // 2. Add a new log entry to test saveLog additions
    const newLog = { date: '2026-07-20', mass: 99.5, body_fat: 31.5, synced: false };
    const savedLog = await page.evaluate(async (l) => {
      return await window.__db.saveLog(l, 'guest');
    }, newLog);

    expect(savedLog.id).toBeDefined();
    expect(savedLog.user_id).toBe('guest');

    // Retrieve again and verify new log is first (latest date)
    const updatedGuestLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('guest');
    });
    expect(updatedGuestLogs).toHaveLength(29);
    expect(updatedGuestLogs[0].date).toBe('2026-07-20');

    // 3. Test saving a log for a different user to verify user_id isolation
    const userLog = { date: '2026-07-20', mass: 90, body_fat: 25, synced: false };
    await page.evaluate(async (l) => {
      return await window.__db.saveLog(l, 'user-123');
    }, userLog);

    const userLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('user-123');
    });
    expect(userLogs).toHaveLength(1);
    expect(userLogs[0].mass).toBe(90);

    // Verify guest logs still has 29 logs
    const finalGuestLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('guest');
    });
    expect(finalGuestLogs).toHaveLength(29);
  });

  test('deleteLog removes logs and tracks deletions offline', async ({ page }) => {
    // 1. Verify log exists in the seeded dataset
    let logs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    expect(logs).toHaveLength(28);

    // 2. Delete an existing synced log (e.g. 'j3')
    const deletedId = await page.evaluate(async () => {
      return await window.__db.deleteLog('j3', 'guest');
    });
    expect(deletedId).toBe('j3');

    // 3. Verify it is gone from the main store (count becomes 27)
    logs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    expect(logs).toHaveLength(27);
    expect(logs.find(l => l.id === 'j3')).toBeUndefined();

    // 4. Verify deletion is recorded in pending deletions store
    let pending = await page.evaluate(async () => {
      return await window.__db.getPendingDeletions('guest');
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual({ id: 'j3', user_id: 'guest' });

    // 5. Clear pending deletions
    await page.evaluate(async (ids) => {
      await window.__db.clearPendingDeletions(ids);
    }, ['j3']);

    // Verify pending is now empty
    pending = await page.evaluate(async () => {
      return await window.__db.getPendingDeletions('guest');
    });
    expect(pending).toHaveLength(0);
  });

  test('getUnsyncedLogs returns only unsynced logs', async ({ page }) => {
    const unsynced = await page.evaluate(async () => {
      return await window.__db.getUnsyncedLogs('guest');
    });

    expect(unsynced).toHaveLength(2);
    const unsyncedIds = unsynced.map(l => l.id);
    expect(unsyncedIds).toContain('j1');
    expect(unsyncedIds).toContain('j2');
  });

  test('saveMeasurement and getAllMeasurements handles tape measurements correctly', async ({ page }) => {
    // 1. Retrieve seeded guest measurements and check count & descending sorting
    const guestMs = await page.evaluate(async () => {
      return await window.__db.getAllMeasurements('guest');
    });

    expect(guestMs).toHaveLength(3);
    expect(guestMs[0].date).toBe('2026-06-17');
    expect(guestMs[2].date).toBe('2026-06-03');

    // 2. Add a new measurement entry to verify saving works
    const newM = { date: '2026-06-20', waist: 88, chest: 98, arms: 34, thighs: 58, synced: false };
    const savedM = await page.evaluate(async (m) => {
      return await window.__db.saveMeasurement(m, 'guest');
    }, newM);

    expect(savedM.id).toBeDefined();
    expect(savedM.user_id).toBe('guest');

    // 3. Verify retrieved list contains the new first element
    const updatedMs = await page.evaluate(async () => {
      return await window.__db.getAllMeasurements('guest');
    });
    expect(updatedMs).toHaveLength(4);
    expect(updatedMs[0].date).toBe('2026-06-20');
  });

  test('deleteMeasurement removes measurement and tracks deletions offline', async ({ page }) => {
    let measurements = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(measurements).toHaveLength(3);

    // Delete measurement 'm3'
    const deletedId = await page.evaluate(async () => {
      return await window.__db.deleteMeasurement('m3', 'guest');
    });
    expect(deletedId).toBe('m3');

    // Verify deleted locally (count becomes 2)
    measurements = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(measurements).toHaveLength(2);
    expect(measurements.find(item => item.id === 'm3')).toBeUndefined();

    // Verify deletion tracked
    let pending = await page.evaluate(async () => {
      return await window.__db.getPendingMeasurementDeletions('guest');
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual({ id: 'm3', user_id: 'guest' });

    // Clear pending measurement deletions
    await page.evaluate(async (ids) => {
      await window.__db.clearPendingMeasurementDeletions(ids);
    }, ['m3']);

    pending = await page.evaluate(async () => {
      return await window.__db.getPendingMeasurementDeletions('guest');
    });
    expect(pending).toHaveLength(0);
  });

  test('getUnsyncedMeasurements returns only unsynced measurements', async ({ page }) => {
    const unsynced = await page.evaluate(async () => {
      return await window.__db.getUnsyncedMeasurements('guest');
    });

    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].id).toBe('m1');
  });

  test('migrateGuestLogsInDB correctly updates guest data ownership and sets synced: false', async ({ page }) => {
    // 1. Verify we have guest logs and measurements initially
    const initialGuestLogs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    const initialGuestMs = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(initialGuestLogs).toHaveLength(28);
    expect(initialGuestMs).toHaveLength(3);

    // 2. Run guest migration to a new user
    await page.evaluate(async () => {
      await window.__db.migrateGuestLogsInDB('user-new-456');
    });

    // 3. Check guest logs and measurements are empty (no longer owned by 'guest')
    const guestLogs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    const guestMs = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(guestLogs).toHaveLength(0);
    expect(guestMs).toHaveLength(0);

    // 4. Check they are now owned by 'user-new-456' and synced is set to false
    const migratedLogs = await page.evaluate(async () => await window.__db.getAllLogs('user-new-456'));
    const migratedMs = await page.evaluate(async () => await window.__db.getAllMeasurements('user-new-456'));

    expect(migratedLogs).toHaveLength(28);
    expect(migratedLogs[0].user_id).toBe('user-new-456');
    expect(migratedLogs[0].synced).toBe(false);

    expect(migratedMs).toHaveLength(3);
    expect(migratedMs[0].user_id).toBe('user-new-456');
    expect(migratedMs[0].synced).toBe(false);
  });

  test('exportAllData and importAllData correctly export and restore dataset', async ({ page }) => {
    // 1. Export seeded dataset
    const exported = await page.evaluate(async () => {
      return await window.__db.exportAllData(
        'guest', 
        [{ id: 'p1', mass: 100, fat: 28, validated: false }],
        { gender: 'male', birthDate: '1992-05-14', height: 178 }
      );
    });

    expect(exported.version).toBe(2);
    expect(exported.paliers).toHaveLength(1);
    expect(exported.profile).toEqual({ gender: 'male', birthDate: '1992-05-14', height: 178 });
    expect(exported.logs).toHaveLength(28);
    expect(exported.measurements).toHaveLength(3);
    expect(exported.logs[0].date).toBe('2026-07-15');

    // 2. Import into a new user ID (simulating restore / new database)
    const importResult = await page.evaluate(async (data) => {
      return await window.__db.importAllData(data, 'user-restored');
    }, exported);

    expect(importResult.importedLogsCount).toBe(28);
    expect(importResult.importedMeasurementsCount).toBe(3);
    expect(importResult.paliers).toHaveLength(1);
    expect(importResult.profile).toEqual({ gender: 'male', birthDate: '1992-05-14', height: 178 });

    // 3. Verify the restored user has all logs and measurements marked with synced: false
    const restoredLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('user-restored');
    });
    const restoredMs = await page.evaluate(async () => {
      return await window.__db.getAllMeasurements('user-restored');
    });

    expect(restoredLogs).toHaveLength(28);
    expect(restoredLogs[0].user_id).toBe('user-restored');
    expect(restoredLogs[0].synced).toBe(false);

    expect(restoredMs).toHaveLength(3);
    expect(restoredMs[0].user_id).toBe('user-restored');
    expect(restoredMs[0].synced).toBe(false);
  });

  test('benchmark: bulkWrite performance compared to other approaches', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const logsToInsert = Array.from({ length: 300 }, (_, i) => ({
        id: `bench_${i}`,
        date: `2026-08-${String(i % 28 + 1).padStart(2, '0')}`,
        mass: 80 + (i % 10),
        body_fat: 15 + (i % 5),
        synced: false,
        user_id: 'bench-user'
      }));

      // Method A: Individual transactions for each put (sequential saveLog)
      const startA = performance.now();
      for (const log of logsToInsert) {
        await window.__db.saveLog({ ...log, id: log.id + '_A' }, 'bench-user-A');
      }
      const endA = performance.now();
      const durationA = endA - startA;

      // Method B: Old loop put on same transaction
      const startB = performance.now();
      const db = await window.__db.openDB();
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      for (const log of logsToInsert) {
        store.put({ ...log, id: log.id + '_B', user_id: 'bench-user-B' });
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Tx aborted'));
      });
      const endB = performance.now();
      const durationB = endB - startB;

      // Method C: New bulkWrite utility
      const startC = performance.now();
      const preparedLogs = logsToInsert.map(log => ({ ...log, id: log.id + '_C', user_id: 'bench-user-C' }));
      await window.__db.bulkWrite('logs', { puts: preparedLogs });
      const endC = performance.now();
      const durationC = endC - startC;

      return { durationA, durationB, durationC };
    });

    console.log(`\n=================== BENCHMARK RESULTS ===================`);
    console.log(`Inserting 300 logs:`);
    console.log(`Method A (Individual saveLog transactions): ${results.durationA.toFixed(2)} ms`);
    console.log(`Method B (Old manual transaction with loop): ${results.durationB.toFixed(2)} ms`);
    console.log(`Method C (New generic bulkWrite): ${results.durationC.toFixed(2)} ms`);
    console.log(`Improvement of bulkWrite over Method A: ${((results.durationA - results.durationC) / results.durationA * 100).toFixed(2)}% speedup`);
    console.log(`=========================================================\n`);

    expect(results.durationC).toBeLessThan(results.durationA); // bulkWrite should be significantly faster than individual transactions!
  });

  test('saveLog safely handles reactive proxies and nested BIA impedances without DataCloneError', async ({ page }) => {
    const saved = await page.evaluate(async () => {
      const complexLog = {
        date: '2026-07-28',
        mass: 87.5,
        body_fat: 20.5,
        synced: false,
        impedances: {
          feet: [490, 500, 510],
          hands: [590, 600, 610]
        }
      };

      // Wrap inside a JavaScript Proxy to simulate Vue 3 reactivity
      const proxyLog = new Proxy(complexLog, {
        get(target, prop) {
          if (prop === 'impedances') {
            return new Proxy(target.impedances, {
              get(t, p) {
                return t[p];
              }
            });
          }
          return target[prop];
        }
      });

      return await window.__db.saveLog(proxyLog, 'guest');
    });

    expect(saved.id).toBeDefined();
    expect(saved.mass).toBe(87.5);
    expect(saved.impedances).toEqual({
      feet: [490, 500, 510],
      hands: [590, 600, 610]
    });
  });
});
