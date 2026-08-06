import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';
import { Collections } from '../../../../pages/collections';
import { startCapturingClipboardWrites, waitForClipboardWrite } from '../../../../pages/clipboard';

let myAds, collections;
const createdCollections = [];

// The All tab throughout — it is Meta + Draft combined, and Select applies to both.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  collections = new Collections(page);
  await myAds.navigate();
});

test.afterEach(async () => {
  if (!createdCollections.length) return;
  await collections.navigate().catch(() => {});
  for (const name of createdCollections.splice(0)) {
    await collections.search(name).catch(() => {});
    await collections.deleteCollectionByName(name).catch(() => {});
  }
});

// Saves the current selection into a brand-new collection. A fresh one each time makes the
// resulting ad count exact.
async function saveSelectionIntoNewCollection(name) {
  await myAds.addToCollectionButton.click();
  await collections.waitForSaveToCollectionModal();
  await collections.clickNewCollectionInSaveModal();
  await collections.createAndAddCollectionInline(name);
  createdCollections.push(name);
}

// Copies an ad's ID through its 3-dot menu. Used on BOTH sides of the comparison so the value
// is read the same way each time. Names cannot be used: saving to a collection re-labels the ad
// with the merchant name, so the collection shows a different title from My Ads.
async function copyIdViaMenu(page, trigger) {
  await startCapturingClipboardWrites(page);
  await trigger.click();
  await myAds.cardMenuCopyIdItem.click();
  return waitForClipboardWrite(page);
}

// ─── Test 1: Select enables checkbox mode and the selection toolbar ───────────
test('My Ads - Select enables checkbox mode on the cards and shows the selection toolbar', async () => {
  await myAds.enterSelectMode();

  await expect(myAds.tapToSelectText).toBeVisible();
  await expect(myAds.addToCollectionButton).toBeVisible();
  await expect(myAds.kaaiCoverageButton).toBeVisible();
  await expect(myAds.cancelSelectionButton).toBeVisible();

  // Every rendered card gains a checkbox
  expect(await myAds.cardCheckboxes.count()).toBe(await myAds.adCards.count());
});

// ─── Test 2: selecting three cards reports the right count ────────────────────
test('My Ads - selecting 3 cards shows "3 selected"', async () => {
  await myAds.enterSelectMode();

  for (let i = 0; i < 3; i++) await myAds.toggleCardSelection(i);

  expect(await myAds.getSelectedCount()).toBe(3);
  // ...and all three tick boxes are actually filled
  expect(await myAds.selectedCardCheckboxes.count()).toBe(3);
});

// ─── Test 3: deselecting decrements the count ─────────────────────────────────
test('My Ads - deselecting a card decrements the selected count', async () => {
  await myAds.enterSelectMode();

  for (let i = 0; i < 3; i++) await myAds.toggleCardSelection(i);
  expect(await myAds.getSelectedCount()).toBe(3);

  await myAds.toggleCardSelection(0);

  expect(await myAds.getSelectedCount()).toBe(2);
  expect(await myAds.isCardSelected(0), 'card 0 should be unchecked').toBe(false);
  expect(await myAds.selectedCardCheckboxes.count()).toBe(2);
});

// ─── Test 4: Add to Collection is disabled with nothing selected ──────────────
test('My Ads - Add to Collection is disabled when no cards are selected', async () => {
  await myAds.enterSelectMode();

  expect(await myAds.getSelectedCount()).toBe(0);
  await expect(myAds.addToCollectionButton).toBeDisabled();

  // ...and enabled as soon as something is picked
  await myAds.toggleCardSelection(0);
  await expect(myAds.addToCollectionButton).toBeEnabled();
});

// ─── Test 5: Cancel exits select mode and clears the selection ────────────────
test('My Ads - Cancel exits select mode, restores the normal view and clears selections', async () => {
  await myAds.enterSelectMode();
  await myAds.toggleCardSelection(0);
  await myAds.toggleCardSelection(1);
  expect(await myAds.getSelectedCount()).toBe(2);

  await myAds.exitSelectMode();

  await expect(myAds.selectButton).toBeVisible();
  await expect(myAds.cancelSelectionButton).not.toBeVisible();
  expect(await myAds.cardCheckboxes.count()).toBe(0);

  // Re-entering starts from a clean slate
  await myAds.enterSelectMode();
  expect(await myAds.getSelectedCount()).toBe(0);
});

// ─── Test 6: the Save to Collection popup lists the collections ───────────────
test('My Ads - Add to Collection popup lists collections with counts and a New Collection option', async () => {
  await myAds.enterSelectMode();
  await myAds.toggleCardSelection(0);
  await myAds.addToCollectionButton.click();

  await collections.waitForSaveToCollectionModal();

  await expect(collections.saveToCollectionModal).toContainText('Save to Collection');
  await expect(collections.saveToCollectionModalSubtitle).toContainText(/Adding 1 ad/);
  await expect(collections.saveToCollectionModalSubtitle).toContainText(/collections available/);
  await expect(collections.saveToCollectionNewCollectionBtn).toBeVisible();

  // Every row states its size: "N ads" for a populated collection, "Empty board" for an empty one
  const rows = await collections.saveToCollectionItem.allInnerTexts();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row, `row does not state a count: ${row}`).toMatch(/\d+ ads?|Empty board/);
  }
});

// ─── Test 7: saving 2 selected ads lands both in the collection ───────────────
test('My Ads - Add to Collection saves every selected ad, verified by Ad ID', async ({ page }) => {
  // Copy both Ad IDs before entering select mode
  const expectedIds = [];
  for (const i of [0, 1]) {
    expectedIds.push(await copyIdViaMenu(page, myAds.cardMenuTrigger(i)));
  }

  await myAds.enterSelectMode();
  await myAds.toggleCardSelection(0);
  await myAds.toggleCardSelection(1);
  expect(await myAds.getSelectedCount()).toBe(2);

  const name = `selectmode-save-2 ${Date.now()}`;
  await saveSelectionIntoNewCollection(name);

  await collections.navigate();
  await collections.search(name);
  await collections.openCollectionByName(name);

  expect(await collections.getDetailAdCount()).toBe(2);

  // Same logic on the collection side — copy each card's ID from its own 3-dot menu
  const savedIds = [];
  for (const i of [0, 1]) {
    savedIds.push(await copyIdViaMenu(page, collections.detailAdMenuTrigger(i)));
  }

  expect(savedIds.sort()).toEqual(expectedIds.sort());
});

// ─── Test 8: "+ New Collection" creates the collection and saves into it ──────
test('My Ads - "+ New Collection" creates a collection holding the selected ad', async () => {
  await myAds.enterSelectMode();
  await myAds.toggleCardSelection(0);

  const name = `selectmode-new-collection ${Date.now()}`;
  await saveSelectionIntoNewCollection(name);

  await collections.navigate();
  await collections.search(name);

  await expect(collections.getCardByName(name).first()).toBeVisible();
  await collections.openCollectionByName(name);
  expect(await collections.getDetailAdCount()).toBe(1);
});


