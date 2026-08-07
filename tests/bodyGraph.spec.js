import { test, expect } from '@playwright/test';

test.describe('bodyGraph Pinia Store tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page
    await page.goto('http://localhost:4173/');
    // Wait for the page to be ready (e.g., onboarding screen)
    await page.waitForSelector('text=Continue as Guest');
  });

  test('Store defaults and guest mode activation', async ({ page }) => {
    // Test initial state before guest mode is active
    const initialStoreState = await page.evaluate(() => {
      const store = window.useBodyGraphStore();
      return {
        isGuestMode: store.isGuestMode,
        showDashboard: store.showDashboard,
        currentUserId: store.currentUserId,
        logsCount: store.logs.length,
      };
    });

    expect(initialStoreState.isGuestMode).toBe(false);
    expect(initialStoreState.showDashboard).toBe(false);
    expect(initialStoreState.currentUserId).toBe('guest');
    expect(initialStoreState.logsCount).toBe(0);

    // Click Continue as Guest
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    // Verify store has guest mode enabled
    const guestStoreState = await page.evaluate(() => {
      const store = window.useBodyGraphStore();
      return {
        isGuestMode: store.isGuestMode,
        showDashboard: store.showDashboard,
      };
    });

    expect(guestStoreState.isGuestMode).toBe(true);
    expect(guestStoreState.showDashboard).toBe(true);
  });

  test('Store calculations and getters with seeded mock data from main', async ({ page }) => {
    // Click Continue as Guest
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    // Seed the exact testLogs from main's tests/charts.spec.js into IndexedDB
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const DB_NAME = 'SimpleBodyGraphDB';
        const DB_VERSION = 3;
        const STORE_LOGS = 'logs';
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(STORE_LOGS, 'readwrite');
          const store = transaction.objectStore(STORE_LOGS);
          store.clear();
          const testLogs = [
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
            { id: '13', date: '2026-06-05', mass: 107.65, body_fat: 35.1, synced: true, user_id: 'guest' }
          ];
          testLogs.forEach(log => store.put(log));
          transaction.oncomplete = () => resolve('Seeded successfully');
        };
      });
    });

    // Reload page to force store to load from database
    await page.reload();
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    // Verify store contains the seeded logs & verify getters
    const results = await page.evaluate(() => {
      const store = window.useBodyGraphStore();

      // Let's compute some targets
      store.updateGoals(90, 12);

      return {
        logsCount: store.logs.length,
        firstLogDate: store.logs[0].date,
        logsWithEstimatesCount: store.logsWithEstimates.length,
        targetLeanMass: store.targetLeanMass,
        targetFatMass: store.targetFatMass,
        // Get groupedWeeks & groupedMonths
        groupedWeeksCount: store.groupedWeeks.length,
        groupedMonthsCount: store.groupedMonths.length,
        // Stats calculations
        stats: store.stats,
      };
    });

    expect(results.logsCount).toBe(13);
    expect(results.firstLogDate).toBe('2026-06-17'); // sorted descending by default
    expect(results.logsWithEstimatesCount).toBe(13);

    // updateGoals(90, 12) -> Lean Mass = 90 * (1 - 0.12) = 79.2. Fat Mass = 90 * 0.12 = 10.8
    expect(results.targetLeanMass).toBeCloseTo(79.2);
    expect(results.targetFatMass).toBeCloseTo(10.8);

    // Verify weekly and monthly groupings
    expect(results.groupedMonthsCount).toBe(1); // June 2026
    expect(results.groupedWeeksCount).toBe(3); // 2026-06-15, 2026-06-08, 2026-06-01

    // Verify rolling median calculations
    // For June 17, last 7 days ending June 17: June 11 to June 17
    // Masses: [105.35, 105.78, 106.20, 107.40, 106.60, 105.80, 106.08]
    // Sorted masses: [105.35, 105.78, 105.80, 106.08, 106.20, 106.60, 107.40]
    // Median is 106.08.
    expect(results.stats.rollingMedianMass).toBeCloseTo(106.08);

    // Let's test Monthly navigation actions (with bounds clamping)
    const monthNavResults = await page.evaluate(() => {
      const store = window.useBodyGraphStore();

      const initialMonth = store.activeMonth.id; // June 2026

      store.goToPreviousMonth();
      const prevMonth = store.activeMonth.id; // Clamps to June 2026 because only 1 month exists

      store.goToNextMonth();
      const nextMonth = store.activeMonth.id; // June 2026

      return {
        initialMonth,
        prevMonth,
        nextMonth,
      };
    });

    expect(monthNavResults.initialMonth).toBe('2026-06');
    expect(monthNavResults.prevMonth).toBe('2026-06');
    expect(monthNavResults.nextMonth).toBe('2026-06');

    // Let's test Weekly navigation actions
    const weekNavResults = await page.evaluate(() => {
      const store = window.useBodyGraphStore();

      const initialWeekIndex = store.selectedWeekIndex;
      store.goToPreviousWeek();
      const prevWeekIndex = store.selectedWeekIndex;

      // Go past limit
      for (let i = 0; i < 10; i++) {
        store.goToPreviousWeek();
      }
      const maxedWeekIndex = store.selectedWeekIndex;

      store.goToNextWeek();
      const nextWeekIndex = store.selectedWeekIndex;

      return {
        initialWeekIndex,
        prevWeekIndex,
        maxedWeekIndex,
        nextWeekIndex,
      };
    });

    expect(weekNavResults.initialWeekIndex).toBe(0);
    expect(weekNavResults.prevWeekIndex).toBe(1);
    expect(weekNavResults.maxedWeekIndex).toBe(2); // clamped at max length - 1 (3 weeks => indices 0 to 2)
    expect(weekNavResults.nextWeekIndex).toBe(1);
  });

  test('Store mutative actions (save, delete) for logs and measurements', async ({ page }) => {
    // Click Continue as Guest
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    // Ensure we start with 0 logs and measurements
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const DB_NAME = 'SimpleBodyGraphDB';
        const DB_VERSION = 3;
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction(['logs', 'measurements'], 'readwrite');
          tx.objectStore('logs').clear();
          tx.objectStore('measurements').clear();
          tx.oncomplete = () => resolve();
        };
      });
    });

    await page.reload();
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    const initialCounts = await page.evaluate(() => {
      const store = window.useBodyGraphStore();
      return { logs: store.logs.length, measurements: store.measurements.length };
    });
    expect(initialCounts.logs).toBe(0);
    expect(initialCounts.measurements).toBe(0);

    // Create a log entry
    await page.evaluate(async () => {
      const store = window.useBodyGraphStore();
      await store.saveLogEntry({
        id: 'new-log-1',
        mass: 80,
        bodyFat: 15,
        date: '2026-01-01',
      });
    });

    // Create a measurement entry
    await page.evaluate(async () => {
      const store = window.useBodyGraphStore();
      await store.saveMeasurementEntry({
        id: 'new-meas-1',
        date: '2026-01-01',
        waist: 85,
        chest: 100,
        arms: 35,
        thighs: 55,
      });
    });

    const countsAfterInsert = await page.evaluate(() => {
      const store = window.useBodyGraphStore();
      return {
        logs: store.logs.length,
        firstLogMass: store.logs[0].mass,
        measurements: store.measurements.length,
        firstMeasWaist: store.measurements[0].waist,
      };
    });

    expect(countsAfterInsert.logs).toBe(1);
    expect(countsAfterInsert.firstLogMass).toBe(80);
    expect(countsAfterInsert.measurements).toBe(1);
    expect(countsAfterInsert.firstMeasWaist).toBe(85);

    // Edit log entry
    await page.evaluate(async () => {
      const store = window.useBodyGraphStore();
      // Set editing
      store.setEditingLog(store.logs[0]);
      await store.saveLogEntry({
        id: 'new-log-1',
        mass: 82,
        bodyFat: 14,
        date: '2026-01-01',
      });
    });

    const countsAfterEdit = await page.evaluate(() => {
      const store = window.useBodyGraphStore();
      return {
        logs: store.logs.length,
        firstLogMass: store.logs[0].mass,
        firstLogFat: store.logs[0].body_fat,
      };
    });

    expect(countsAfterEdit.logs).toBe(1);
    expect(countsAfterEdit.firstLogMass).toBe(82);
    expect(countsAfterEdit.firstLogFat).toBe(14);

    // Delete entries
    await page.evaluate(async () => {
      const store = window.useBodyGraphStore();
      await store.deleteLogEntry('new-log-1');
      await store.deleteMeasurementEntry('new-meas-1');
    });

    const finalCounts = await page.evaluate(() => {
      const store = window.useBodyGraphStore();
      return { logs: store.logs.length, measurements: store.measurements.length };
    });

    expect(finalCounts.logs).toBe(0);
    expect(finalCounts.measurements).toBe(0);
  });
});
