import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

// ─── Test 1: Count cross-verification ────────────────────────────────────────
test('KAAI Analysis filter - KAAI Analysed + Not Analysed count = Total count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalCount       = await adsLibrary.getResultsCount();

  await adsLibrary.selectKaaiOption('KAAI Analysed');
  const analysedCount    = await adsLibrary.getResultsCount();

  await adsLibrary.selectKaaiOption('Not Analysed');
  const notAnalysedCount = await adsLibrary.getResultsCount();

  console.table({ totalCount, analysedCount, notAnalysedCount });
  expect(analysedCount + notAnalysedCount).toBe(totalCount);
});

// ─── Test 2: KAAI Analysed — only purple buttons visible ─────────────────────
test('KAAI Analysis filter - KAAI Analysed shows only purple KAAI buttons, zero white buttons', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectKaaiOption('KAAI Analysed');
  await adsLibrary.kaaiAnalysedCardButtons.first().waitFor({ state: 'visible' });

  const purpleButtons = await adsLibrary.kaaiAnalysedCardButtons.count();
  const whiteButtons  = await adsLibrary.kaaiNotAnalysedCardButtons.count();

  console.table({ purpleButtons, whiteButtons });
  expect(purpleButtons).toBeGreaterThan(0);
  expect(whiteButtons).toBe(0);
});

// ─── Test 3: Not Analysed — zero purple buttons visible ──────────────────────
test('KAAI Analysis filter - Not Analysed shows only white KAAI buttons, zero purple buttons', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectKaaiOption('Not Analysed');
  await adsLibrary.kaaiNotAnalysedCardButtons.first().waitFor({ state: 'visible' });

  const purpleButtons = await adsLibrary.kaaiAnalysedCardButtons.count();
  const whiteButtons  = await adsLibrary.kaaiNotAnalysedCardButtons.count();

  console.table({ purpleButtons, whiteButtons });
  expect(purpleButtons).toBe(0);
  expect(whiteButtons).toBeGreaterThan(0);
});
