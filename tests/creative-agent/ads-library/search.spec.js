import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

let adsLibrary;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
});

// The Library ID is DISCOVERED at runtime — open the first ad's modal, read its ID, close
// it, then search for that ID.
test.describe('Search by a Library ID taken from the first ad', () => {
  let libraryId;

  test.beforeEach(async () => {
    libraryId = await adsLibrary.getFirstAdLibraryId();
    expect(libraryId).toMatch(/^\d+$/);

    await adsLibrary.searchAd(libraryId);
    await adsLibrary.waitForFilter();
  });

  test('Searching a Library ID returns exactly one ad', async () => {
    const { total } = await adsLibrary.getResultsLoadedAndTotal();
    expect(total).toBe(1);
  });

  test('The returned ad has the same Library ID that was searched for', async () => {
    await adsLibrary.openFirstCardDetail();

    expect(await adsLibrary.getCardDetailLibraryId()).toBe(libraryId);

    await adsLibrary.closeCardDetail();
  });
});

test('Search with non-existent term returns empty state', async ({ page }) => {
  await adsLibrary.searchAd('xyzabc123nonexistent');
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.emptyState).toBeVisible();
  await expect(adsLibrary.emptyState).toHaveText('No ads found matching your search');
});

test('Search with 200+ character string does not break page', async ({ page }) => {
  const longQuery  = 'a'.repeat(210);

  await adsLibrary.searchAd(longQuery);
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.searchInputBox).toBeVisible();
  await expect(adsLibrary.emptyState).toBeVisible();
  await expect(adsLibrary.emptyState).toHaveText('No ads found matching your search');
});

test('pressing Enter in search bar triggers search without clicking the search icon', async () => {
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

test('partial Library ID search returns matching results', async () => {
  // Take a real ID from the grid and search only its first 6 digits
  const libraryId = await adsLibrary.getFirstAdLibraryId();

  await adsLibrary.searchAd(libraryId.slice(0, 6));
  await adsLibrary.waitForFilter();

  const count = await adsLibrary.getResultsCount();
  expect(count).toBeGreaterThan(0);
});

test('clearing search input restores full unfiltered results', async () => {
  const totalBefore = await adsLibrary.getResultsCount();

  // Any real query will do here — the behaviour under test is the clear button
  await adsLibrary.searchAd(await adsLibrary.getFirstCardBrandName());
  await adsLibrary.waitForFilter();

  // Clear via the × button — should auto-restore results without pressing Enter
  await adsLibrary.searchClearBtn.click();
  await adsLibrary.waitForFilter();

  const totalAfterClear = await adsLibrary.getResultsCount();
  expect(totalAfterClear).toBe(totalBefore);
});

test('numeric-only search returns results or empty state without crash', async () => {
  await adsLibrary.searchAd('12');

  // Wait for either results or empty state to appear — whichever the server returns
  await expect(adsLibrary.resultsCount.or(adsLibrary.emptyState)).toBeVisible({ timeout: 15000 });
});