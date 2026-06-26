import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// ─── Test 1: Clicking Select enters selection mode ────────────────────────────
test('Select mode - clicking Select button shows Add to Collection, KAAI %, and Cancel in toolbar', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();

  // Toolbar changes: Cancel, Add to Collection, KAAI % all appear
  await expect(adsLibrary.cancelSelectionButton).toBeVisible();
  await expect(adsLibrary.addToCollectionButton).toBeVisible();
  await expect(adsLibrary.kaaiCoverageButton).toBeVisible();

  // Select button itself is no longer visible
  await expect(adsLibrary.selectButton).not.toBeVisible();
});

// ─── Test 2: Selecting a card updates the count ───────────────────────────────
test('Select mode - clicking an ad card shows "1 selected" in the count text', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();
  await adsLibrary.selectFirstAdCard();

  const countText = await adsLibrary.selectionCountText.innerText();
  console.log('Selection count text:', countText);

  expect(countText).toMatch(/^1 selected/);
});

// ─── Test 3: Selecting multiple cards shows correct count ─────────────────────
test('Select mode - selecting 3 ad cards shows "3 selected" in the count text', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();
  
  const countText = await adsLibrary.selectAdCards(3);

  console.log('Selection count text after 3 selections:', countText);
  expect(countText).toMatch(/^3 selected/);
});

// ─── Test 4: Cancel exits selection mode ─────────────────────────────────────
test('Select mode - clicking Cancel exits selection mode and restores Select button', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();
  await adsLibrary.exitSelectMode();

  // Back to normal state
  await expect(adsLibrary.selectButton).toBeVisible();
  await expect(adsLibrary.cancelSelectionButton).not.toBeVisible();
  await expect(adsLibrary.addToCollectionButton).not.toBeVisible();
});

// ─── Test 5: Add to Collection disabled when no cards selected ────────────────
test('Select mode - Add to Collection button is disabled when no cards are selected', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();

  // No cards selected — button must be disabled (confirmed via DevTools: disabled attribute present)
  await expect(adsLibrary.addToCollectionButton).toBeDisabled();
});

// ─── Test 6: Deselecting a card decrements the count ─────────────────────────
test('Select mode - clicking a selected card deselects it and decrements count to 2', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();
  await adsLibrary.selectAdCards(3);

  const countBefore = await adsLibrary.selectionCountText.innerText();
  console.log('Count after selecting 3 cards:', countBefore);
  expect(countBefore).toMatch(/^3 selected/);

  // Click the first card in the grid again — in select mode this toggles selection
  await adsLibrary.adCardList
    .locator('[data-index="0"]')
    .locator('div[style*="rgb(255, 255, 255)"]')
    .first()
    .click({ force: true, position: { x: 100, y: 150 } });

  const countAfter = await adsLibrary.selectionCountText.innerText();
  console.log('Count after deselecting one card:', countAfter);

  expect(countAfter).toMatch(/^2 selected/);
});

// ─── Test 7: Add to Collection ────────────────────────────────────────────────
// Flow:
//   1. Open first collection → note actual ad count inside ("Showing X ads")
//   2. Return to Ad Library → select 2 cards → open Add to Collection modal
//   3. Note the count the modal shows for that collection (may differ — known bug)
//   4. Select the collection in the modal → navigate back to it
//   5. Assert count increased by exactly 2
test('Add to Collection - saves 2 selected ads and collection count increases by 2', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // ── Step 1: Record the actual ad count inside the first collection ──────────
  await adsLibrary.navigateToCollections();
  await adsLibrary.openFirstCollectionCard();

  const collectionName = await adsLibrary.getOpenCollectionName();
  const countBefore    = await adsLibrary.getOpenCollectionAdCount();
  console.log(`Target collection: "${collectionName}" | Ads before adding: ${countBefore}`);

  // ── Step 2: Return to Ad Library and select 2 ad cards ─────────────────────
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.enterSelectMode();
  await adsLibrary.selectAdCards(2);

  const selectionText = await adsLibrary.selectionCountText.innerText();
  console.log('Selection state:', selectionText);
  expect(selectionText).toMatch(/^2 selected/);

  // ── Step 3: Open modal and note the count it shows for the collection ───────
  await adsLibrary.openAddToCollectionModal();

  const countInModal = await adsLibrary.getCountForCollectionInModal(collectionName);
  console.log(`Modal shows "${collectionName}" has ${countInModal} ads (actual: ${countBefore})`);

  // ── Step 4: Select the same collection we noted by name ─────────────────────
  await adsLibrary.clickCollectionInModal(collectionName);

  // ── Step 5: Navigate to Collections → open same collection → verify count ───
  await adsLibrary.navigateToCollections();

  await adsLibrary.openFirstCollectionCard();

  const countAfter = await adsLibrary.getOpenCollectionAdCount();

  console.table({
    collectionName,
    'count before':            countBefore,
    'count in modal':          countInModal,
    'count after':             countAfter,
    'expected after':          countBefore + 2,
    'modal count is accurate': countInModal === countBefore,
  });

  // Primary assertion: collection must contain 2 more ads than before
  expect.soft(countAfter).toBe(countBefore + 2);

  // Bug report: modal count should match the actual count — flag if it doesn't
  if (countInModal !== countBefore) {
    console.warn(
      `Bug: "Save to Collection" modal shows ${countInModal} ads for "${collectionName}" ` +
      `but the collection actually had ${countBefore} ads before adding. ` +
      `This is a stale-count display bug in the modal.`
    );
  }
  expect.soft(countInModal).toBe(countBefore);
});
