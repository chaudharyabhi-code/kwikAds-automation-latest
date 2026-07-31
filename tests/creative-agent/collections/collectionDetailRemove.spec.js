import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

test.describe.serial('Collection detail view — Remove from Collection (destructive)', () => {
  let collections;
  let adCountAtStart = 0;

  // Finding a collection that actually contains ads means opening collections one by
  // one, which is too slow to repeat per test — so it happens once here.
  let withAds = -1;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300000);
    const ctx  = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await ctx.newPage();
    try {
      await new KwiksAdsCreativeAgent(page).goto();
      const c = new Collections(page);
      await c.navigate();
      withAds = (await c.scanCollectionsOnce()).withAds;
      console.log('collection with ads ->', withAds);
    } finally {
      await ctx.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(withAds === -1, 'No collection with at least one ad to remove from');

    await new KwiksAdsCreativeAgent(page).goto();
    collections = new Collections(page);
    await collections.navigate();
    await collections.openCollection(withAds);
  });

  test('Confirming "Remove from Collection" removes the ad and decrements the count by 1', async () => {
    adCountAtStart = await collections.getDetailAdCount();

    await collections.enterDetailSelectionMode();
    await collections.selectAdInDetail(0);
    await collections.clickRemoveFromCollection();
    await collections.confirmRemoveFromCollection();

    await expect(collections.removeAdsModal).not.toBeVisible();

    const countAfter = await collections.getDetailAdCount();
    expect(countAfter).toBe(adCountAtStart - 1);
  });

});
