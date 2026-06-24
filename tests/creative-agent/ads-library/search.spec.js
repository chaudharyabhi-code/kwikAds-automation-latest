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

test('pressing Enter in search bar triggers search without clicking the search icon', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalBefore = await adsLibrary.getResultsCount();
  const brandName = await adsLibrary.getFirstCardBrandName();

  // Type brand name and press Enter only — do NOT click any search icon
  await adsLibrary.searchInputBox.fill(brandName);
  await adsLibrary.searchInputBox.press('Enter');
  await adsLibrary.waitForFilter();

  const filteredCount = await adsLibrary.getResultsCount();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(totalBefore);
});

test('partial Library ID search returns matching results', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const partialId = process.env.SEARCHABLE_LIBRARY_ID.slice(0, 6);
  await adsLibrary.searchAd(partialId);
  await page.waitForLoadState('networkidle');

  const count = await adsLibrary.getResultsCount();
  expect(count).toBeGreaterThan(0);
  await expect(adsLibrary.resultsCount).toBeVisible();
});

test('clearing search input restores full unfiltered results', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalBefore = await adsLibrary.getResultsCount();

  await adsLibrary.searchAd(process.env.SEARCHABLE_LIBRARY_ID);
  await adsLibrary.waitForFilter();

  // Clear via the × button — should auto-restore results without pressing Enter
  await adsLibrary.searchClearBtn.click();
  await adsLibrary.waitForFilter();

  const totalAfterClear = await adsLibrary.getResultsCount();
  expect(totalAfterClear).toBe(totalBefore);
});

test('numeric-only search returns results or empty state without crash', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.searchAd('12');

  // Wait for either results or empty state to appear — whichever the server returns
  await expect(adsLibrary.resultsCount.or(adsLibrary.emptyState)).toBeVisible({ timeout: 15000 });
});