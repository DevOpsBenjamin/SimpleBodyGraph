import { test, expect, devices } from '@playwright/test';
import { seedIndexedDB, MOCK_LOGS, MOCK_MEASUREMENTS } from './db-helper';
import fs from 'fs';
import path from 'path';

test.use({
  ...devices['Pixel 7'],
  // 412 x 915 with deviceScaleFactor 2
});

test('Capture mobile UI screens for design review and documentation', async ({ page }) => {
  const localOutputDir = path.resolve('docs/screenshots');
  const artifactDir = '/home/bledrappier/.gemini/antigravity-cli/brain/bccaf72e-6b88-48c6-bcca-a0f872cdf3d6';

  if (!fs.existsSync(localOutputDir)) fs.mkdirSync(localOutputDir, { recursive: true });

  const saveScreen = async (filename, options = {}) => {
    const p1 = path.join(localOutputDir, filename);
    await page.screenshot({ path: p1, ...options });
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
  const emailBtn = page.locator('button:has(svg.lucide-mail), button:has-text("E-mail"), button:has-text("Email")').first();
  if (await emailBtn.isVisible()) {
    await emailBtn.click();
    await page.waitForTimeout(400);
    await saveScreen('02_onboarding_email.png');

    // Go back to onboarding options
    const backBtn = page.locator('button:has(svg.lucide-arrow-left), button:has-text("Retour"), button:has-text("Back")').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // 3. Seed BIA Data & Open Guest Dashboard
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'bia_cut_85to75_dataset.json');
  let mockData = null;
  if (fs.existsSync(fixturePath)) {
    mockData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  }

  const guestBtn = page.getByRole('button', { name: /Continue as Guest|mode Invité|Continuer en mode Invité/i });
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
  }
  await page.waitForTimeout(300);

  if (mockData) {
    await page.evaluate((data) => {
      if (data.profile) localStorage.setItem('bodygraph_profile', JSON.stringify(data.profile));
      if (data.paliers) localStorage.setItem('bodygraph_paliers', JSON.stringify(data.paliers));
      if (data.displayPreferences) localStorage.setItem('bodygraph_display_preferences', JSON.stringify(data.displayPreferences));
    }, mockData);
    await seedIndexedDB(page, mockData.logs || MOCK_LOGS, mockData.measurements || MOCK_MEASUREMENTS);
  } else {
    await seedIndexedDB(page, MOCK_LOGS, MOCK_MEASUREMENTS);
  }

  // Reload to ensure all seeded data is ingested
  await page.reload();
  const guestBtn2 = page.getByRole('button', { name: /Continue as Guest|mode Invité|Continuer en mode Invité/i });
  if (await guestBtn2.isVisible()) {
    await guestBtn2.click();
  }
  await expect(page.locator('.glass-card').first()).toBeVisible();
  await page.waitForTimeout(800);

  // 4. Dashboard - Monthly Tab
  await saveScreen('03_dashboard_monthly.png');

  // 5. Dashboard - Weekly Tab
  const navWeekly = page.locator('nav button[aria-label*="Semaine"], nav button[aria-label*="Weekly"]').first();
  if (await navWeekly.isVisible()) {
    await navWeekly.click();
    await page.waitForTimeout(600);
    await saveScreen('04_dashboard_weekly.png');
  }

  // 6. Switch back to monthly & capture BIA Segmental Charts
  const navMonthly = page.locator('nav button[aria-label*="Mois"], nav button[aria-label*="Monthly"]').first();
  if (await navMonthly.isVisible()) {
    await navMonthly.click();
    await page.waitForTimeout(500);
  }

  // Scroll down to segmental charts area
  await page.evaluate(() => window.scrollBy(0, 480));
  await page.waitForTimeout(400);
  await saveScreen('05_bia_segmental_charts.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // 7. Open BIA Detail Modal from Period Summary
  const reportBtn = page.getByRole('button', { name: /Rapport Complet|Full Report/i });
  if (await reportBtn.isVisible()) {
    await reportBtn.click();
    await page.waitForTimeout(500);
    await saveScreen('06_bia_modal_report.png');
    // Close modal
    const closeBtn = page.getByRole('button', { name: /Fermer|Close/i }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 8. Dashboard - Measurements Tab
  const navMeas = page.locator('nav button[aria-label*="Mesures"], nav button[aria-label*="Measurements"]').first();
  if (await navMeas.isVisible()) {
    await navMeas.click();
    await page.waitForTimeout(500);
    await saveScreen('07_dashboard_measurements.png');
  }

  // 9. Dashboard - History Tab
  const navLogs = page.locator('nav button[aria-label*="Logs"], nav button[aria-label*="Historique"], nav button[aria-label*="History"]').first();
  if (await navLogs.isVisible()) {
    await navLogs.click();
    await page.waitForTimeout(500);
    await saveScreen('08_dashboard_history.png');
  }

  // 10. Add Log Entry Modal (Switch back to monthly and open modal)
  if (await navMonthly.isVisible()) {
    await navMonthly.click();
    await page.waitForTimeout(400);
  }
  const mainFab = page.locator('div.fixed.bottom-20 button, div.fixed.bottom-6 button').first();
  if (await mainFab.isVisible()) {
    await mainFab.click();
    await page.waitForTimeout(400);
    await saveScreen('09_modal_add_log.png');
    const closeBtn2 = page.locator('button[aria-label*="Fermer"], button[aria-label*="Close"], button:has-text("Annuler"), button:has-text("Cancel")').first();
    if (await closeBtn2.isVisible()) await closeBtn2.click();
    await page.waitForTimeout(300);
  }

  // 11. Add Measurement Modal
  if (await navMeas.isVisible()) {
    await navMeas.click();
    await page.waitForTimeout(400);
  }
  if (await mainFab.isVisible()) {
    await mainFab.click();
    await page.waitForTimeout(400);
    await saveScreen('10_modal_add_measurement.png');
    const closeBtn3 = page.locator('button[aria-label*="Fermer"], button[aria-label*="Close"], button:has-text("Annuler"), button:has-text("Cancel")').first();
    if (await closeBtn3.isVisible()) await closeBtn3.click();
    await page.waitForTimeout(300);
  }

  // 12. Settings View - Paliers
  const navSettings = page.locator('nav button[aria-label*="Réglages"], nav button[aria-label*="Paramètres"], nav button[aria-label*="Settings"]').first();
  if (await navSettings.isVisible()) {
    await navSettings.click();
    await page.waitForTimeout(500);
    await saveScreen('11_settings_goals.png');

    // 13. Settings View - Affichage / Display
    const displayTab = page.getByRole('button', { name: /Affichage|Display/i }).first();
    if (await displayTab.isVisible()) {
      await displayTab.click();
      await page.waitForTimeout(400);
      await saveScreen('12_settings_display.png');
    }

    // 14. Settings View - Profil BIA
    const profileTab = page.getByRole('button', { name: /Profil|Profile/i }).first();
    if (await profileTab.isVisible()) {
      await profileTab.click();
      await page.waitForTimeout(400);
      await saveScreen('13_settings_profile.png');
    }

    // 15. Settings View - Balances BLE
    const devicesTab = page.getByRole('button', { name: /Balances|Scales/i }).first();
    if (await devicesTab.isVisible()) {
      await devicesTab.click();
      await page.waitForTimeout(400);
      await saveScreen('14_settings_devices.png');
    }

    // 16. Settings View - Langue / Language
    const langTab = page.getByRole('button', { name: /Langue|Language/i }).first();
    if (await langTab.isVisible()) {
      await langTab.click();
      await page.waitForTimeout(400);
      await saveScreen('15_settings_language.png');
    }

    // 17. Settings View - Données (Export/Import)
    const dataTab = page.getByRole('button', { name: /Données|Data/i }).first();
    if (await dataTab.isVisible()) {
      await dataTab.click();
      await page.waitForTimeout(400);
      await saveScreen('16_settings_data.png');
    }
  }
});
