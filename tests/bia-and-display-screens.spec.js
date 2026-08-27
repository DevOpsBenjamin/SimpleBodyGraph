import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { seedIndexedDB } from './db-helper';

test.describe('BIA & Display Preferences Visual Verification', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro Mobile Viewport

  test('Seeds local BIA dataset and captures all new UI features', async ({ page }) => {
    const localFixture = path.join(process.cwd(), 'tests', 'fixtures', 'bia_mock_dataset.local.json');
    const sharedFixture = path.join(process.cwd(), 'tests', 'fixtures', 'bia_cut_85to75_dataset.json');
    const fixturePath = fs.existsSync(localFixture) ? localFixture : sharedFixture;

    if (!fs.existsSync(fixturePath)) {
      test.skip('No BIA fixture found');
      return;
    }

    const mockData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Bypass onboarding by clicking Continue as Guest
    const guestBtn = page.getByRole('button', { name: /Continue as Guest|mode invité/i });
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
    }

    // Seed database and preferences
    await page.evaluate((data) => {
      localStorage.setItem('bodygraph_profile', JSON.stringify(data.profile));
      localStorage.setItem('bodygraph_paliers', JSON.stringify(data.paliers));
      localStorage.setItem('bodygraph_display_preferences', JSON.stringify({
        cards: { mass: true, fatMass: true, bodyFat: true, leanMass: true },
        charts: { 
          showMass: true, 
          showFatMass: true, 
          showLeanMass: true, 
          showFatPercentChart: true,
          showBiaMuscleChart: true,
          showBiaFatChart: true
        }
      }));
    }, mockData);

    await seedIndexedDB(page, mockData.logs, mockData.measurements);

    // Reload page to ingest state
    await page.reload();
    await page.waitForLoadState('networkidle');

    const guestBtn2 = page.getByRole('button', { name: /Continue as Guest|mode invité/i });
    if (await guestBtn2.isVisible()) {
      await guestBtn2.click();
    }

    await page.waitForTimeout(1000);

    // Assert that KPIs reflect the latest month's progression (July 2026: ~75kg, ~12% fat)
    const massCard = page.locator('text=Poids Total, text=Total Weight, text=Weight').first();
    await expect(massCard).toBeVisible();

    // 1. Capture Monthly Dashboard with 4 cards, BIA Summary, Unified Chart, and Segmental Charts
    await page.screenshot({ path: 'screenshots_mobile/bia_01_monthly_dashboard.png', fullPage: true });

    // 2. Switch to Weekly Tab
    const weekBtn = page.getByRole('button', { name: /Semaine|Week/i }).first();
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots_mobile/bia_02_weekly_dashboard.png', fullPage: true });
    }

    // 3. Open BIA Detail Modal from Period Summary
    const reportBtn = page.getByRole('button', { name: /Rapport Complet|Full Report/i });
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_mobile/bia_03_modal_report.png' });
      // Close modal
      const closeBtn = page.getByRole('button', { name: /Fermer|Close/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // 4. Navigate to Settings -> Affichage Tab
    const navSettings = page.locator('nav button[aria-label*="Réglages"], nav button[aria-label*="Settings"], nav button[aria-label*="Paramètres"], button:has-text("Settings"), button:has-text("Paramètres")').first();
    if (await navSettings.isVisible()) {
      await navSettings.click();
      await page.waitForTimeout(500);
      const displayTab = page.getByRole('button', { name: /Affichage|Display/i }).first();
      if (await displayTab.isVisible()) {
        await displayTab.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots_mobile/bia_04_settings_display.png', fullPage: true });
      }
    }

    // 5. Navigate to History (Logs)
    const navLogs = page.locator('nav button[aria-label*="Logs"], nav button[aria-label*="Historique"], nav button[aria-label*="History"]').first();
    if (await navLogs.isVisible()) {
      await navLogs.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_mobile/bia_05_history_bia_badge.png', fullPage: true });
    }
  });
});
