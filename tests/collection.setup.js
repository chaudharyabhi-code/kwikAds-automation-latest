import { test as setup, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../pages/kwikads';
import { AdsLibrary } from '../pages/ads-library';
import { Collections } from '../pages/collections';

/**
 * Precondition for the Collections and Select-mode tests: a collection that actually
 * CONTAINS at least one ad must exist. Without one they skip with
 * "No collection available to save into" / "No collection with at least one ad".
 *
 * Creating an empty collection is not enough, so this seeds through the flow that does both
 * at once: Ads Library → card menu → Save to Collection → + New Collection → Create & Add.
 *
 * Idempotent: if a populated collection already exists this costs one page load.
 */
setup('seed a collection containing ads', async ({ page }) => {
  setup.setTimeout(300000);

  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  const adsLibrary = new AdsLibrary(page);

  await collections.navigate();
  if (await collections.findCardIndexWithAds(1) !== -1) {
    console.log('a collection with ads already exists — nothing to seed');
    return;
  }

  const name = `playwright-seed-collection ${Date.now()}`;
  console.log(`no populated collection found — creating "${name}" with one ad`);

  await adsLibrary.navigateToAdsLibrary();
  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Save to Collection');
  await collections.waitForSaveToCollectionModal();
  await collections.clickNewCollectionInSaveModal();
  await collections.createAndAddCollectionInline(name);

  await collections.navigate();
  expect(
    await collections.findCardIndexWithAds(1),
    'seeding ran but still no collection contains an ad'
  ).toBeGreaterThan(-1);
});
