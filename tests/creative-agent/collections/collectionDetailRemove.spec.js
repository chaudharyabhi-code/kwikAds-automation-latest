import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// Uses the first user-created collection (index 1).
// Test 11 removes 1 ad and records how many ads were there before.
const USER_CARD = 1;

test.describe.serial('Collection detail view — Remove from Collection (destructive)', () => {
  let adCountAtStart = 0;

  test('Confirming "Remove from Collection" removes the ad and decrements the count by 1', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);
    await collections.navigate();
    await collections.openCollection(USER_CARD);

    adCountAtStart = await collections.getDetailAdCount();
    if (adCountAtStart === 0) test.skip(true, 'Collection has no ads — nothing to remove');

    await collections.enterDetailSelectionMode();
    await collections.selectAdInDetail(0);
    await collections.clickRemoveFromCollection();
    await collections.confirmRemoveFromCollection();

    await expect(collections.removeAdsModal).not.toBeVisible();

    const countAfter = await collections.getDetailAdCount();
    expect(countAfter).toBe(adCountAtStart - 1);
  });

});
