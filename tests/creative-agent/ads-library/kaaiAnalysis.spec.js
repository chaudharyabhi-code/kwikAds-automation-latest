import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// ─── Test 1: Not-analysed card — loader appears, then content loads ───────────
test('KAAI Analysis - clicking KAAI button on a not-analysed card triggers analysis with a loader', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();

  // Show only cards that have NOT been analysed yet
  await adsLibrary.selectKaaiOption('Not Analysed');
  await adsLibrary.waitForFilter();

  // Click the KAAI Analysis button on the first card
  await adsLibrary.clickFirstKaaiButton();

  // Loading spinner must appear — proves analysis was triggered
  await expect(adsLibrary.kaaiModalLoader).toBeVisible();

  // Wait for AI processing to finish and the content heading to appear (up to 30)
  await adsLibrary.kaaiModalContent.waitFor({ state: 'visible', timeout: 30000 });
  await expect(adsLibrary.kaaiModalContent).toBeVisible();

  await adsLibrary.closeCardDetail();
});

// ─── Test 2: Already-analysed card — content visible immediately, no loader ───
test('KAAI Analysis - clicking KAAI button on an already-analysed card shows content immediately without a loader', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();

  // Show only cards that already have KAAI analysis done
  await adsLibrary.selectKaaiOption('KAAI Analysed');
  await adsLibrary.waitForFilter();

  // Click the KAAI Analysis button on the first card
  await adsLibrary.clickFirstKaaiButton();

  // Content heading must be present right away — no waiting for AI
  await expect(adsLibrary.kaaiModalContent).toBeVisible();

  // Loader must NOT be visible (analysis was already done)
  await expect(adsLibrary.kaaiModalLoader).not.toBeVisible();

  await adsLibrary.closeCardDetail();
});
