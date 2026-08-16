import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds, VIEW_DATA_BY_TABS, PERF_COLUMNS, PERF_DEFAULTS } from '../../../../pages/my-ads';
import { AdsLibrary } from '../../../../pages/ads-library';

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});

// ─── Test 1: the Performance tab becomes active and its view loads ────────────
test('My Ads - clicking Performance activates the tab and loads the performance view', async () => {
  expect(await myAds.getActiveViewMode()).toContain('Ads');

  await myAds.openPerformanceView();

  expect(await myAds.getActiveViewMode()).toContain('Performance');
  // The Ads card grid is replaced by the performance table
  await expect(myAds.perfTable).toBeVisible();
  await expect(myAds.adCards.first()).not.toBeVisible();

  for (const tab of VIEW_DATA_BY_TABS) {
    await expect(myAds.viewDataByTab(tab)).toBeVisible();
  }
});

// ─── Test 2: every expected element is present ────────────────────────────────
test('My Ads - Performance page loads with search, filters, VIEW DATA BY tabs, table and count', async () => {
  await myAds.openPerformanceView();

  await expect(myAds.perfSearchInput).toBeVisible();
  await expect(myAds.statusFilter).toBeVisible();
  await expect(myAds.perfFormatFilter).toBeVisible();
  await expect(myAds.qualityRankingFilter).toBeVisible();
  await expect(myAds.engagementRankingFilter).toBeVisible();
  await expect(myAds.conversionRankingFilter).toBeVisible();
  await expect(myAds.sortByFilter).toBeVisible();
  await expect(myAds.perfOrderButton).toBeVisible();
  await expect(myAds.perfDateRange).toBeVisible();

  for (const tab of VIEW_DATA_BY_TABS) {
    await expect(myAds.viewDataByTab(tab)).toBeVisible();
  }

  await expect(myAds.perfResultsCount).toBeVisible();
  for (const column of PERF_COLUMNS) {
    await expect(myAds.perfTable, `column "${column}" missing`).toContainText(column);
  }
});

// ─── Test 3: returning to Ads restores the card grid ──────────────────────────
test('My Ads - clicking Ads from Performance returns to the card grid', async () => {
  await myAds.openPerformanceView();
  expect(await myAds.getActiveViewMode()).toContain('Performance');

  await myAds.openAdsView();

  expect(await myAds.getActiveViewMode()).toContain('Ads');
  await expect(myAds.searchInput).toBeVisible();
  await expect(myAds.adCards.first()).toBeVisible();
  await expect(myAds.perfTable).not.toBeVisible();
});

// ─── Test 4: default filter state on load ─────────────────────────────────────
test('My Ads - Performance opens with STATUS Active, FORMAT All, SORT BY Spend, ORDER Desc', async () => {
  await myAds.openPerformanceView();

  expect(await myAds.getSelectValue(myAds.statusFilter)).toBe(PERF_DEFAULTS.status);
  expect(await myAds.getSelectValue(myAds.perfFormatFilter)).toBe(PERF_DEFAULTS.format);
  expect(await myAds.getSelectValue(myAds.sortByFilter)).toBe(PERF_DEFAULTS.sortBy);
  await expect(myAds.perfOrderButton).toContainText(PERF_DEFAULTS.order);

  // A date range is pre-filled rather than left blank
  const dates = await myAds.perfDateRange.locator('input').evaluateAll(
    inputs => inputs.map(i => i.value));
  expect(dates.filter(Boolean).length, `date range is empty: ${JSON.stringify(dates)}`).toBe(2);

  // Ad Level is the active VIEW DATA BY tab
  expect(await myAds.isViewDataByTabActive('Ad Level')).toBe(true);
});


// ─── Test 5: filters are not retained after navigating away ───────────────────
test('My Ads - leaving Performance and returning restores the default filters', async ({ page }) => {
  // Three full page transitions on top of the login+merchant beforeEach — it ran out of the
  // 120s budget mid-assertion rather than failing on one.
  test.slow();

  await myAds.openPerformanceView();

  // Change the defaults so a retained state would be obvious
  await myAds.selectStatus('Paused');
  await myAds.selectSortBy('Orders');
  expect(await myAds.getSelectValue(myAds.statusFilter)).toBe('Paused');

  // Away to the Ad Library, then back to My Ads → Performance
  await new AdsLibrary(page).navigateToAdsLibrary();
  await myAds.navigate();
  await myAds.openPerformanceView();

  // Soft, so one run reports every retained filter instead of stopping at the first
  expect.soft(await myAds.getSelectValue(myAds.statusFilter), 'STATUS').toBe(PERF_DEFAULTS.status);
  expect.soft(await myAds.getSelectValue(myAds.sortByFilter), 'SORT BY').toBe(PERF_DEFAULTS.sortBy);
  expect.soft(await myAds.getSelectValue(myAds.perfFormatFilter), 'FORMAT').toBe(PERF_DEFAULTS.format);
  await expect.soft(myAds.perfOrderButton, 'ORDER').toContainText(PERF_DEFAULTS.order);
});
