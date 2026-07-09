import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

// ─── Test 1: KAAI % button opens popover with correct fields ─────────────────
test('My Ads - KAAI Coverage: clicking KAAI % button opens popover with Analyzed, Pending, Total', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.openKaaiCoveragePopover();

  await expect(myAds.kaaiCoveragePopover).toContainText('KAAI Coverage');
  await expect(myAds.kaaiCoveragePopover).toContainText('Hook formulas analyzed');
  await expect(myAds.kaaiCoveragePopover).toContainText('Analyzed');
  await expect(myAds.kaaiCoveragePopover).toContainText('Pending');
  await expect(myAds.kaaiCoveragePopover).toContainText('Total');
});

// ─── Test 2: Analyzed + Pending = Total ──────────────────────────────────────
test('My Ads - KAAI Coverage: Analyzed plus Pending equals Total in popover', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.openKaaiCoveragePopover();
  const { analyzed, pending, total } = await myAds.getKaaiCoverageStats();

  console.table({ analyzed, pending, total, sum: analyzed + pending });
  expect(analyzed + pending).toBe(total);
});

// ─── Test 3: % on button = round(Analyzed / Total × 100) ─────────────────────
test('My Ads - KAAI Coverage: percentage on button matches Analyzed divided by Total ratio', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.openKaaiCoveragePopover();
  const { analyzed, total, percentage } = await myAds.getKaaiCoverageStats();

  const expectedPct = Math.round((analyzed / total) * 100);
  console.table({ analyzed, total, expectedPct, displayedPct: percentage });
  expect(percentage).toBe(expectedPct);
});

// ─── Test 4: Clicking outside popover closes it ───────────────────────────────
test('My Ads - KAAI Coverage: clicking outside the popover closes it', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.openKaaiCoveragePopover();
  await expect(myAds.kaaiCoveragePopover).toBeVisible();

  // Click a neutral element outside the popover
  await myAds.searchInput.click();

  await expect(myAds.kaaiCoveragePopover).not.toBeVisible();
});
