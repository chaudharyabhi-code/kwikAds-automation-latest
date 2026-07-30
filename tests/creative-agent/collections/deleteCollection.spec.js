import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// First user-created collection (non-destructive tests — we cancel before deleting)
const USER_CARD = 1;
// Disposable collection created just for the confirm+search tests
const DELETE_TEST_NAME = 'playwright-to-delete';

let collections;

// File-level shared setup — also applies to tests inside the describe block below.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  collections = new Collections(page);
  await collections.navigate();
});

test('Delete icon on a custom collection triggers the Delete Collection confirmation modal', async () => {
  const collectionName = (await collections.getCardName(USER_CARD).innerText()).trim();

  await collections.getCardDeleteButton(USER_CARD).click();

  // Modal appears with correct title and the collection name in the message
  await expect(collections.deleteModal).toBeVisible();
  await expect(collections.deleteModal).toContainText('Delete Collection');
  await expect(collections.deleteModal).toContainText(collectionName);
  await expect(collections.deleteCancelBtn).toBeVisible();
  await expect(collections.deleteConfirmBtn).toBeVisible();

  // Clean up — close without deleting
  await collections.deleteCancelBtn.click();
});

test('Cancel on the Delete Collection modal closes it and leaves the collection in the grid', async () => {
  const countBefore = await collections.getCollectionCount();

  await collections.getCardDeleteButton(USER_CARD).click();
  await expect(collections.deleteModal).toBeVisible();

  await collections.deleteCancelBtn.click();

  await expect(collections.deleteModal).not.toBeVisible();
  await expect(collections.getCard(USER_CARD)).toBeVisible();

  const countAfter = await collections.getCollectionCount();
  expect(countAfter).toBe(countBefore);
});

// Tests 3 & 4 are serial — test 3 creates & deletes a disposable collection,
// test 4 uses its name to verify the search returns no results.
test.describe.serial('Delete collection — confirm and search', () => {
  let deletedName = '';

  test('Confirming delete removes the collection from the grid and decrements the badge count', async () => {
    // Create a disposable collection so no real user data is touched
    await collections.openNewCollectionModal();
    await collections.createCollection(DELETE_TEST_NAME);
    deletedName = DELETE_TEST_NAME;

    const countBefore = await collections.getCollectionCount();

    await collections.deleteCollectionByName(deletedName);

    // Badge count decrements by 1
    const countAfter = await collections.getCollectionCount();
    expect(countAfter).toBe(countBefore - 1);

    // Card is no longer in the grid
    const deletedCard = collections.getCardByName(deletedName);
    await expect(deletedCard).not.toBeVisible();
  });

  test('Searching for a deleted collection name shows the empty search state', async () => {
    if (!deletedName) test.skip(true, 'Previous test did not delete a collection');

    await collections.search(deletedName);

    // No results — empty state message includes the search term
    await expect(collections.emptySearchState).toBeVisible();
    await expect(collections.emptySearchState).toContainText(deletedName);

    const renderedCount = await collections.getRenderedCardCount();
    expect(renderedCount).toBe(0);
  });
});
