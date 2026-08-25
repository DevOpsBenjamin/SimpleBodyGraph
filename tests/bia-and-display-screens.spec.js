import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { seedIndexedDB } from './db-helper';

test.describe('BIA & Display Preferences Visual Verification', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro Mobile Viewport

  test('Seeds local BIA dataset and captures all new UI features', async ({ page }) => {
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'bia_mock_dataset.local.json');
    if (!fs.existsSync(fixturePath)) {
      test.skip('No local BIA fixture found');
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

    // 1. Capture Monthly Dashboard with 4 cards, BIA Summary, and Unified Chart
    await page.screenshot({ path: 'screenshots_mobile/bia_01_monthly_dashboard.png', fullPage: true });

    // 2. Switch to Weekly Tab
    await page.getByRole('button', { name: 'Semaine' }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'screenshots_mobile/bia_02_weekly_dashboard.png', fullPage: true });

    // 3. Open BIA Detail Modal from Period Summary
    const reportBtn = page.getByRole('button', { name: /Rapport Complet/i });
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots_mobile/bia_03_modal_report.png' });
      // Close modal
      await page.getByRole('button', { name: /Fermer/i }).click();
      await page.waitForTimeout(300);
    }

    // 4. Navigate to Settings -> Affichage Tab
    await page.locator('nav[aria-label="Navigation mobile"] button[aria-label="Réglages"]').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Affichage' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots_mobile/bia_04_settings_display.png', fullPage: true });

    // 5. Navigate to History (Logs)
    await page.locator('nav[aria-label="Navigation mobile"] button[aria-label="Logs"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots_mobile/bia_05_history_bia_badge.png', fullPage: true });
  });
});
