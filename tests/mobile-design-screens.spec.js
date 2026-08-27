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

  if (!fs.existsSync(localOutputDir)) fs.mkdirSync(localOutputDir, { recursive: true });
  try {
    if (fs.existsSync(path.dirname(artifactDir)) && !fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
  } catch {
    // Ignored in CI
  }

  const saveScreen = async (filename) => {
    const p1 = path.join(localOutputDir, filename);
    await page.screenshot({ path: p1 });
    try {
      if (fs.existsSync(artifactDir)) {
        const p2 = path.join(artifactDir, filename);
        fs.copyFileSync(p1, p2);
      }
    } catch {
      // Ignored in CI
    }
    console.log(`Saved screenshot: ${filename}`);
  };

  // 1. Onboarding Screen
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(500);
  await saveScreen('01_onboarding.png');

  // 2. Open Auth form on Onboarding Screen
  const emailBtn = page.locator('text=Email & Password, text=E-mail et mot de passe').first();
  if (await emailBtn.isVisible()) {
    await emailBtn.click();
    await page.waitForTimeout(400);
    await saveScreen('02_onboarding_email.png');

    // Go back to onboarding options
    const backBtn = page.getByRole('button', { name: /Back to options|Retour aux options/i });
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // 3. Seed data & open guest dashboard
  const guestBtn = page.getByRole('button', { name: /Continue as Guest|mode Invité/i });
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
  }
  await page.waitForTimeout(300);
  await seedIndexedDB(page, MOCK_LOGS, MOCK_MEASUREMENTS);

  // Reload to ensure all seeded data is loaded
  await page.reload();
  const guestBtn2 = page.getByRole('button', { name: /Continue as Guest|mode Invité/i });
  if (await guestBtn2.isVisible()) {
    await guestBtn2.click();
  }
  await expect(page.locator('.glass-card').first()).toBeVisible();
  await page.waitForTimeout(600);

  // 4. Dashboard - Monthly Tab
  await saveScreen('03_dashboard_monthly.png');

  // 5. Dashboard - Weekly Tab
  const weekBtn = page.getByRole('button', { name: /Semaine|Week/i }).first();
  if (await weekBtn.isVisible()) {
    await weekBtn.click();
    await page.waitForTimeout(500);
    await saveScreen('04_dashboard_weekly.png');
  }

  // 6. Dashboard - History Tab
  const historyBtn = page.getByRole('button', { name: /Logs|History/i }).first();
  if (await historyBtn.isVisible()) {
    await historyBtn.click();
    await page.waitForTimeout(500);
    await saveScreen('05_dashboard_history.png');
  }

  // 7. Dashboard - Measurements Tab
  const measBtn = page.getByRole('button', { name: /Mesures|Measurements/i }).first();
  if (await measBtn.isVisible()) {
    await measBtn.click();
    await page.waitForTimeout(500);
    await saveScreen('06_dashboard_measurements.png');
  }

  // 8. Add Measurement Modal
  const addMeasBtn = page.locator('button[title*="Measurement"], button[title*="mensuration"], button:has-text("Mensurations")').first();
  if (await addMeasBtn.isVisible()) {
    await addMeasBtn.click();
    await page.waitForTimeout(400);
    await saveScreen('07_modal_add_measurement.png');
    const closeBtn = page.locator('button[aria-label*="Fermer"], button[aria-label*="Close"], button:has-text("Annuler"), button:has-text("Cancel")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // Switch back to monthly
  const monthBtn = page.getByRole('button', { name: /Mois|Month/i }).first();
  if (await monthBtn.isVisible()) {
    await monthBtn.click();
    await page.waitForTimeout(300);
  }

  // 9. Add Log Entry Modal
  const addLogBtn = page.locator('button[title*="pesée"], button[title*="weigh-in"], button:has-text("Pesée"), button:has-text("Weigh-In")').first();
  if (await addLogBtn.isVisible()) {
    await addLogBtn.click();
    await page.waitForTimeout(400);
    await saveScreen('08_modal_add_log.png');
    const closeBtn2 = page.locator('button[aria-label*="Fermer"], button[aria-label*="Close"], button:has-text("Annuler"), button:has-text("Cancel")').first();
    if (await closeBtn2.isVisible()) await closeBtn2.click();
    await page.waitForTimeout(300);
  }

  // 10. Settings View - Paliers
  const settingsBtn = page.getByRole('button', { name: /Réglages|Paramètres|Settings/i }).first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(500);
    await saveScreen('09_settings_goals.png');

    // 11. Settings View - Profil BIA
    const profileTab = page.getByRole('button', { name: /Profil|Profile/i }).first();
    if (await profileTab.isVisible()) {
      await profileTab.click();
      await page.waitForTimeout(400);
      await saveScreen('10_settings_profile.png');
    }

    // 12. Settings View - Balances BLE
    const devicesTab = page.getByRole('button', { name: /Balances|Scales/i }).first();
    if (await devicesTab.isVisible()) {
      await devicesTab.click();
      await page.waitForTimeout(400);
      await saveScreen('11_settings_devices.png');
    }

    // 13. Settings View - Données (Export/Import)
    const dataTab = page.getByRole('button', { name: /Données|Data/i }).first();
    if (await dataTab.isVisible()) {
      await dataTab.click();
      await page.waitForTimeout(400);
      await saveScreen('12_settings_data.png');
    }
  }
});
