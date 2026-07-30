import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
});

test('Competitor card - Ad Volume active count is always less than or equal to total count', async () => {
  const totalCards = await competitor.countAllCards();

  for (let i = 0; i < totalCards; i++) {
    const { active, total } = await competitor.getCardAdVolumeNumbers(i);
    const brandName = await competitor.getCardName(i);

    console.log(`[${brandName}] active: ${active}, total: ${total}`);
    expect(active, `Card "${brandName}" — active (${active}) should be ≤ total (${total})`).toBeLessThanOrEqual(total);
  }
});
