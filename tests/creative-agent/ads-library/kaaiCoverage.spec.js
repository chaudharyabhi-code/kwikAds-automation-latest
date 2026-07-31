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
  await adsLibrary.openKaaiCoveragePopover();
});

// ─── Test 1: KAAI % button opens popover with correct sections ────────────────
test('KAAI Coverage - clicking KAAI % button opens popover with Analyzed, Pending, Total', async () => {
  await expect(adsLibrary.kaaiCoveragePopover).toContainText('KAAI Coverage');
  await expect(adsLibrary.kaaiCoveragePopover).toContainText('Hook formulas analyzed');
  await expect(adsLibrary.kaaiCoveragePopover).toContainText('Analyzed');
  await expect(adsLibrary.kaaiCoveragePopover).toContainText('Pending');
  await expect(adsLibrary.kaaiCoveragePopover).toContainText('Total');
});

// ─── Test 2: Analyzed + Pending = Total ───────────────────────────────────────
test('KAAI Coverage - Analyzed + Pending equals Total in popover', async () => {
  const { analyzed, pending, total } = await adsLibrary.getKaaiCoverageStats();

  console.table({ analyzed, pending, total, sum: analyzed + pending });
  expect(analyzed + pending).toBe(total);
});

// ─── Test 3: % on button = round(Analyzed / Total * 100) ─────────────────────
test('KAAI Coverage - percentage on button matches Analyzed / Total ratio', async () => {
  const { analyzed, total, percentage } = await adsLibrary.getKaaiCoverageStats();

  const expectedPct = Math.round((analyzed / total) * 100);
  console.table({ analyzed, total, expectedPct, displayedPct: percentage });
  expect(percentage).toBe(expectedPct);
});

// ─── Test 4: Popover values are global — unchanged after applying a filter ────
test('KAAI Coverage - popover values stay the same after applying Status filter', async ({ page }) => {
  const statsBefore = await adsLibrary.getKaaiCoverageStats();
  // Close popover by pressing Escape
  await page.keyboard.press('Escape');

  await adsLibrary.selectStatus('Active Ads');

  await adsLibrary.openKaaiCoveragePopover();
  const statsAfter = await adsLibrary.getKaaiCoverageStats();

  console.table({ statsBefore, statsAfter });
  expect(statsAfter.analyzed).toBe(statsBefore.analyzed);
  expect(statsAfter.pending).toBe(statsBefore.pending);
  expect(statsAfter.total).toBe(statsBefore.total);
});

// ─── Test 5: Clicking outside closes the popover ─────────────────────────────
test('KAAI Coverage - clicking outside the popover closes it', async () => {
  await expect(adsLibrary.kaaiCoveragePopover).toBeVisible();

  // Click a neutral element outside the popover
  await adsLibrary.searchInputBox.click();

  await expect(adsLibrary.kaaiCoveragePopover).not.toBeVisible();
});

// ─── Test 6a: "KAAI Analysed" filter count matches the popover's Analyzed ─────
test('KAAI Coverage - KAAI Analysed filter count equals the popover Analyzed value', async ({ page }) => {
  // Ground truth from the popover
  const { analyzed } = await adsLibrary.getKaaiCoverageStats();
  await page.keyboard.press('Escape');

  await adsLibrary.selectKaaiOption('KAAI Analysed');
  const analysedFilterCount = await adsLibrary.getResultsCount();

  console.log(`Popover Analyzed: ${analyzed} | KAAI Analysed filter count: ${analysedFilterCount}`);
  expect(analysedFilterCount).toBe(analyzed);
});

// ─── Test 6b: "Not Analysed" filter count matches the popover's Pending ───────
test('KAAI Coverage - Not Analysed filter count equals the popover Pending value', async ({ page }) => {
  // Ground truth from the popover
  const { pending } = await adsLibrary.getKaaiCoverageStats();
  await page.keyboard.press('Escape');

  await adsLibrary.selectKaaiOption('Not Analysed');
  const notAnalysedFilterCount = await adsLibrary.getResultsCount();

  console.log(`Popover Pending: ${pending} | Not Analysed filter count: ${notAnalysedFilterCount}`);
  expect(notAnalysedFilterCount).toBe(pending);
});
