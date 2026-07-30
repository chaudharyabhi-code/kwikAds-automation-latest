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

test('Competitor card - Ad Longevity Testing + Scaling + Evergreen equals active ad count', async () => {
  const totalCards = await competitor.countAllCards();

  for (let i = 0; i < totalCards; i++) {
    const { testing, scaling, evergreen } = await competitor.getCardAdLongevityNumbers(i);
    const { active }                      = await competitor.getCardAdVolumeNumbers(i);
    const brandName                       = await competitor.getCardName(i);
    const longevitySum                    = testing + scaling + evergreen;

    console.log(`[${brandName}] Testing: ${testing}, Scaling: ${scaling}, Evergreen: ${evergreen}, Sum: ${longevitySum}, Active: ${active}`);
    expect(longevitySum, `Card "${brandName}" — Testing (${testing}) + Scaling (${scaling}) + Evergreen (${evergreen}) = ${longevitySum}, expected active (${active})`).toBe(active);
  }
});
