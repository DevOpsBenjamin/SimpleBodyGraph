import { test, expect } from '@playwright/test';
import { seedIndexedDB, MOCK_LOGS } from './db-helper';

test('Seed user data and take screenshot', async ({ page }) => {
  // Listen to browser console and errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  // Navigate to application
  await page.goto('http://localhost:4173/');

  // 1. Click "Continue as Guest" on OnboardingScreen
  await page.getByRole('button', { name: 'Continue as Guest' }).click();

  // Wait for onboarding to transition and the main page / add button to appear
  await expect(page.getByRole('button', { name: 'Add Log Entry' })).toBeVisible();

  // 2. Clear IndexedDB and seed user logs using reusable helper
  await seedIndexedDB(page, MOCK_LOGS);

  // Reload the page to load the seeded logs
  await page.reload();

  // Click "Continue as Guest" again since memory state is reset
  await page.getByRole('button', { name: 'Continue as Guest' }).click();

  // Wait for the active month logs helper or charts to load since Month is the new default tab
  await expect(page.locator('.glass-card >> text=Hevy Helper').first()).toBeVisible();

  // Assert 7d rolling medians are displayed on the top cards (calculated over the last 7 days ending Jul 15)
  await expect(page.locator('text=100.50 kg').first()).toBeVisible(); // Total Mass card
  await expect(page.locator('text=32.2').first()).toBeVisible(); // Body Fat % card
  await expect(page.locator('text=32.31 kg').first()).toBeVisible(); // Fat Mass card

  // Assert the Hevy Sync Helper list is visible at the bottom
  // Using bounding box or first visible element
  await expect(page.locator('text=Hevy Sync Helper').first()).toBeVisible();

  // Let it render for 1 second
  await page.waitForTimeout(1000);

  // Take screenshot of the entire viewport
  const screenshotPath = 'charts_render.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot captured at:', screenshotPath);

  // Open settings view to verify the newly added Settings & tabs
  await page.getByRole('button', { name: 'Paramètres' }).first().click();
  await page.waitForTimeout(500);

  // Assert target header and tabs are visible
  await expect(page.locator('text=Paramètres & Configuration').first()).toBeVisible();
  await expect(page.locator('text=Profil (BIA)').first()).toBeVisible();

  // Take screenshot of the settings modal
  const settingsScreenshotPath = 'settings_render.png';
  await page.screenshot({ path: settingsScreenshotPath, fullPage: true });
  console.log('Settings screenshot captured at:', settingsScreenshotPath);
});
