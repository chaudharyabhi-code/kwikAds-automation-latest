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
    if (await collections.getCardByName(SEED_NAME).count() === 0) {
      console.log(`creating collection "${SEED_NAME}"`);
      await collections.openNewCollectionModal();
      await collections.createCollection(SEED_NAME);
    } else {
      console.log(`collection "${SEED_NAME}" already exists`);
    }

    // Save an ad into it. Done as its own step rather than relying on "Create & Add", which
    // left the collection at 0 ads. Re-saving an already-saved ad is harmless.
    await adsLibrary.navigateToAdsLibrary();
    await adsLibrary.openFirstCardMenu();
    await adsLibrary.clickCardMenuOption('Save to Collection');
    await collections.waitForSaveToCollectionModal();
    await collections.clickSaveToCollectionRow(SEED_NAME);
    console.log(`saved one ad into "${SEED_NAME}"`);
  } catch (error) {
    console.warn(`collection seeding did not complete: ${error.message}`);
    console.warn('collection-dependent tests will fall back to their own skip guards');
  }
});
