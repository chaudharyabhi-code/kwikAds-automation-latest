import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

let collections;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  collections = new Collections(page);
  await collections.navigate();
});

// Uses the first non-default card (index 1 in the grid = first user-created collection)
const USER_CARD = 1;

test('User-created collection card shows name, creation date, delete icon, and attribution', async () => {
  await expect(collections.getCardName(USER_CARD)).toBeVisible();
  await expect(collections.getCardDate(USER_CARD)).toBeVisible();
  await expect(collections.getCardDeleteButton(USER_CARD)).toBeVisible();
  await expect(collections.getCardAttribution(USER_CARD)).toBeVisible();

  const nameText = await collections.getCardName(USER_CARD).innerText();
  expect(nameText.trim().length).toBeGreaterThan(0);

  const dateText = await collections.getCardDate(USER_CARD).innerText();
  expect(dateText.trim().length).toBeGreaterThan(0);
});
