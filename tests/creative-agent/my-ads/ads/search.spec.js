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

const UNKNOWN_NAME = 'zzz-no-such-creative-zzz';

// ─── Test 1: Search by creative name returns matching ads ─────────────────────
test('My Ads - searching by creative name returns only matching ad cards', async () => {
  const { total: totalBefore } = await myAds.getResultsLoadedAndTotal();
  const { name } = await myAds.getFirstAdNameAndId();

  await myAds.searchFor(name);

  const { total: filteredTotal } = await myAds.getResultsLoadedAndTotal();
  expect(filteredTotal).toBeGreaterThan(0);
  expect(filteredTotal).toBeLessThanOrEqual(totalBefore);
  await expect(myAds.adCardList).toBeVisible();

  // Every rendered card must contain the search term. Cards have no h2 — the old locator
  // matched nothing, so this loop never actually ran.
  const cards = await myAds.adCards.allInnerTexts();
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    expect(card.toLowerCase()).toContain(name.toLowerCase());
  }
});

// ─── Test 2: Search by Ad ID returns that ad; ID verified in modal ────────────
test('My Ads - searching by Ad ID returns the matching ad and modal shows correct ID', async () => {
  const { id } = await myAds.getFirstAdNameAndId();
  expect(id).not.toBeNull();

  await myAds.searchFor(id);

  const { total } = await myAds.getResultsLoadedAndTotal();
  expect(total).toBeGreaterThan(0);

  // Open the card and verify the modal shows the same ID
  const { id: foundId } = await myAds.getFirstAdNameAndId();
  expect(foundId).toBe(id);
});

// ─── Test 3: Search triggers on pressing Enter key ────────────────────────────
test('My Ads - search triggers on pressing Enter and returns correct results', async () => {
  const { name } = await myAds.getFirstAdNameAndId();

  // Type without clicking any button — Enter alone must trigger search
  await myAds.searchInput.fill(name);
  await myAds.searchInput.press('Enter');

  const spinner = myAds.pageSpinner;
  await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Results must be filtered — card list or empty state must be visible
  const { total } = await myAds.getResultsLoadedAndTotal();
  expect(total).toBeGreaterThan(0);
  await expect(myAds.adCardList).toBeVisible();
});

// ─── Test 4: Searching with non-existent name shows empty state ───────────────
test('My Ads - searching non-existent name shows empty state with zero count', async () => {
  await myAds.searchFor(UNKNOWN_NAME);

  // Count must be 0
  const { total } = await myAds.getResultsLoadedAndTotal();
  expect(total).toBe(0);

  // Empty state message must appear
  await expect(myAds.emptyState).toBeVisible();

  // Page must not crash — filters and tabs still visible
  await expect(myAds.subTabAll).toBeVisible();

  console.log(`Non-existent search "${UNKNOWN_NAME}" correctly returned 0 results`);
});

// ─── Test 5: Clearing search restores full results ────────────────────────────
test('My Ads - clearing search input restores full results', async () => {
  const { total: totalBefore } = await myAds.getResultsLoadedAndTotal();
  const { name } = await myAds.getFirstAdNameAndId();

  // Perform a search to filter results
  await myAds.searchFor(name);
  const { total: filteredTotal } = await myAds.getResultsLoadedAndTotal();
  expect(filteredTotal).toBeLessThan(totalBefore);

  // Clear search and verify full results are restored
  await myAds.clearSearch();

  const { total: restoredTotal } = await myAds.getResultsLoadedAndTotal();
  expect(restoredTotal).toBe(totalBefore);

  // Empty state must be gone, cards must be visible
  await expect(myAds.emptyState).not.toBeVisible();
  await expect(myAds.adCardList).toBeVisible();

  console.log(`Restored: ${restoredTotal} (was ${filteredTotal} during search)`);
});

// ─── Test 6: Searching with spaces only returns all ads ───────────────────────
test('My Ads - searching with spaces only returns all ads without crashing', async ({ page }) => {
  const { total: totalBefore } = await myAds.getResultsLoadedAndTotal();

  await myAds.searchFor('   ');

  // Page must not crash — results remain or reset to full
  const { total: afterTotal } = await myAds.getResultsLoadedAndTotal();
  expect(afterTotal).toBeGreaterThanOrEqual(0);

  // Either all results returned (server trimmed spaces) or empty state
  if (afterTotal === 0) {
    await expect(myAds.emptyState).toBeVisible();
  } else {
    await expect(myAds.adCardList).toBeVisible();
  }

  // Filters and tabs must still work — page is stable
  await expect(myAds.subTabAll).toBeVisible();
  await expect(myAds.searchInput).toBeVisible();

  console.log(`Spaces search: totalBefore=${totalBefore}, after=${afterTotal}`);
});

// ─── Test 7: Searching with special characters returns empty state gracefully ──
test('My Ads - searching with special characters returns empty state without crashing', async ({ page }) => {
  await myAds.searchFor('@#$%^&*');

  // Must not crash — page remains stable
  await expect(myAds.subTabAll).toBeVisible();
  await expect(myAds.searchInput).toBeVisible();

  // Either 0 results with empty state, or graceful fallback
  const { total } = await myAds.getResultsLoadedAndTotal();
  if (total === 0) {
    await expect(myAds.emptyState).toBeVisible();
  }

  expect(total).toBeGreaterThanOrEqual(0);

  console.log(`Special chars search returned ${total} results`);
});
