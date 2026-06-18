import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

// ─── Test 1: Input type enforces numeric-only input ──────────────────────────
test('Min Days Running - input type is number, which enforces rejection of alphabets', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // type="number" is the browser-level enforcement that silently rejects alphabets
  await expect(adsLibrary.minDaysRunningInput).toHaveAttribute('type', 'number');
});

// ─── Test 2: Negative numbers should be rejected (currently a bug — negatives are accepted) ───
test('Min Days Running - negative number is rejected, value should not go below 0', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Use pressSequentially to simulate real key presses (fill() throws on type=number for non-integers)
  await adsLibrary.minDaysRunningInput.click();
  await adsLibrary.minDaysRunningInput.pressSequentially('-10');
  await adsLibrary.minDaysRunningInput.press('Enter');

  const value = await adsLibrary.minDaysRunningInput.inputValue();
  console.log('Input value after typing "-10":', JSON.stringify(value));

  // min="0" attribute is on the field — negative values should be rejected
  expect(value === '' || parseInt(value) == 0).toBe(true);
});

// ─── Test 3: Extremely large number shows empty state, no crash ───────────────
test('Min Days Running - entering 99999 shows empty state gracefully, no crash', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.minDaysRunningInput.pressSequentially('99999');
  await adsLibrary.minDaysRunningInput.press('Enter');
  await adsLibrary.waitForFilter();
  await page.waitForTimeout(2000);

  console.log('Entered 99999 — expecting empty state');
  await expect(adsLibrary.emptyState).toBeVisible();
});

// ─── Test 4: Valid number is accepted ─────────────────────────────────────────
test('Min Days Running - valid number is accepted and filters results', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalCount = await adsLibrary.getResultsCount();

  await adsLibrary.minDaysRunningInput.pressSequentially('30');
  await adsLibrary.minDaysRunningInput.press('Enter');
  await adsLibrary.waitForFilter();

  const filteredCount = await adsLibrary.getResultsCount();
  console.table({ totalCount, filteredCount });

  expect(filteredCount).toBeLessThanOrEqual(totalCount);
});
