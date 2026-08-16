import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import {
  MyAds, MODAL_TABS, VIEW_DATA_BY_TABS, abbreviateMetric, normaliseMetric,
} from '../../../../pages/my-ads';
import { Collections } from '../../../../pages/collections';
import { startCapturingClipboardWrites, waitForClipboardWrite } from '../../../../pages/clipboard';

const GROUPED_TABS = ['Hook', 'Narration', 'Message Style', 'Visual Style'];

// Table column → the Performance Matrix tile that must repeat the same value.
// Impressions and Velocity are deliberately absent: the table abbreviates impressions ("1.6K")
// and the modal has no tile for either, so there is nothing to compare.
const ROW_TO_MODAL_METRIC = {
  'Ad Spends': 'AD SPEND',
  'ROAS': 'ROAS',
  'CTR': 'CLICK-THROUGH RATE',
  'Clicks': 'TOTAL CLICKS',
  'Orders': 'ORDERS GENERATED',
  'Revenue': 'REVENUE',
};

let myAds, collections;
let createdCollection = null;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  collections = new Collections(page);
  await myAds.navigate();
  await myAds.openPerformanceView();
});

// Remove any collection a test created. No-op for the tests that create none.
test.afterEach(async () => {
  if (!createdCollection) return;
  const name = createdCollection;
  createdCollection = null;
  await collections.navigate().catch(() => {});
  await collections.deleteCollectionByName(name).catch(() => {});
});

// ─── Ad Level ─────────────────────────────────────────────────────────────────
test('Performance Ad Level - the eye icon opens the ad detail modal for that creative', async () => {
  const rows = await myAds.getPerfRows();
  test.skip(rows.length === 0, 'No performance data for the default period');

  // Every row must offer the icon, not just the first
  expect(await myAds.perfEyeIcons.count(),
    'not every Ad Level row has an eye icon').toBe(await myAds.perfRows.count());

  await myAds.openPerfAdDetail(0);

  // The modal must be for the row that was clicked, not merely open
  await expect(myAds.modalAdName).toContainText(rows[0].name);
  await expect(myAds.modalAdIdRow).toBeVisible();
  for (const tab of MODAL_TABS) {
    await expect(myAds.modalTab(tab), `modal tab "${tab}" missing`).toBeVisible();
  }

  await myAds.closeAdDetailModal();
  await expect(myAds.adDetailModal).not.toBeVisible();
});

// ─── The four grouped tabs ────────────────────────────────────────────────────
// These list a collapsed group first ("Non KAAI · 18 ads") instead of individual creatives.
// The ads — and their eye icons — only exist once that group is expanded, so the flow is
// always: open the tab, expand the first group, then open the first ad underneath it.
for (const tab of GROUPED_TABS) {
  test(`Performance ${tab} - expanding the first group and clicking its eye icon opens the ad detail modal`, async () => {
    await myAds.openViewDataByTab(tab);
    expect(await myAds.isViewDataByTabActive(tab), `"${tab}" did not become the active tab`).toBe(true);

    if (await myAds.perfRows.count() === 0) {
      await expect(myAds.perfEmptyState,
        `"${tab}" rendered no rows and no empty state`).toBeVisible();
      return;
    }

    // Collapsed: no ad rows on show until the group is opened
    expect(await myAds.perfEyeIcons.count(),
      `"${tab}" already exposes ad rows before its group was expanded`).toBe(0);

    await myAds.expandPerfGroup(0);

    const ads = await myAds.getPerfAdRows();
    expect(ads.length, `expanding the first "${tab}" group revealed no ads`).toBeGreaterThan(0);

    await myAds.openPerfAdDetail(0);
    await expect(myAds.modalAdName).toContainText(ads[0].name);
    await expect(myAds.modalAdIdRow).toBeVisible();

    await myAds.closeAdDetailModal();
    await expect(myAds.adDetailModal).not.toBeVisible();
  });
}

// ─── Save to Collection from the Performance modal ────────────────────────────
// A brand-new collection each run is what makes "+1" provable: it goes 0 → 1 ads. Saving into
// a shared collection would not increment on a re-run, because the app rejects the same ad twice.
test('Performance Ad Level - Save to Collection from the modal adds the ad to the collection', async ({ page }) => {
  test.skip(await myAds.perfRows.count() === 0, 'No performance data for the default period');

  await myAds.openPerfAdDetail(0);
  // Identify the ad by Ad ID: saving to a collection renames it to the merchant name, so the
  // title cannot be matched on the other side.
  const adId = await myAds.getModalAdId();
  expect(adId, 'no Ad ID in the modal').not.toBeNull();

  const name = `perf-modal-save ${Date.now()}`;
  await myAds.modalSaveToCollectionBtn.click();
  await collections.waitForSaveToCollectionModal();
  await collections.clickNewCollectionInSaveModal();
  await collections.createAndAddCollectionInline(name);
  createdCollection = name;

  await expect(collections.adSavedToCollectionToast).toBeVisible({ timeout: 10000 });
  await myAds.closeAdDetailModal().catch(() => {});

  // Search rather than scanning: the collections list paginates, so a new collection is not
  // necessarily on the first page.
  await collections.navigate();
  await collections.search(name);
  await collections.openCollectionByName(name);

  expect(await collections.getDetailAdCount(), 'the collection did not gain exactly one ad').toBe(1);

  // Identity through the card's 3-dot "Copy ID", the same way selectMode.spec.js reads it.
  // Clicking the card inside a collection did not open a detail modal (detailAdItems matches a
  // wrapper, not the clickable surface), and the card's own title is no help — saving re-labels
  // the ad with the merchant name.
  await startCapturingClipboardWrites(page);
  await collections.detailAdMenuTrigger(0).click();
  await myAds.cardMenuCopyIdItem.click();
  expect(await waitForClipboardWrite(page), 'the collection holds a different ad').toBe(adId);
});

// ─── Performance Matrix parity, on every VIEW DATA BY tab ─────────────────────
// Same ad, two places: the modal's Performance Matrix must repeat what the row already showed.
// Row values are read BEFORE the modal opens — the modal covers the table, and a virtualised
// row can unmount while it is on screen.
for (const tab of VIEW_DATA_BY_TABS) {
  test(`Performance ${tab} - the modal's Performance Matrix matches the first row's metrics`, async () => {
    await myAds.openViewDataByTab(tab);

    if (await myAds.perfRows.count() === 0) {
      await expect(myAds.perfEmptyState).toBeVisible();
      return;
    }
    // The grouped tabs hide their ads behind a collapsed group row
    if (tab !== 'Ad Level') await myAds.expandPerfGroup(0);

    const rowMetrics = {};
    for (const column of Object.keys(ROW_TO_MODAL_METRIC)) {
      rowMetrics[column] = (await myAds.getPerfAdColumnValues(column))[0];
    }

    await myAds.openPerfAdDetail(0);
    // Open the tab, do not just assert it exists: a KAAI-analysed ad opens the modal on the KAAI
    // Analysis tab, leaving the Performance Matrix tiles unrendered so every metric read back
    // undefined. Poll for a tile so the assertions never race the tab switch.
    await myAds.openModalTab('Performance Matrix');
    await expect.poll(async () => Object.keys(await myAds.getModalMetrics()),
      { timeout: 15000 }).toContain('AD SPEND');

    const modalMetrics = await myAds.getModalMetrics();
    for (const [column, tile] of Object.entries(ROW_TO_MODAL_METRIC)) {
      const rowValue = rowMetrics[column];
      const modalValue = modalMetrics[tile];
      // Two ways the same number is written differently between the views, both of which count
      // as a match:
      //   grouping  — modal "₹2,27,040" vs row "₹227,040" (Indian vs plain), so compare with
      //               currency, commas and spaces stripped
      //   scale     — modal "2K" vs row "2,030" once the value passes a thousand
      const modal = normaliseMetric(modalValue);
      const matches = modal === normaliseMetric(rowValue)
        || modal === normaliseMetric(abbreviateMetric(rowValue));
      expect.soft(matches,
        `${tab}: modal "${tile}" is "${modalValue}", row "${column}" is "${rowValue}"`
        + ` (abbreviated: "${abbreviateMetric(rowValue)}")`).toBe(true);
    }

    await myAds.closeAdDetailModal();
  });
}
