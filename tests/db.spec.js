import { test, expect } from '@playwright/test';
import { clearIndexedDB, MOCK_LOGS, MOCK_MEASUREMENTS, seedIndexedDB } from './db-helper';

test.describe('IndexedDB Database Helpers', () => {
  test.beforeEach(async ({ page }) => {
    // Listen to browser console and errors for troubleshooting
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    // Navigate to application
    await page.goto('http://localhost:4173/');

    // Click "Continue as Guest" to transition past onboarding so that all stores and db are initialized
    await page.getByRole('button', { name: 'Continue as Guest' }).click();
    await expect(page.getByRole('button', { name: 'Add Log Entry' })).toBeVisible();

    // Clear db to start clean for each test
    await clearIndexedDB(page);
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
    // Save log entries for guest
    const log1 = { date: '2026-06-15', mass: 80.5, body_fat: 20.1, synced: false };
    const log2 = { id: 'custom-id-2', date: '2026-06-16', mass: 79.9, body_fat: 19.8, synced: true };

    const savedLog1 = await page.evaluate(async (l) => {
      return await window.__db.saveLog(l, 'guest');
    }, log1);

    const savedLog2 = await page.evaluate(async (l) => {
      return await window.__db.saveLog(l, 'guest');
    }, log2);

    // Assert auto id generation for log1
    expect(savedLog1.id).toBeDefined();
    expect(savedLog1.user_id).toBe('guest');

    // Assert custom id retention
    expect(savedLog2.id).toBe('custom-id-2');
    expect(savedLog2.user_id).toBe('guest');

    // Save a log for a different user
    const userLog = { date: '2026-06-14', mass: 90, body_fat: 25, synced: false };
    await page.evaluate(async (l) => {
      return await window.__db.saveLog(l, 'user-123');
    }, userLog);

    // Retrieve guest logs and check count & descending sorting
    const guestLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('guest');
    });

    expect(guestLogs).toHaveLength(2);
    expect(guestLogs[0].date).toBe('2026-06-16'); // 16th should be first
    expect(guestLogs[1].date).toBe('2026-06-15'); // 15th should be second

    // Retrieve user-123 logs
    const userLogs = await page.evaluate(async () => {
      return await window.__db.getAllLogs('user-123');
    });
    expect(userLogs).toHaveLength(1);
    expect(userLogs[0].mass).toBe(90);
  });

  test('deleteLog removes logs and tracks deletions offline', async ({ page }) => {
    // Seed database with a guest log
    const testLog = { id: 'delete-me-123', date: '2026-06-17', mass: 105, body_fat: 34, synced: true };
    await page.evaluate(async (l) => {
      await window.__db.saveLog(l, 'guest');
    }, testLog);

    // Verify it exists
    let logs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    expect(logs).toHaveLength(1);

    // Delete log
    const deletedId = await page.evaluate(async () => {
      return await window.__db.deleteLog('delete-me-123', 'guest');
    });
    expect(deletedId).toBe('delete-me-123');

    // Verify it is gone from the main store
    logs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    expect(logs).toHaveLength(0);

    // Verify deletion is recorded in pending deletions store
    let pending = await page.evaluate(async () => {
      return await window.__db.getPendingDeletions('guest');
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual({ id: 'delete-me-123', user_id: 'guest' });

    // Clear pending deletions
    await page.evaluate(async (ids) => {
      await window.__db.clearPendingDeletions(ids);
    }, ['delete-me-123']);

    // Verify pending is now empty
    pending = await page.evaluate(async () => {
      return await window.__db.getPendingDeletions('guest');
    });
    expect(pending).toHaveLength(0);
  });

  test('getUnsyncedLogs returns only unsynced logs', async ({ page }) => {
    const logs = [
      { id: '1', date: '2026-06-15', mass: 80, body_fat: 20, synced: true },
      { id: '2', date: '2026-06-16', mass: 81, body_fat: 21, synced: false },
      { id: '3', date: '2026-06-17', mass: 82, body_fat: 22, synced: false }
    ];

    for (const log of logs) {
      await page.evaluate(async (l) => {
        await window.__db.saveLog(l, 'guest');
      }, log);
    }

    const unsynced = await page.evaluate(async () => {
      return await window.__db.getUnsyncedLogs('guest');
    });

    expect(unsynced).toHaveLength(2);
    const unsyncedIds = unsynced.map(l => l.id);
    expect(unsyncedIds).toContain('2');
    expect(unsyncedIds).toContain('3');
  });

  test('saveMeasurement and getAllMeasurements handles tape measurements correctly', async ({ page }) => {
    const m1 = { date: '2026-06-15', waist: 90, chest: 100, arms: 35, thighs: 60, synced: false };
    const m2 = { id: 'custom-m-2', date: '2026-06-16', waist: 89, chest: 99, arms: 34.5, thighs: 59.5, synced: true };

    const savedM1 = await page.evaluate(async (m) => {
      return await window.__db.saveMeasurement(m, 'guest');
    }, m1);

    const savedM2 = await page.evaluate(async (m) => {
      return await window.__db.saveMeasurement(m, 'guest');
    }, m2);

    expect(savedM1.id).toBeDefined();
    expect(savedM1.user_id).toBe('guest');
    expect(savedM2.id).toBe('custom-m-2');

    // Query guest measurements and check descending date sorting
    const guestMs = await page.evaluate(async () => {
      return await window.__db.getAllMeasurements('guest');
    });

    expect(guestMs).toHaveLength(2);
    expect(guestMs[0].date).toBe('2026-06-16');
    expect(guestMs[1].date).toBe('2026-06-15');
  });

  test('deleteMeasurement removes measurement and tracks deletions offline', async ({ page }) => {
    const m = { id: 'delete-m-123', date: '2026-06-17', waist: 90, synced: true };
    await page.evaluate(async (item) => {
      await window.__db.saveMeasurement(item, 'guest');
    }, m);

    let measurements = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(measurements).toHaveLength(1);

    // Delete measurement
    const deletedId = await page.evaluate(async () => {
      return await window.__db.deleteMeasurement('delete-m-123', 'guest');
    });
    expect(deletedId).toBe('delete-m-123');

    // Verify deleted locally
    measurements = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(measurements).toHaveLength(0);

    // Verify deletion tracked
    let pending = await page.evaluate(async () => {
      return await window.__db.getPendingMeasurementDeletions('guest');
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual({ id: 'delete-m-123', user_id: 'guest' });

    // Clear pending measurement deletions
    await page.evaluate(async (ids) => {
      await window.__db.clearPendingMeasurementDeletions(ids);
    }, ['delete-m-123']);

    pending = await page.evaluate(async () => {
      return await window.__db.getPendingMeasurementDeletions('guest');
    });
    expect(pending).toHaveLength(0);
  });

  test('getUnsyncedMeasurements returns only unsynced measurements', async ({ page }) => {
    const measurements = [
      { id: 'm1', date: '2026-06-15', waist: 90, synced: true },
      { id: 'm2', date: '2026-06-16', waist: 91, synced: false }
    ];

    for (const m of measurements) {
      await page.evaluate(async (item) => {
        await window.__db.saveMeasurement(item, 'guest');
      }, m);
    }

    const unsynced = await page.evaluate(async () => {
      return await window.__db.getUnsyncedMeasurements('guest');
    });

    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].id).toBe('m2');
  });

  test('migrateGuestLogsInDB correctly updates guest data ownership and sets synced: false', async ({ page }) => {
    // Seed some guest logs and measurements
    await seedIndexedDB(page, [
      { id: 'l1', date: '2026-06-15', mass: 80, body_fat: 20, synced: true, user_id: 'guest' }
    ], [
      { id: 'm1', date: '2026-06-15', waist: 90, synced: true, user_id: 'guest' }
    ]);

    // Run guest migration to a new user
    await page.evaluate(async () => {
      await window.__db.migrateGuestLogsInDB('user-new-456');
    });

    // Check guest logs and measurements are empty (no longer owned by 'guest')
    const guestLogs = await page.evaluate(async () => await window.__db.getAllLogs('guest'));
    const guestMs = await page.evaluate(async () => await window.__db.getAllMeasurements('guest'));
    expect(guestLogs).toHaveLength(0);
    expect(guestMs).toHaveLength(0);

    // Check they are now owned by 'user-new-456' and synced is set to false
    const migratedLogs = await page.evaluate(async () => await window.__db.getAllLogs('user-new-456'));
    const migratedMs = await page.evaluate(async () => await window.__db.getAllMeasurements('user-new-456'));

    expect(migratedLogs).toHaveLength(1);
    expect(migratedLogs[0].id).toBe('l1');
    expect(migratedLogs[0].user_id).toBe('user-new-456');
    expect(migratedLogs[0].synced).toBe(false);

    expect(migratedMs).toHaveLength(1);
    expect(migratedMs[0].id).toBe('m1');
    expect(migratedMs[0].user_id).toBe('user-new-456');
    expect(migratedMs[0].synced).toBe(false);
  });
});
