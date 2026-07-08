import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../../pages/kwikads';
import { MyAds } from '../../../../../pages/my-ads';

// ─── Test 1: KAAI Analysed filter count matches popover Analyzed value ────────
test('My Ads - KAAI filter: KAAI Analysed filter count matches Analyzed count in KAAI coverage popover', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  // Read ground-truth Analyzed count from the popover
  await myAds.openKaaiCoveragePopover();
  const { analyzed } = await myAds.getKaaiCoverageStats();
  await page.keyboard.press('Escape');

  // Apply KAAI Analysed filter
  await myAds.selectKaaiOption('KAAI Analysed');
  const { total: filteredTotal } = await myAds.getResultsLoadedAndTotal();

  console.table({ 'Popover Analyzed': analyzed, 'Filter count': filteredTotal });
  expect(filteredTotal).toBe(analyzed);

  // All visible cards must have the purple (analysed) KAAI button
  const analysedButtons    = await myAds.kaaiAnalysedCardButtons.count();
  const notAnalysedButtons = await myAds.kaaiNotAnalysedCardButtons.count();
  expect(analysedButtons).toBeGreaterThan(0);
  expect(notAnalysedButtons).toBe(0);
});

// ─── Test 2: Not Analysed filter count matches popover Pending value ──────────
test('My Ads - KAAI filter: Not Analysed filter count matches Pending count in KAAI coverage popover', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  // Read ground-truth Pending count from the popover
  await myAds.openKaaiCoveragePopover();
  const { pending } = await myAds.getKaaiCoverageStats();
  await page.keyboard.press('Escape');

  // Apply Not Analysed filter
  await myAds.selectKaaiOption('Not Analysed');
  const { total: filteredTotal } = await myAds.getResultsLoadedAndTotal();

  console.table({ 'Popover Pending': pending, 'Filter count': filteredTotal });
  expect(filteredTotal).toBe(pending);

  // All visible cards must have the not-analysed (white/transparent) KAAI button
  const notAnalysedButtons = await myAds.kaaiNotAnalysedCardButtons.count();
  const analysedButtons    = await myAds.kaaiAnalysedCardButtons.count();
  expect(notAnalysedButtons).toBeGreaterThan(0);
  expect(analysedButtons).toBe(0);
});

// ─── Test 3: All = KAAI Analysed + Not Analysed ───────────────────────────────
test('My Ads - KAAI filter: All count equals KAAI Analysed count plus Not Analysed count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  const { total: allCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectKaaiOption('KAAI Analysed');
  const { total: analysedCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectKaaiOption('Not Analysed');
  const { total: notAnalysedCount } = await myAds.getResultsLoadedAndTotal();

  console.table({ allCount, analysedCount, notAnalysedCount, sum: analysedCount + notAnalysedCount });
  expect(analysedCount + notAnalysedCount).toBe(allCount);
});
