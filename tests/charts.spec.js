import { test, expect } from '@playwright/test';

test('Seed user data and take screenshot', async ({ page }) => {
  // Listen to browser console and errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  // Navigate to application
  await page.goto('http://localhost:5174/');

  // 1. Click "Continue as Guest" on OnboardingScreen
  await page.getByRole('button', { name: 'Continue as Guest' }).click();

  // Wait for onboarding to transition and the main page / add button to appear
  await expect(page.getByRole('button', { name: 'Add Log Entry' })).toBeVisible();

  // 2. Execute JavaScript in context to clear IndexedDB and seed user logs
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const DB_NAME = 'SimpleBodyGraphDB';
      const DB_VERSION = 2;
      const STORE_LOGS = 'logs';
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(STORE_LOGS, 'readwrite');
        const store = transaction.objectStore(STORE_LOGS);
        store.clear();
        const testLogs = [
          { id: '1', date: '2026-06-17', mass: 105.35, body_fat: 34.2, is_sick: false, synced: true, user_id: 'guest' },
          { id: '2', date: '2026-06-16', mass: 105.78, body_fat: 34.3, is_sick: false, synced: true, user_id: 'guest' },
          { id: '3', date: '2026-06-15', mass: 106.20, body_fat: 34.4, is_sick: false, synced: true, user_id: 'guest' },
          { id: '4', date: '2026-06-14', mass: 107.40, body_fat: 34.6, is_sick: true, synced: true, user_id: 'guest' },
          { id: '5', date: '2026-06-13', mass: 106.60, body_fat: 34.3, is_sick: false, synced: true, user_id: 'guest' },
          { id: '6', date: '2026-06-12', mass: 105.80, body_fat: 34.1, is_sick: false, synced: true, user_id: 'guest' },
          { id: '7', date: '2026-06-11', mass: 106.08, body_fat: 34.2, is_sick: false, synced: true, user_id: 'guest' },
          { id: '8', date: '2026-06-10', mass: 106.35, body_fat: 34.3, is_sick: false, synced: true, user_id: 'guest' },
          { id: '9', date: '2026-06-09', mass: 106.35, body_fat: 34.6, is_sick: false, synced: true, user_id: 'guest' },
          { id: '10', date: '2026-06-08', mass: 106.35, body_fat: 34.8, is_sick: false, synced: true, user_id: 'guest' },
          { id: '11', date: '2026-06-07', mass: 106.80, body_fat: 34.9, is_sick: false, synced: true, user_id: 'guest' },
          { id: '12', date: '2026-06-06', mass: 107.25, body_fat: 35.0, is_sick: false, synced: true, user_id: 'guest' },
          { id: '13', date: '2026-06-05', mass: 107.65, body_fat: 35.1, is_sick: false, synced: true, user_id: 'guest' }
        ];
        testLogs.forEach(log => store.put(log));
        transaction.oncomplete = () => {
          resolve('Seeded successfully');
        };
      };
    });
  });

  // Reload the page to load the seeded logs
  await page.reload();

  // Click "Continue as Guest" again since memory state is reset
  await page.getByRole('button', { name: 'Continue as Guest' }).click();

  // Wait for the active week logs helper or charts to load
  await expect(page.locator('.glass-card >> text=Hevy Helper')).toBeVisible();

  // Assert Hevy Helper shows correct medians (from the active week of Jun 15 - Jun 21)
  await expect(page.locator('text=W: 105.78 kg')).toBeVisible();
  await expect(page.locator('text=Lean: 69.50 kg')).toBeVisible();
  await expect(page.locator('text=Fat: 34.3%')).toBeVisible();
  await expect(page.locator('text=Fat kg: 36.28 kg')).toBeVisible();

  // Assert raw measurements of latest day (Jun 17) are displayed on the top cards
  await expect(page.locator('text=105.35 kg').first()).toBeVisible(); // Total Mass card
  await expect(page.locator('text=69.32 kg').first()).toBeVisible(); // Lean Mass card
  await expect(page.locator('text=34.2 %').first()).toBeVisible(); // Body Fat card
  await expect(page.locator('text=36.03 kg').first()).toBeVisible(); // Fat Mass card
  // Click "All-Time" tab to display long-term weekly trends
  await page.getByRole('button', { name: 'All-Time' }).click();

  // Click "All-Time" tab to display long-term weekly trends
  await page.getByRole('button', { name: 'All-Time' }).click();

  // Let it render for 1 second
  await page.waitForTimeout(1000);

  // Take screenshot of the entire viewport
  const screenshotPath = 'charts_render.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot captured at:', screenshotPath);
});
