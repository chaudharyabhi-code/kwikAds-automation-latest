import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

let myAds;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});

// ─── Test 1: All 3 sub-tabs visible and All is active by default ──────────────
test('My Ads - All 3 sub-tabs are visible and All tab is active by default', async () => {
  // All 3 sub-tabs must be visible
  await expect(myAds.subTabAll).toBeVisible();
  await expect(myAds.subTabMeta).toBeVisible();
  await expect(myAds.subTabDraft).toBeVisible();

  // "All" must be the selected tab — its parent label carries ant-segmented-item-selected
  await expect(myAds.activeSubTab).toBeVisible();
  await expect(myAds.activeSubTab).toContainText('All');

  // Only one tab can be active at a time
  await expect(myAds.activeSubTab).toHaveCount(1);
});

// ─── Test 2: Meta Creatives sub-tab filters and highlights correctly ───────────
test('My Ads - clicking Meta Creatives sub-tab shows filtered results with updated count', async () => {
  // Capture total count from All tab before switching
  const { total: allTotal } = await myAds.getResultsLoadedAndTotal();

  // Click Meta Creatives sub-tab
  await myAds.clickSubTab(myAds.subTabMeta);

  // Meta Creatives tab must now be highlighted as active
  await expect(myAds.activeSubTab).toContainText('Meta Creatives');
  await expect(myAds.activeSubTab).toHaveCount(1);

  // Results count must update and be a positive number
  const { total: metaTotal } = await myAds.getResultsLoadedAndTotal();
  expect(metaTotal).toBeGreaterThan(0);

  // Meta Creatives is a subset of All — count must not exceed total
  expect(metaTotal).toBeLessThanOrEqual(allTotal);

  console.log(`All: ${allTotal} | Meta Creatives: ${metaTotal}`);
});

// ─── Test 3: Draft Creatives sub-tab shows filtered results or empty state ─────
test('My Ads - clicking Draft Creatives sub-tab shows only draft ads or empty state', async () => {
  // Click Draft Creatives sub-tab
  await myAds.clickSubTab(myAds.subTabDraft);

  // Draft Creatives tab must now be highlighted as active
  await expect(myAds.activeSubTab).toContainText('Draft Creatives');
  await expect(myAds.activeSubTab).toHaveCount(1);

  // Get the updated count
  const { total: draftTotal } = await myAds.getResultsLoadedAndTotal();

  console.log(`Draft Creatives total: ${draftTotal}`);

  if (draftTotal === 0) {
    // No draft ads exist — empty state must be visible, card list must not be present.
    // toHaveCount(0), not (1): adCardList is the virtuoso CONTAINER, and "not present"
    // means zero of them. The old toHaveCount(1) asserted the container still existed,
    // which contradicts the comment and fails exactly when the empty state is correct.
    await expect(myAds.emptyState).toBeVisible();
    await expect(myAds.adCardList).toHaveCount(0);
  } else {
    // Draft ads exist — card list must be visible and count is positive
    await expect(myAds.adCardList).toBeVisible();
    expect(draftTotal).toBeGreaterThan(0);
  }
});



// ─── Test 4: All count = Meta Creatives count + Draft Creatives count ──────────
test('My Ads - All sub-tab count equals Meta Creatives count plus Draft Creatives count', async () => {
  const { total: allTotal } = await myAds.getResultsLoadedAndTotal();

  await myAds.clickSubTab(myAds.subTabMeta);
  const { total: metaTotal } = await myAds.getResultsLoadedAndTotal();

  await myAds.clickSubTab(myAds.subTabDraft);
  const { total: draftTotal } = await myAds.getResultsLoadedAndTotal();

  console.table({ allTotal, metaTotal, draftTotal, sum: metaTotal + draftTotal });

  expect(metaTotal + draftTotal).toBe(allTotal);
});

// ─── Test 5: Draft Creatives disables Status, launch date, min days filters ─────
test('My Ads - Draft Creatives tab disables Status, launch date, and min days running filters', async () => {
  // On All tab — the three filters must be interactive (not disabled)
  await expect(myAds.statusFilter).not.toHaveClass(myAds.DISABLED_SELECT_CLASS);
  await expect(myAds.launchDateRange).not.toHaveClass(myAds.DISABLED_PICKER_CLASS);
  await expect(myAds.minDaysInput).not.toBeDisabled();

  // Switch to Draft Creatives
  await myAds.clickSubTab(myAds.subTabDraft);
  await expect(myAds.activeSubTab).toContainText('Draft Creatives');

  // Status filter (Ant Design Select) — disabled class added to wrapper
  await expect(myAds.statusFilter).toHaveClass(myAds.DISABLED_SELECT_CLASS);

  // Launch date range (Ant Design RangePicker) — disabled class added to wrapper
  await expect(myAds.launchDateRange).toHaveClass(myAds.DISABLED_PICKER_CLASS);

  // Min days running (native number input) — HTML disabled attribute set
  await expect(myAds.minDaysInput).toBeDisabled();
});

// ─── Test 6: Draft Creatives Sort By dropdown shows only "Recently Added" ───────
test('My Ads - Draft Creatives Sort By dropdown shows only Recently Added option', async ({ page }) => {
  // Switch to Draft Creatives
  await myAds.clickSubTab(myAds.subTabDraft);
  await expect(myAds.activeSubTab).toContainText('Draft Creatives');

  // Open the Sort By dropdown
  await myAds.sortByFilter.click();

  // Ant Design renders dropdown options in a portal at body level — the page object
  // resolves the one that is actually open (closed ones stay in the DOM hidden).

  // "Recently Added" must be the only option
  await expect(myAds.openDropdownOptions).toHaveCount(1);
  await expect(myAds.openDropdownOptionContents).toContainText('Recently Added');

  // Performance/engagement options must not be available on Draft tab
  const hiddenOptions = ['Spend', 'Orders', 'CTR', 'Conversion Rate', 'Longest Running'];
  for (const label of hiddenOptions) {
    await expect(myAds.openDropdownOptionByText(label)).toHaveCount(0);
  }

  // Close the dropdown
  await page.keyboard.press('Escape');
});

// ─── Test 7: Draft Creatives empty state shows correct message with zero count ───
test('My Ads - Draft Creatives empty state shows correct message when no drafts exist', async () => {
  // Switch to Draft Creatives
  await myAds.clickSubTab(myAds.subTabDraft);
  await expect(myAds.activeSubTab).toContainText('Draft Creatives');

  const { total: draftTotal } = await myAds.getResultsLoadedAndTotal();

  if (draftTotal > 0) {
    console.log(`Draft total is ${draftTotal} — draft ads exist in this environment; empty state cannot be tested`);
    return;
  }

  // Count must be zero
  expect(draftTotal).toBe(0);

  // Empty state message must be visible
  await expect(myAds.emptyState).toBeVisible();

  // Page must remain stable — My Ads tab and filters are still rendered
  await expect(myAds.myAdsTab).toBeVisible();
  await expect(myAds.subTabDraft).toBeVisible();

  // Ad card list must not render any cards — zero virtuoso containers, not one.
  await expect(myAds.adCardList).toHaveCount(0);

  console.log('Empty state correctly displayed for Draft Creatives with 0 ads');
});
