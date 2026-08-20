import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';
import { Collections } from '../../../pages/collections';

let adsLibrary;
let createdCollection = null;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
});

// Remove any collection a test created. No-op for the tests that create none.
test.afterEach(async ({ page }) => {
  if (!createdCollection) return;
  const name = createdCollection;
  createdCollection = null;
  const collections = new Collections(page);
  await collections.navigate().catch(() => {});
  await collections.deleteCollectionByName(name).catch(() => {});
});

// ─── Test 1: Clicking Select enters selection mode ────────────────────────────
test('Select mode - clicking Select button shows Add to Collection, KAAI %, and Cancel in toolbar', async () => {
  await adsLibrary.enterSelectMode();

  // Toolbar changes: Cancel, Add to Collection, KAAI % all appear
  await expect(adsLibrary.cancelSelectionButton).toBeVisible();
  await expect(adsLibrary.addToCollectionButton).toBeVisible();
  await expect(adsLibrary.kaaiCoverageButton).toBeVisible();

  // Select button itself is no longer visible
  await expect(adsLibrary.selectButton).not.toBeVisible();
});

// ─── Test 2: Selecting a card updates the count ───────────────────────────────
test('Select mode - clicking an ad card shows "1 selected" in the count text', async () => {
  await adsLibrary.enterSelectMode();
  await adsLibrary.selectFirstAdCard();

  const countText = await adsLibrary.selectionCountText.innerText();
  console.log('Selection count text:', countText);

  expect(countText).toMatch(/^1 selected/);
});

// ─── Test 3: Selecting multiple cards shows correct count ─────────────────────
test('Select mode - selecting 3 ad cards shows "3 selected" in the count text', async () => {
  await adsLibrary.enterSelectMode();
  
  const countText = await adsLibrary.selectAdCards(3);

  console.log('Selection count text after 3 selections:', countText);
  expect(countText).toMatch(/^3 selected/);
});

// ─── Test 4: Cancel exits selection mode ─────────────────────────────────────
test('Select mode - clicking Cancel exits selection mode and restores Select button', async () => {
  await adsLibrary.enterSelectMode();
  await adsLibrary.exitSelectMode();

  // Back to normal state
  await expect(adsLibrary.selectButton).toBeVisible();
  await expect(adsLibrary.cancelSelectionButton).not.toBeVisible();
  await expect(adsLibrary.addToCollectionButton).not.toBeVisible();
});

// ─── Test 5: Add to Collection disabled when no cards selected ────────────────
test('Select mode - Add to Collection button is disabled when no cards are selected', async () => {
  await adsLibrary.enterSelectMode();

  // No cards selected — button must be disabled (confirmed via DevTools: disabled attribute present)
  await expect(adsLibrary.addToCollectionButton).toBeDisabled();
});

// ─── Test 6: Deselecting a card decrements the count ─────────────────────────
test('Select mode - clicking a selected card deselects it and decrements count to 2', async () => {
  await adsLibrary.enterSelectMode();
  await adsLibrary.selectAdCards(3);

  const countBefore = await adsLibrary.selectionCountText.innerText();
  console.log('Count after selecting 3 cards:', countBefore);
  expect(countBefore).toMatch(/^3 selected/);

  // Click the first card in the grid again — in select mode this toggles selection
  await adsLibrary.getRowCardBodies(0)
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
// A BRAND-NEW collection, not the first existing one. Saving the library's first two ads into a
// shared collection only adds two the first time: the merchant keeps its collections between runs,
// so on the next run one of those ads is already there, the app rejects the duplicate, and the
// count rises by 1 — which reported as "saves 2 ads" failing (expected 15, received 14). An empty
// collection makes the delta exactly 2 every time.
test('Add to Collection - saves 2 selected ads and collection count increases by 2', async ({ page }) => {
  // ── Step 1: Create an empty collection to save into ─────────────────────────
  const collections = new Collections(page);
  const collectionName = `selectmode-add-2 ${Date.now()}`;
  await collections.navigate();
  // createCollection only fills and submits — the modal has to be opened first
  await collections.openNewCollectionModal();
  await collections.createCollection(collectionName);
  createdCollection = collectionName;

  const countBefore = 0;
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
  // Search and open BY NAME: the grid paginates and reorders as collections are created, so
  // "the first card" is not the one we just made.
  await collections.navigate();
  await collections.search(collectionName);
  await collections.openCollectionByName(collectionName);

  const countAfter = await collections.getDetailAdCount();

  console.table({
    collectionName,
    'count before':   countBefore,
    'count after':    countAfter,
    'expected after': countBefore + 2,
  });

  // Collection must contain 2 more ads than before
  expect(countAfter).toBe(countBefore + 2);
});

// ─── Test 8: the modal's per-collection ad count matches reality ──────────────
// Split out from the save flow above: this is a separate behaviour (the count the
// modal displays) and is non-destructive — the modal is closed without saving.
test('Add to Collection - modal shows the collection\'s actual current ad count', async ({ page }) => {
  // Actual count, read from the collection itself
  await adsLibrary.navigateToCollections();
  // No skip guard: this spec runs in the chromium-collections project, which depends on
  // collection-setup, so a collection is guaranteed to exist. The old guard read the card
  // count before the grid had rendered and skipped on a merchant that had dozens;
  // openFirstCollectionCard() waits for the grid and reports a real failure if it stays empty.
  await adsLibrary.openFirstCollectionCard();
  const collectionName = await adsLibrary.getOpenCollectionName();
  const actualCount    = await adsLibrary.getOpenCollectionAdCount();

  // Count as advertised by the Save to Collection modal
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
  await adsLibrary.enterSelectMode();
  await adsLibrary.selectAdCards(2);
  await adsLibrary.openAddToCollectionModal();

  const countInModal = await adsLibrary.getCountForCollectionInModal(collectionName);
  console.log(`"${collectionName}" — modal shows ${countInModal}, actual is ${actualCount}`);

  expect(countInModal).toBe(actualCount);
});
