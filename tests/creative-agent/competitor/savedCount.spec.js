import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Competitor } from '../../../pages/competitor';

test('Competitors tab - Saved Competitors header count matches number of competitor cards on page', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // Read the count shown in the "Saved Competitors (N)" heading
  const headerCount = await competitor.getSavedCount();

  // Scroll to bottom to ensure all cards are rendered, then count them
  const cardCount = await competitor.countAllCards();

  console.log(`Header says: ${headerCount} | Cards found: ${cardCount}`);
  expect(cardCount).toBe(headerCount);
});
