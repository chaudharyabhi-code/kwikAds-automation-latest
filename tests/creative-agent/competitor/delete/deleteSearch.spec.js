import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  // A merchant may have no (or too few) saved competitors — skip rather than
  // index into an empty list.
  const cardCount = await competitor.countAllCards();
  test.skip(cardCount < 1, `Needs at least 1 saved competitor(s); found ${cardCount}`);
});

test('Deleted competitor - no longer appears in search results', async () => {
  // Find a NON-merged card. Index 1 was hardcoded, but a seeded merged group can occupy it.
  const cardIndex = await competitor.findPlainCardIndex();
  expect(cardIndex, 'no non-merged competitor available to delete').not.toBe(-1);

  const brandName = (await competitor.getCardName(cardIndex).innerText()).trim();
  const countBefore = await competitor.getSavedCount();

  await competitor.deleteCompetitor(cardIndex);
  await expect(competitor.removeCompetitorModal).toBeVisible();
  await competitor.removeCompetitorConfirmBtn.click();

  // Wait on the durable outcome instead of the ~3s auto-dismissing toast, which the confirm
  // click regularly outlives — that is why this failed with "element not found".
  // delete.spec.js already covers the toast itself.
  await expect.poll(() => competitor.getSavedCount(), { timeout: 15000 }).toBe(countBefore - 1);

  // Search for the deleted brand name
  await competitor.search(brandName);

  // Competitor cards list must not contain the deleted brand name as saved
  await expect(competitor.competitorCards).not.toContainText(brandName);
});
