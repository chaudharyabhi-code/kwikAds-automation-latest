import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

const NAME_ONLY    = 'playwright-test-name-only';
const NAME_AND_DESC = 'playwright-test-with-desc';

// All tests in this block create collections — serial ensures cleanup runs last.
test.describe.serial('Create new collection', () => {


  test('Description field is optional - create with board name only succeeds', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);
    await collections.navigate();

    const countBefore = await collections.getCollectionCount();

    await collections.openNewCollectionModal();
    await collections.createCollection(NAME_ONLY);

    await expect(collections.successToast).toBeVisible({ timeout: 10000 });
    await expect(collections.successToast).toContainText(NAME_ONLY);

    const countAfter = await collections.getCollectionCount();
    expect(countAfter).toBe(countBefore + 1);
  });

  test('Create with board name and description - card appears with "by you" attribution and today\'s date', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);
    await collections.navigate();

    const countBefore = await collections.getCollectionCount();

    await collections.openNewCollectionModal();
    await collections.createCollection(NAME_AND_DESC, 'A test description');

    await expect(collections.successToast).toBeVisible({ timeout: 10000 });

    const countAfter = await collections.getCollectionCount();
    expect(countAfter).toBe(countBefore + 1);

    // Newly created card appears in the grid
    const newCard = collections.collectionCardsGrid.locator('> div').filter({ hasText: NAME_AND_DESC });
    await expect(newCard).toBeVisible();
    await expect(newCard.locator('div[title]')).toContainText('by you');
  });

  test('Duplicate collection name - shows error toast "A collection with this name already exists" and modal stays open', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);
    await collections.navigate();

    const countBefore = await collections.getCollectionCount();

    await collections.openNewCollectionModal();
    await collections.boardNameInput.fill(NAME_ONLY);
    await collections.createCollectionCreateBtn.click();

    // Duplicate is blocked — error toast appears, modal stays open, count unchanged
    await expect(collections.errorToast).toBeVisible({ timeout: 10000 });
    await expect(collections.errorToast).toContainText('A collection with this name already exists');
    await expect(collections.createCollectionModal).toBeVisible();

    const countAfter = await collections.getCollectionCount();
    expect(countAfter).toBe(countBefore);
  });

});
