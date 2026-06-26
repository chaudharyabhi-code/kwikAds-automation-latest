import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// ─── Test 1: Page loads with all filter controls visible ─────────────────────
test('Ads Library Page Load', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.searchInputBox).toBeVisible();
  await expect(adsLibrary.brandNameFilter).toBeVisible();
  await expect(adsLibrary.adFormatFilter).toBeVisible();
  await expect(adsLibrary.allStatusFilter).toBeVisible();
  await expect(adsLibrary.kaaiAnalysisFilter).toBeVisible();
  await expect(adsLibrary.launchDateRangePicker.nth(0)).toBeVisible();
  await expect(adsLibrary.sortMetricsBy).toBeVisible();
  await expect(adsLibrary.minDaysRunningInput).toBeVisible();
  await expect(adsLibrary.orderDescButton).toBeVisible();
  await expect(adsLibrary.kaaiButton).toBeVisible();
  await expect(adsLibrary.selectButton).toBeVisible();
});

// ─── Test 2: Scroll loads more cards; total Y stays constant, loaded X grows ──
test('Ads Library - scrolling loads more cards while total count stays unchanged', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const { loaded: loadedBefore, total: totalBefore } = await adsLibrary.getResultsLoadedAndTotal();
  console.log(`Before scroll: ${loadedBefore} of ${totalBefore} ads`);

  // Scroll the virtuoso ad grid down to trigger the next batch load
  const scroller = adsLibrary.adsLibraryContent.locator('.virtualized-ad-grid-scroller');
  await scroller.evaluate(el => el.scrollBy({ top: 80000, behavior: 'instant' }));

  // Wait until the "X of Y ads" loaded count (X) increases
  await expect.poll(
    async () => (await adsLibrary.getResultsLoadedAndTotal()).loaded,
    { timeout: 15000 }
  ).toBeGreaterThan(loadedBefore);

  const { loaded: loadedAfter, total: totalAfter } = await adsLibrary.getResultsLoadedAndTotal();
  console.log(`After scroll:  ${loadedAfter} of ${totalAfter} ads`);

  // Total must never change
  expect(totalAfter).toBe(totalBefore);
  // Loaded batch must have grown
  expect(loadedAfter).toBeGreaterThan(loadedBefore);
});
