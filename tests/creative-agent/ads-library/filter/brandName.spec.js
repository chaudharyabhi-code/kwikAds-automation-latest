import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

test('Brand Name filter - selecting first brand filters results correctly', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.brandNameFilter.click();
  await adsLibrary.brandDropdownOptions.first().waitFor({ state: 'visible' });

  const firstOption    = adsLibrary.brandDropdownOptions.first();
  const optionText     = await firstOption.innerText();
  const expectedCount  = optionText.split('(')[1].split(')')[0];

  await firstOption.click();
  await adsLibrary.searchInputBox.click();
  await page.waitForLoadState('networkidle');

  const actualCount = String(await adsLibrary.getResultsCount());
  expect(actualCount).toBe(expectedCount);
});

test('Brand Name filter - multi-select 3 brands shows combined count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.brandNameFilter.click();
  await adsLibrary.brandDropdownOptions.first().waitFor({ state: 'visible' });

  let expectedTotal = 0;
  for (let i = 0; i < 3; i++) {
    const option     = adsLibrary.brandDropdownOptions.nth(i);
    const optionText = await option.innerText();
    expectedTotal   += parseInt(optionText.split('(')[1].split(')')[0]);
    await option.click();
    await adsLibrary.waitForFilter();
  }

  await adsLibrary.searchInputBox.click();
  await page.waitForLoadState('networkidle');

  const actualCount = await adsLibrary.getResultsCount();
  console.table({ expectedTotal, actualCount });
  expect(actualCount).toBe(expectedTotal);
});

test('Brand Name filter - searching non-existent brand shows empty list', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.searchBrandDropdown('xyznonexistentbrand123');

  await expect(adsLibrary.brandDropdownNoData).toBeVisible();
  await expect(adsLibrary.brandDropdownOptions).toHaveCount(0);
});

test('Brand Name filter - dropdown ad count matches actual filtered results', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.brandNameFilter.click();
  await adsLibrary.brandDropdownOptions.first().waitFor({ state: 'visible' });

  // Use 2nd option (first is covered by the existing single-brand test)
  const option = adsLibrary.brandDropdownOptions.nth(1);
  const title = await option.getAttribute('title'); // e.g. "mynykaa (1894)"
  const expectedCount = parseInt(title.match(/\((\d+)\)/)[1]);

  await option.click();
  await adsLibrary.searchInputBox.click(); // close dropdown
  await adsLibrary.waitForFilter();

  const actualCount = await adsLibrary.getResultsCount();
  expect(actualCount).toBe(expectedCount);
});

test('Brand Name filter - deselecting all selected brands restores full results', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalBefore = await adsLibrary.getResultsCount();

  // Select 2 brands
  await adsLibrary.brandNameFilter.click();
  await adsLibrary.brandDropdownOptions.first().waitFor({ state: 'visible' });
  await adsLibrary.brandDropdownOptions.nth(0).click();
  await adsLibrary.waitForFilter();
  await adsLibrary.brandDropdownOptions.nth(1).click();
  await adsLibrary.waitForFilter();
  await adsLibrary.searchInputBox.click(); // close dropdown
  await adsLibrary.waitForFilter();

  // Verify filtering reduced the count
  expect(await adsLibrary.getResultsCount()).toBeLessThan(totalBefore);

  // Deselect via the × tag buttons directly on the select input
  const removeBtn = adsLibrary.brandNameFilter.locator('.ant-select-selection-item-remove');
  while ((await removeBtn.count()) > 0) {
    await removeBtn.first().click();
    await adsLibrary.waitForFilter();
  }

  expect(await adsLibrary.getResultsCount()).toBe(totalBefore);
  await expect(adsLibrary.brandNameFilter.locator('.ant-select-selection-placeholder')).toBeVisible();
});

test('Brand Name filter - selecting all visible brands does not crash the page', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.brandNameFilter.click();
  await adsLibrary.brandDropdownOptions.first().waitFor({ state: 'visible' });

  const totalOptions = await adsLibrary.brandDropdownOptions.count();
  for (let i = 0; i < totalOptions; i++) {
    await adsLibrary.brandDropdownOptions.nth(i).click();
    await adsLibrary.waitForFilter();
  }

  await adsLibrary.searchInputBox.click(); // close dropdown
  await adsLibrary.waitForFilter();

  // Page must remain functional with all visible brands selected
  await expect(adsLibrary.adsLibraryContent).toBeVisible();
  await expect(adsLibrary.resultsCount).toBeVisible();
  expect(await adsLibrary.getResultsCount()).toBeGreaterThan(0);
});
