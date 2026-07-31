import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// Disposable collection created just for the confirm+search tests
const DELETE_TEST_NAME = 'playwright-to-delete';

let collections;
// Grid index of a real user-created collection, discovered per test run.
// Assuming a fixed index risks targeting the default "Saved Ads" card, which has no
// delete icon at all.
let userCard;

// File-level shared setup — also applies to tests inside the describe block below.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  collections = new Collections(page);
  await collections.navigate();
  userCard = await collections.findUserCreatedCardIndex();
});

test('Delete icon on a custom collection triggers the Delete Collection confirmation modal', async () => {
  test.skip(userCard === -1, 'No user-created collection exists to delete');
  const collectionName = (await collections.getCardName(userCard).innerText()).trim();

  await collections.getCardDeleteButton(userCard).click();

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
  test.skip(userCard === -1, 'No user-created collection exists to delete');
  const countBefore = await collections.getCollectionCount();

  await collections.getCardDeleteButton(userCard).click();
  await expect(collections.deleteModal).toBeVisible();

  await collections.deleteCancelBtn.click();

  await expect(collections.deleteModal).not.toBeVisible();
  await expect(collections.getCard(userCard)).toBeVisible();

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
