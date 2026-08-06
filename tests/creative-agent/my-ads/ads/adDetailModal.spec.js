import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import {
  MyAds, MODAL_TABS, MODAL_METRICS, MODAL_COMPETITOR_SIGNALS, MODAL_STATUS_BADGES,
} from '../../../../pages/my-ads';
import { startCapturingClipboardWrites, waitForClipboardWrite } from '../../../../pages/clipboard';
import { Collections } from '../../../../pages/collections';

let myAds, collections;
let createdCollection = null;

// Meta Creatives: drafts have no performance data, so a draft card would fail these on data.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  collections = new Collections(page);
  await myAds.navigate();
  await myAds.clickSubTab(myAds.subTabMeta);
});

// Remove any collection a test created. No-op for the tests that create none.
test.afterEach(async () => {
  if (!createdCollection) return;
  const name = createdCollection;
  createdCollection = null;
  await collections.navigate().catch(() => {});
  // Search first: the grid paginates, so deleteCollectionByName would not find a collection
  // that is not on the first page and cleanup would silently leave it behind.
  await collections.search(name).catch(() => {});
  await collections.deleteCollectionByName(name).catch(() => {});
});

// ─── Test 1: the modal opens with every section ───────────────────────────────
// KAAI = Not Analysed, because the "KAAI analysis" footer button only renders for an ad that
// has not been analysed yet.
test('My Ads - clicking a card opens the detail modal with all expected sections', async () => {
  await myAds.selectKaaiOption('Not Analysed');
  expect((await myAds.getResultsLoadedAndTotal()).total,
    'no un-analysed ads on this merchant — the "KAAI analysis" button cannot be shown')
    .toBeGreaterThan(0);

  await myAds.openAdDetailModal(0);

  await expect(myAds.modalAdName).toBeVisible();
  await expect(myAds.modalAdIdRow).toBeVisible();
  await expect(myAds.modalCopyIdIcon).toBeVisible();
  await expect(myAds.modalLaunchedDate).toBeVisible();
  await expect(myAds.modalActivePeriod).toBeVisible();
  await expect(myAds.modalFormats).toBeVisible();

  for (const tab of MODAL_TABS) {
    await expect(myAds.modalTab(tab)).toBeVisible();
  }

  await expect(myAds.modalSaveToCollectionBtn).toBeVisible();
  await expect(myAds.modalKaaiAnalysisBtn).toBeVisible();
});

// ─── Test 2: the modal badge matches the ad's status ──────────────────────────
test('My Ads - modal status badge reflects the ad status', async () => {
  for (const [status, badge] of Object.entries(MODAL_STATUS_BADGES)) {
    await test.step(`${status} → "${badge}"`, async () => {
      await myAds.selectStatus(status);
      if ((await myAds.getResultsLoadedAndTotal()).total === 0) return;

      await myAds.openAdDetailModal(0);
      await expect(myAds.adDetailModal).toContainText(badge);
      await myAds.closeAdDetailModal();
    });
  }
});

// ─── Test 3: Performance Matrix shows every metric ────────────────────────────
test('My Ads - Performance Matrix tab shows all metrics and Competitor Signals', async () => {
  await myAds.openAdDetailModal(0);
  await myAds.openModalTab('Performance Matrix');

  for (const metric of MODAL_METRICS) {
    await expect(myAds.modalText(metric)).toBeVisible();
  }

  await expect(myAds.modalText('Competitor Signals')).toBeVisible();
  for (const signal of MODAL_COMPETITOR_SIGNALS) {
    await expect(myAds.modalText(signal)).toBeVisible();
  }
});

// ─── Test 4: the copy icon copies the Ad ID ───────────────────────────────────
test('My Ads - copy icon copies the Ad ID shown in the modal', async ({ page }) => {
  await myAds.openAdDetailModal(0);

  const adId = await myAds.getModalAdId();
  expect(adId, 'no Ad ID found in the modal').not.toBeNull();

  await startCapturingClipboardWrites(page);
  await myAds.modalCopyIdIcon.click();

  expect(await waitForClipboardWrite(page)).toBe(adId);
});

// ─── Test 5: the KAAI Analysis tab loads content ──────────────────────────────
// KAAI = Analysed, so there is analysis to render rather than an empty state.
test('My Ads - KAAI Analysis tab loads its content', async () => {
  await myAds.selectKaaiOption('KAAI Analysed');
  const { total } = await myAds.getResultsLoadedAndTotal();
  test.skip(total === 0,
    'No KAAI-analysed ads on this merchant (KAAI coverage 0%) — no analysis exists to load');

  await myAds.openAdDetailModal(0);
  await myAds.openModalTab('KAAI Analysis');

  await expect(myAds.adDetailModal).toContainText(/KAAI Creative Analysis/i);
  await expect(myAds.adDetailModal).toContainText(/Summary/i);
});

// ─── Test 6: the Ad Copy Details tab shows the copy ───────────────────────────
test('My Ads - Ad Copy Details tab shows the ad copy', async () => {
  await myAds.openAdDetailModal(0);
  await myAds.openModalTab('Ad Copy Details');

  await expect(myAds.adDetailModal).toContainText(/Live Ad Caption Copy/i);
  await expect(myAds.adDetailModal).toContainText(/Copy caption/i);
});

// ─── Test 7: closing the modal restores the grid and its filters ──────────────
test('My Ads - closing the modal returns to My Ads with the filter intact', async () => {
  await myAds.selectStatus('Paused');
  const { total: before } = await myAds.getResultsLoadedAndTotal();

  await myAds.openAdDetailModal(0);
  await myAds.closeAdDetailModal();

  await expect(myAds.adDetailModal).not.toBeVisible();
  await expect(myAds.adCards.first()).toBeVisible();
  // The Paused filter must still be applied, with the same result count
  expect((await myAds.getResultsLoadedAndTotal()).total).toBe(before);
  await expect(myAds.cardStatusBadge(0)).toContainText('Paused');
});

// ─── Test 8: the KAAI analysis button switches to the KAAI tab ────────────────
// NOTE: this triggers a REAL analysis and moves the ad from Not Analysed to Analysed.
//
// Only the tab switch is asserted, not the loader. Clicking the footer button does show one,
// but a probe of the modal at 150ms/400ms/800ms/1.5s/3s found no element carrying
// spin/load/skeleton/progress in its class, aria-label or role — so there is no honest
// selector for it. The tab switch is the durable, verifiable outcome of the same click.
test('My Ads - KAAI analysis button switches the modal to the KAAI Analysis tab', async () => {
  await myAds.selectKaaiOption('Not Analysed');
  expect((await myAds.getResultsLoadedAndTotal()).total,
    'no un-analysed ads on this merchant — nothing to analyse').toBeGreaterThan(0);

  await myAds.openAdDetailModal(0);

  // An un-analysed ad offers both footer actions
  await expect(myAds.modalSaveToCollectionBtn).toBeVisible();
  await expect(myAds.modalKaaiAnalysisBtn).toBeVisible();
  expect(await myAds.getActiveModalTab()).toBe('Performance Matrix');

  await myAds.modalKaaiAnalysisBtn.click();

  await expect.poll(() => myAds.getActiveModalTab(), { timeout: 15000 }).toBe('KAAI Analysis');
});

/**
 * Saves the first `kaaiOption` ad into a brand-new collection using the modal's
 * "Save to Collection" button, and returns the ad's name.
 *
 * Reuses the existing "+ New Collection" inline flow, which creates the collection AND saves
 * the ad in one step. A FRESH collection each run is what makes "exactly 1 ad" hold — saving
 * the same ad into a shared collection twice would not increment it on a re-run.
 */
async function saveFirstAdIntoNewCollection(kaaiOption, collectionName) {
  await myAds.selectKaaiOption(kaaiOption);
  const { total } = await myAds.getResultsLoadedAndTotal();
  test.skip(total === 0, `No "${kaaiOption}" ads on this merchant — nothing to save`);

  await myAds.openAdDetailModal(0);
  // Identify the ad by Ad ID, not by title: the card title is truncated in the grid and is not
  // a unique identifier, whereas the ID is exact.
  const adId = await myAds.getModalAdId();
  expect(adId, 'no Ad ID in the modal').not.toBeNull();

  await myAds.modalSaveToCollectionBtn.click();
  await collections.waitForSaveToCollectionModal();
  await collections.clickNewCollectionInSaveModal();
  await collections.createAndAddCollectionInline(collectionName);
  createdCollection = collectionName;

  await expect(collections.adSavedToCollectionToast).toBeVisible({ timeout: 10000 });
  await myAds.closeAdDetailModal().catch(() => {});
  return adId;
}

async function expectCollectionHoldsOnly(collectionName, adId) {
  await collections.navigate();
  // Search rather than scanning the grid — the collections list paginates, so a newly created
  // collection is not necessarily rendered on the first page.
  await collections.search(collectionName);
  await collections.openCollectionByName(collectionName);

  expect(await collections.getDetailAdCount()).toBe(1);

  // Open the ad inside the collection and match on Ad ID. The card title alone is not proof of
  // identity — it is truncated in the grid and several ads can share a name.
  await collections.detailAdItems.first().click();
  await myAds.adDetailModal.waitFor({ state: 'visible', timeout: 15000 });
  expect(await myAds.getModalAdId()).toBe(adId);
}

// ─── Test 9: Save to Collection — un-analysed ad (footer has two buttons) ─────
test('My Ads - Save to Collection from the modal of a NOT ANALYSED ad adds it to the collection', async () => {
  const name = `modal-save-not-analysed ${Date.now()}`;
  await expectCollectionHoldsOnly(name, await saveFirstAdIntoNewCollection('Not Analysed', name));
});

// ─── Test 10: Save to Collection — analysed ad (footer has one button) ────────
test('My Ads - Save to Collection from the modal of a KAAI ANALYSED ad adds it to the collection', async () => {
  const name = `modal-save-analysed ${Date.now()}`;
  await expectCollectionHoldsOnly(name, await saveFirstAdIntoNewCollection('KAAI Analysed', name));
});
