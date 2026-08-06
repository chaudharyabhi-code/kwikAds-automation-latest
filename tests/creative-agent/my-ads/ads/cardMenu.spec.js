import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds, META_CARD_MENU, DRAFT_CARD_MENU } from '../../../../pages/my-ads';
import { startCapturingClipboardWrites, waitForClipboardWrite } from '../../../../pages/clipboard';
import { Collections } from '../../../../pages/collections';

let myAds, collections;
const createdCollections = [];


test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  collections = new Collections(page);
  await myAds.navigate();
});

// Remove collections a test created. No-op for the tests that create none.
test.afterEach(async () => {
  if (!createdCollections.length) return;
  await collections.navigate().catch(() => {});
  for (const name of createdCollections.splice(0)) {
    // Search first — the grid paginates, so a new collection may not be on page one
    await collections.search(name).catch(() => {});
    await collections.deleteCollectionByName(name).catch(() => {});
  }
});

// Reads the first card's ID from its detail modal, then closes the modal again — the value the
// menu's Copy action is expected to put on the clipboard.
async function readFirstAdId() {
  await myAds.openAdDetailModal(0);
  const id = await myAds.getModalAdId();
  await myAds.closeAdDetailModal();
  return id;
}

// ─── Meta Creatives: exactly 4 options, in order ──────────────────────────────
test('My Ads - Meta Creatives 3-dot menu shows exactly 4 options in order', async () => {
  await myAds.clickSubTab(myAds.subTabMeta);
  await myAds.openCardMenu(0);

  expect(await myAds.getCardMenuLabels()).toEqual(META_CARD_MENU);
});

// ─── Meta Creatives: Delete Draft must NOT be offered ─────────────────────────
test('My Ads - Meta Creatives 3-dot menu does not offer Delete Draft', async () => {
  await myAds.clickSubTab(myAds.subTabMeta);
  await myAds.openCardMenu(0);

  await expect(myAds.cardMenuItem('Delete Draft')).toHaveCount(0);
  await expect(myAds.cardMenuDangerItem).toHaveCount(0);
});

// ─── Draft Creatives: exactly 5 options, Delete Draft destructive ─────────────
test('My Ads - Draft Creatives 3-dot menu shows exactly 5 options with Delete Draft marked destructive', async () => {
  await myAds.clickSubTab(myAds.subTabDraft);
  test.skip((await myAds.getResultsLoadedAndTotal()).total === 0, 'No draft creatives on this merchant');
  await myAds.openCardMenu(0);

  expect(await myAds.getCardMenuLabels()).toEqual(DRAFT_CARD_MENU);
  // Ant's -item-danger class is what renders it red
  await expect(myAds.cardMenuDangerItem).toContainText('Delete Draft');
});

// ─── Label discrepancy: "Copy Ad ID" (Meta) vs "Copy ID" (Draft) ──────────────
// Documents the CURRENT wording so a change is caught. Whether the difference is intentional
// (a draft has no published Meta ad id) is a product question, not something a test can settle.
test('My Ads - Copy label differs between Meta ("Copy Ad ID") and Draft ("Copy ID")', async () => {
  await myAds.clickSubTab(myAds.subTabMeta);
  await myAds.openCardMenu(0);
  const metaLabels = await myAds.getCardMenuLabels();
  await myAds.closeCardMenu();

  await myAds.clickSubTab(myAds.subTabDraft);
  test.skip((await myAds.getResultsLoadedAndTotal()).total === 0, 'No draft creatives on this merchant');
  await myAds.openCardMenu(0);
  const draftLabels = await myAds.getCardMenuLabels();

  expect(metaLabels).toContain('Copy Ad ID');
  expect(draftLabels).toContain('Copy ID');
  expect(draftLabels).not.toContain('Copy Ad ID');
});

// ─── Copy Ad ID on a Meta creative ────────────────────────────────────────────
test('My Ads - "Copy Ad ID" on a Meta creative copies that ad\'s ID', async ({ page }) => {
  await myAds.clickSubTab(myAds.subTabMeta);
  const adId = await readFirstAdId();
  expect(adId, 'no Ad ID in the modal').not.toBeNull();

  await startCapturingClipboardWrites(page);
  await myAds.openCardMenu(0);
  await myAds.cardMenuItem('Copy Ad ID').click();

  expect(await waitForClipboardWrite(page)).toBe(adId);
});

// ─── Copy ID on a draft creative ──────────────────────────────────────────────
test('My Ads - "Copy ID" on a draft creative copies that draft\'s ID', async ({ page }) => {
  await myAds.clickSubTab(myAds.subTabDraft);
  test.skip((await myAds.getResultsLoadedAndTotal()).total === 0, 'No draft creatives on this merchant');

  const draftId = await readFirstAdId();
  expect(draftId, 'no ID in the draft modal').not.toBeNull();

  await startCapturingClipboardWrites(page);
  await myAds.openCardMenu(0);
  await myAds.cardMenuItem('Copy ID').click();

  expect(await waitForClipboardWrite(page)).toBe(draftId);
});

// ─── Clicking outside closes the menu, on both tabs ───────────────────────────
test('My Ads - clicking outside closes the 3-dot menu on both tabs', async ({ page }) => {
  for (const tab of [myAds.subTabMeta, myAds.subTabDraft]) {
    await myAds.clickSubTab(tab);
    if ((await myAds.getResultsLoadedAndTotal()).total === 0) continue;

    await myAds.openCardMenu(0);
    await expect(myAds.cardMenuItems.first()).toBeVisible();

    await page.mouse.click(5, 5);   // well clear of the card and the menu

    await expect(myAds.cardMenuItems.first()).not.toBeVisible();
    // Nothing was triggered — no modal opened
    await expect(myAds.adDetailModal).not.toBeVisible();
  }
});

// ─── Share Creative opens the share modal, on both tabs ───────────────────────
test('My Ads - "Share Creative" opens the share modal on both tabs', async () => {
  for (const tab of [myAds.subTabMeta, myAds.subTabDraft]) {
    await myAds.clickSubTab(tab);
    if ((await myAds.getResultsLoadedAndTotal()).total === 0) continue;

    await myAds.openCardMenu(0);
    await myAds.cardMenuItem('Share Creative').click();

    await expect(myAds.sharePopup).toBeVisible();
    await myAds.sharePopupCloseBtn.click();
    await expect(myAds.sharePopup).not.toBeVisible();
  }
});

// Saves the first card into a BRAND-NEW collection via the 3-dot menu. A fresh collection each
// time is what proves the save landed — saving into a shared one would not.
async function saveFirstCardIntoNewCollection(name) {
  await myAds.openCardMenu(0);
  await myAds.cardMenuItem('Save to Collection').click();

  await collections.waitForSaveToCollectionModal();
  await collections.clickNewCollectionInSaveModal();
  await collections.createAndAddCollectionInline(name);
  createdCollections.push(name);

  await expect(collections.adSavedToCollectionToast).toBeVisible({ timeout: 10000 });
}

// ─── Save to Collection from a Meta creative ──────────────────────────────────
test('My Ads - "Save to Collection" saves a Meta creative into a collection', async () => {
  await myAds.clickSubTab(myAds.subTabMeta);
  test.skip((await myAds.getResultsLoadedAndTotal()).total === 0, 'No Meta creatives on this merchant');

  await saveFirstCardIntoNewCollection(`cardmenu-save-meta ${Date.now()}`);
});

// ─── Save to Collection from a Draft creative ─────────────────────────────────
test('My Ads - "Save to Collection" saves a Draft creative into a collection', async () => {
  await myAds.clickSubTab(myAds.subTabDraft);
  test.skip((await myAds.getResultsLoadedAndTotal()).total === 0, 'No draft creatives on this merchant');

  await saveFirstCardIntoNewCollection(`cardmenu-save-draft ${Date.now()}`);
});

// ─── Delete Draft opens a confirmation, and Cancel keeps the draft ────────────
// Must run BEFORE the confirm test below, which deletes the draft — hence the file's
// sequential mode.
test('My Ads - "Delete Draft" opens a confirmation and Cancel leaves the draft in place', async () => {
  await myAds.clickSubTab(myAds.subTabDraft);
  const { total: before } = await myAds.getResultsLoadedAndTotal();
  test.skip(before === 0, 'No draft creatives on this merchant');

  await myAds.openCardMenu(0);
  await myAds.cardMenuItem('Delete Draft').click();

  await expect(myAds.deleteDraftModal).toBeVisible();
  await expect(myAds.deleteDraftCancelBtn).toBeVisible();
  await expect(myAds.deleteDraftConfirmBtn).toBeVisible();

  await myAds.deleteDraftCancelBtn.click();

  await expect(myAds.deleteDraftModal).not.toBeVisible();
  expect((await myAds.getResultsLoadedAndTotal()).total).toBe(before);
});

// ─── Delete Draft confirm permanently removes the draft ───────────────────────
// DESTRUCTIVE and LAST: it deletes a real draft, so every draft test above it must already
// have run. With no drafts left the ones above skip until more are created.
test('My Ads - "Delete Draft" confirm permanently removes the draft and decrements the count', async () => {
  await myAds.clickSubTab(myAds.subTabDraft);
  const { total: before } = await myAds.getResultsLoadedAndTotal();
  test.skip(before === 0, 'No draft creatives left to delete');

  await myAds.openCardMenu(0);
  await myAds.cardMenuItem('Delete Draft').click();
  await expect(myAds.deleteDraftModal).toBeVisible();

  await myAds.deleteDraftConfirmBtn.click();

  await expect(myAds.deleteDraftModal).not.toBeVisible();
  // Poll: the count is repainted by a refetch that lands after the modal closes
  await expect
    .poll(async () => (await myAds.getResultsLoadedAndTotal()).total, { timeout: 15000 })
    .toBe(before - 1);
});
