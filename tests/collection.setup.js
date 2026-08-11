import { test as setup } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../pages/kwikads';
import { AdsLibrary } from '../pages/ads-library';
import { Collections } from '../pages/collections';

const SEED_NAME = 'playwright-seeded-with-ad';

/**
 * Precondition for the Collections and Select-mode tests: a collection that actually CONTAINS
 * an ad. Without one they skip with "No collection available to save into" /
 * "No collection with at least one ad".
 *
 * BEST EFFORT BY DESIGN. The whole `chromium` project depends on this setup, so anything it
 * throws blocks every unrelated test in the suite — which is exactly what happened when an
 * earlier version timed out. Failures here are logged and swallowed; the specs' own guards
 * handle a merchant that could not be seeded.
 *
 * Existence is checked BY NAME, not by opening collections: the previous version called
 * findCardIndexWithAds(), which opens each collection in turn and blew the 300s budget.
 */
setup('seed a collection containing ads', async ({ page }) => {
  setup.setTimeout(180000);

  try {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);
    const adsLibrary = new AdsLibrary(page);

    await collections.navigate();
    // Search before deciding: the grid paginates, so a bare name filter reported "not found"
    // for a seed that already existed on a later page. The create then hit the duplicate-name
    // error toast, the modal stayed open, this setup timed out — and every collection spec
    // fell through to its own skip guard.
    await collections.search(SEED_NAME);
    if (await collections.getCardByName(SEED_NAME).count() === 0) {
      console.log(`creating collection "${SEED_NAME}"`);
      await collections.search('');
      await collections.openNewCollectionModal();
      await collections.createCollection(SEED_NAME);
    } else {
      console.log(`collection "${SEED_NAME}" already exists`);
      await collections.search('');
    }

    // Save TWO ads into it — the detail-view multi-select test needs 2+ and used to skip
    // itself on a single-ad seed.
    //
    // Via Select mode, not the card 3-dot menu: the menu path saves one ad per modal round
    // trip, and the second round trip is where this failed — the menu reopened but the Save
    // to Collection modal never came back, leaving the seed at one ad. Select mode saves both
    // in a single modal interaction. Re-saving an already-saved ad is harmless.
    await adsLibrary.navigateToAdsLibrary();
    await adsLibrary.enterSelectMode();
    await adsLibrary.selectAdCards(2);
    await adsLibrary.openAddToCollectionModal();
    await collections.clickSaveToCollectionRow(SEED_NAME);
    console.log(`saved two ads into "${SEED_NAME}"`);
  } catch (error) {
    console.warn(`collection seeding did not complete: ${error.message}`);
    console.warn('collection-dependent tests will fall back to their own skip guards');
  }
});
