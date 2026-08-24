import { test, expect, devices } from '@playwright/test';
import { seedIndexedDB, MOCK_LOGS, MOCK_MEASUREMENTS } from './db-helper';
import fs from 'fs';
import path from 'path';

test.use({
  ...devices['Pixel 7'],
  // 412 x 915 with deviceScaleFactor 2
});

test('Capture mobile UI screens for design review', async ({ page }) => {
  const localOutputDir = path.resolve('screenshots_mobile');
  const artifactDir = '/Users/devops.benjamin/.gemini/antigravity-cli/brain/fda733a7-9922-497d-9a4d-3925be20d124';

  [localOutputDir, artifactDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const saveScreen = async (filename) => {
    const p1 = path.join(localOutputDir, filename);
    const p2 = path.join(artifactDir, filename);
    await page.screenshot({ path: p1 });
    fs.copyFileSync(p1, p2);
    console.log(`Saved screenshot: ${filename}`);
  };

  // 1. Onboarding Screen
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(500);
  await saveScreen('01_onboarding.png');

  // 2. Open Auth form on Onboarding Screen
  await page.locator('text=Email & Password').click();
  await page.waitForTimeout(400);
  await saveScreen('02_onboarding_email.png');

  // Go back to onboarding options
  await page.getByRole('button', { name: 'Back to options' }).click();
  await page.waitForTimeout(300);

  // 3. Seed data & open guest dashboard
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('button', { name: 'Add Log Entry' })).toBeVisible();
  await seedIndexedDB(page, MOCK_LOGS, MOCK_MEASUREMENTS);

  // Reload to ensure all seeded data is loaded
  await page.reload();
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.locator('.glass-card >> text=Hevy Helper').first()).toBeVisible();
  await page.waitForTimeout(600);

  // 4. Dashboard - Monthly Tab
  await saveScreen('03_dashboard_monthly.png');

  // 5. Dashboard - Weekly Tab
  await page.getByRole('button', { name: 'Tendance (Semaine)' }).click();
  await page.waitForTimeout(500);
  await saveScreen('04_dashboard_weekly.png');

  // 6. Dashboard - History Tab
  await page.getByRole('button', { name: 'Logs History' }).click();
  await page.waitForTimeout(500);
  await saveScreen('05_dashboard_history.png');

  // 7. Dashboard - Measurements Tab
  await page.getByRole('button', { name: 'Measurements' }).click();
  await page.waitForTimeout(500);
  await saveScreen('06_dashboard_measurements.png');

  // 8. Add Measurement Modal
  await page.locator('button[title="Add Measurement"]').click();
  await page.waitForTimeout(400);
  await saveScreen('07_modal_add_measurement.png');
  await page.locator('button[aria-label="Fermer la fenêtre"]').click();
  await page.waitForTimeout(300);

  // Switch back to monthly
  await page.getByRole('button', { name: 'Tendance (Mensuel)' }).click();
  await page.waitForTimeout(300);

  // 9. Add Log Entry Modal
  await page.locator('button[title="Add Log Entry"]').click();
  await page.waitForTimeout(400);
  await saveScreen('08_modal_add_log.png');
  await page.locator('button[aria-label="Fermer la fenêtre"]').click();
  await page.waitForTimeout(300);

  // 10. Settings View - Paliers
  await page.locator('button[title="Settings & Goals"]').click();
  await page.waitForTimeout(500);
  await saveScreen('09_settings_goals.png');

  // 11. Settings View - Profil BIA
  await page.getByRole('button', { name: 'Profil (BIA)' }).click();
  await page.waitForTimeout(400);
  await saveScreen('10_settings_profile.png');

  // 12. Settings View - Balances BLE
  await page.getByRole('button', { name: 'Balances' }).click();
  await page.waitForTimeout(400);
  await saveScreen('11_settings_devices.png');

  // 13. Settings View - Données (Export/Import)
  await page.getByRole('button', { name: 'Données' }).click();
  await page.waitForTimeout(400);
  await saveScreen('12_settings_data.png');
});
