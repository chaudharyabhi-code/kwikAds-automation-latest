import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// Disposable collection created just for the confirm+search tests. Suffixed per run: a fixed
// name left behind by an interrupted run made the create below fail on the duplicate-name
// error toast, which skipped the search test that follows it in this .serial block.
const DELETE_TEST_NAME = `playwright-to-delete ${Math.random().toString(36).slice(2, 8)}`;

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

  test('Confirming delete removes the collection from the grid', async () => {
    // Create a disposable collection so no real user data is touched
    await collections.openNewCollectionModal();
    await collections.createCollection(DELETE_TEST_NAME);
    deletedName = DELETE_TEST_NAME;

    await collections.deleteCollectionByName(deletedName);

    // Card is no longer in the grid. Searched for, not scanned: the grid paginates.
    //
    // The badge total is deliberately not asserted. It counts the whole merchant, and the
    // other collection specs create and delete against that same merchant from parallel
    // workers, so countBefore - 1 lost the race — measured 54 where 53 was expected. Whether
    // THIS collection is gone is the behaviour under test and does not drift.
    await collections.search(deletedName);
    await expect(collections.getCardByName(deletedName)).not.toBeVisible();
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
