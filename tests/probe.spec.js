import { test } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../pages/kwikads';
import { AdsLibrary } from '../pages/ads-library';
import { Competitor } from '../pages/competitor';

test('probe competitor card state around removal', async ({ page }) => {
  test.setTimeout(240000);
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  const competitor = new Competitor(page);

  await adsLibrary.navigateToAdsLibrary();
  const brand = await adsLibrary.ensureFirstCardTagged();
  console.log('BRAND:', brand);

  const report = async (label) => {
    await adsLibrary.navigateToCompetitors();
    await adsLibrary.searchCompetitor(brand);
    const cards = await competitor.competitorCards.count();
    const matching = await competitor.competitorCards.filter({ hasText: brand }).count();
    console.log(`${label} | competitorCards=${cards} matchingBrand=${matching} total=${await competitor.countAllCards()}`);
  };

  await report('SAVED    ');

  await adsLibrary.navigateToAdsLibrary();
  console.log('MENU LABEL:', await adsLibrary.openCardCompetitorMenu());
  await adsLibrary.clickCardCompetitorMenuItem();
  await adsLibrary.removeCompetitorModal.waitFor({ state: 'visible', timeout: 10000 });
  await adsLibrary.removeCompetitorConfirmBtn.click();
  await adsLibrary.removeCompetitorModal.waitFor({ state: 'hidden', timeout: 10000 });

  const toasts = await page.locator('.ant-message-notice').allInnerTexts();
  console.log('TOASTS:', JSON.stringify(toasts.map(t => t.trim())));

  await adsLibrary.navigateToAdsLibrary();
  console.log('MENU LABEL AFTER REMOVE:', await adsLibrary.openCardCompetitorMenu());
  await adsLibrary.closeCardMenu();

  await report('AFTER REM');
});
