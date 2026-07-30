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

test('Competitor card - Format Split Video + Image count equals total Ad Volume', async () => {
  const totalCards = await competitor.countAllCards();

  for (let i = 0; i < totalCards; i++) {
    const { video, image }   = await competitor.getCardFormatSplitNumbers(i);
    const { total }          = await competitor.getCardAdVolumeNumbers(i);
    const brandName          = await competitor.getCardName(i);

    console.log(`[${brandName}] Video: ${video}, Image: ${image}, Sum: ${video + image}, Total: ${total}`);
    expect(video + image, `Card "${brandName}" — Video (${video}) + Image (${image}) should equal total (${total})`).toBe(total);
  }
});
