import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

test('Search Ad by Library ID', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.searchAd(process.env.SEARCHABLE_LIBRARY_ID);
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.resultsCount).toBeVisible();
});

test('Search with non-existent term returns empty state', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.searchAd('xyzabc123nonexistent');
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.emptyState).toBeVisible();
  await expect(adsLibrary.emptyState).toHaveText('No ads found matching your search');
});

test('Search with 200+ character string does not break page', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
  const longQuery  = 'a'.repeat(210);

  await adsLibrary.searchAd(longQuery);
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.searchInputBox).toBeVisible();
  await expect(adsLibrary.emptyState).toBeVisible();
  await expect(adsLibrary.emptyState).toHaveText('No ads found matching your search');
});