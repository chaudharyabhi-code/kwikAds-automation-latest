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
