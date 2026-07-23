import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

test('New Collection modal opens with title, board name input, description textarea, Cancel and Create buttons', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await collections.openNewCollectionModal();

  await expect(collections.createCollectionModal).toBeVisible();
  await expect(collections.createCollectionModal).toContainText('Create New Collection');
  await expect(collections.boardNameInput).toBeVisible();
  await expect(collections.descriptionTextarea).toBeVisible();
  await expect(collections.createCollectionCancelBtn).toBeVisible();
  await expect(collections.createCollectionCreateBtn).toBeVisible();
  await expect(collections.boardNameCounter).toContainText('0/50');
});

test('"Create" button is disabled when board name field is empty', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await collections.openNewCollectionModal();

  await expect(collections.boardNameInput).toHaveValue('');
  await expect(collections.createCollectionCreateBtn).toBeDisabled();
});

test('"Create" button becomes enabled once a valid board name is entered', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await collections.openNewCollectionModal();

  await expect(collections.createCollectionCreateBtn).toBeDisabled();

  await collections.boardNameInput.fill('Q3 Campaign');

  await expect(collections.createCollectionCreateBtn).toBeEnabled();
});

test('Board name character limit is enforced at 50 characters', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await collections.openNewCollectionModal();

  const over50 = 'A'.repeat(60);
  await collections.boardNameInput.fill(over50);

  await expect(collections.boardNameCounter).toContainText('50/50');

  const actualValue = await collections.boardNameInput.inputValue();
  expect(actualValue.length).toBe(50);
});

test('Cancel button closes the modal without creating a collection', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  const countBefore = await collections.getCollectionCount();

  await collections.openNewCollectionModal();
  await collections.boardNameInput.fill('Should Not Be Created');
  await collections.createCollectionCancelBtn.click();

  await expect(collections.createCollectionModal).not.toBeVisible();

  const countAfter = await collections.getCollectionCount();
  expect(countAfter).toBe(countBefore);
});
