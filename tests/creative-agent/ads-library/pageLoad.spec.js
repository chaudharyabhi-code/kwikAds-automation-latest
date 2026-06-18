import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

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
