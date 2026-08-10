import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  // A merchant may have no (or too few) saved competitors — skip rather than
  // index into an empty list.
  // Self-healing: top up rather than skip
  const cardCount = await competitor.ensureCompetitors(2, new AdsLibrary(page));
  expect(cardCount, 'could not establish any saved competitors').toBeGreaterThan(0);
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

  // Assert ABSENCE as a count of matching cards, not with not.toContainText.
  //
  // The deleted brand yields no search results at all, so competitorCards resolves to ZERO
  // elements — and Playwright fails not.toContainText on an empty list with "element(s) not
  // found" rather than passing it. The success case was therefore reported as a failure.
  // Filtering by the brand and expecting 0 holds whether or not other cards remain.
  await expect(competitor.competitorCards.filter({ hasText: brandName })).toHaveCount(0);
});
