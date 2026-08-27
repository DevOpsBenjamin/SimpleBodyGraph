import { test, expect } from '@playwright/test';
import { seedIndexedDB, MOCK_LOGS } from './db-helper';

test('Seed user data and take screenshot', async ({ page }) => {
  // Listen to browser console and errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  // Navigate to application
  await page.goto('http://localhost:4173/');

  // 1. Click "Continue as Guest" on OnboardingScreen
  const guestBtn = page.getByRole('button', { name: /Continue as Guest|Continuer en mode Invité/i });
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
  }
  await page.waitForTimeout(300);

  // 2. Clear IndexedDB and seed user logs using reusable helper
  await seedIndexedDB(page, MOCK_LOGS);

  // Reload the page to load the seeded logs
  await page.reload();

  // Click "Continue as Guest" again since memory state is reset
  const guestBtn2 = page.getByRole('button', { name: /Continue as Guest|Continuer en mode Invité/i });
  if (await guestBtn2.isVisible()) {
    await guestBtn2.click();
  }

  // Wait for the active month logs helper or charts to load since Month is the new default tab
  await expect(page.locator('.glass-card').first()).toBeVisible();

  // Assert Monthly medians are displayed on the top cards in Month view (July 2026 median: 101.40 kg)
  await expect(page.locator('text=101.40 kg').first()).toBeVisible(); // Total Mass card (Month median)
  await expect(page.locator('text=32.4').first()).toBeVisible(); // Body Fat % card (Month median)
  await expect(page.locator('text=32.85 kg').first()).toBeVisible(); // Fat Mass card (Month median)

  // Assert the Hevy Sync Helper list is visible at the bottom
  await expect(page.locator('.glass-card').first()).toBeVisible();

  // Let it render for 1 second
  await page.waitForTimeout(1000);

  // Take screenshot of the entire viewport
  const screenshotPath = 'charts_render.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot captured at:', screenshotPath);

  // Open settings view to verify the newly added Settings & tabs
  const settingsBtn = page.getByRole('button', { name: /Paramètres|Settings|Réglages/i }).first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Assert target header and tabs are visible
    await expect(page.locator('text=Paramètres & Configuration, text=Settings & Configuration').first()).toBeVisible();
    await expect(page.locator('text=Profil (BIA), text=Profile (BIA)').first()).toBeVisible();

    // Take screenshot of the settings modal
    const settingsScreenshotPath = 'settings_render.png';
    await page.screenshot({ path: settingsScreenshotPath, fullPage: true });
    console.log('Settings screenshot captured at:', settingsScreenshotPath);
  }
});
