import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// Tag/untag a competitor from an ad card, via that card's 3-dot menu.
//
// Two things this file used to assume, both false:
//
// 1. A dedicated competitor icon on the card. It is gone from the app — a card now renders only
//    "KAAI analysis ready", "Request Creative" and "More options", hover or no hover. The
//    action survives as a menu item whose label flips between "Tag Competitor" and "Remove
//    Competitor" depending on whether the brand is already saved.
// 2. That row 0 / first card is ONE stable subject across all five tests, so test 1 could tag
//    it and tests 3-5 inherit that. The Ad Library does not order cards stably across logins:
//    test 2 confirmed a brand was saved, and test 3 — fresh login, same position — found a
//    different brand whose menu still read "Tag Competitor". That is what the old .serial
//    chain was papering over, at the cost of four skips whenever the first test failed.
//
// So each test now establishes its own precondition against the card actually in front of it
// instead of inheriting one. That is what removes the cascade risk: the first test no longer
// fails deterministically, and no test is built on the assumption that an earlier one left the
// right state behind.
//
// .serial is RETAINED, though — for the shared resource, not for the chain. All five tests act
// on the same card-0 brand and tag/untag it, which is one per-merchant record. Run in parallel,
// they fight: the removal test confirmed a removal and then found the brand saved again,
// because another test had re-tagged it mid-flight (measured — 37 matches where 1 was expected).
//
// "Is this brand saved?" is asserted on the competitor CARD, never on brandNameText(). That
// helper is a page-wide exact-text match, so it hits the brand once per ad the brand has —
// measured 37 matches while saved and 36 after removal for the same brand, so it cannot tell
// the two states apart. savedCompetitorCard() is 1 when saved and 0 when removed.

test.describe.serial('Competitor Icon', () => {
  let adsLibrary;

  // Shared setup: log in, land on Ad Library.
  test.beforeEach(async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();
  });

  test('clicking competitor icon on non-saved brand shows success toast', async () => {
    const brandName = await adsLibrary.getFirstCardBrandName();
    // Precondition: this brand must NOT be saved yet, or there is nothing to tag.
    await adsLibrary.untagFirstCardIfTagged();

    expect(await adsLibrary.openCardCompetitorMenu()).toBe('Tag Competitor');
    await adsLibrary.clickCardCompetitorMenuItem();

    await expect(adsLibrary.successToast).toBeVisible();
    await expect(adsLibrary.successToast).toContainText(`${brandName} saved as competitor`);
  });

  test('saved competitor appears on Competitors page after adding', async () => {
    const brandName = await adsLibrary.ensureFirstCardTagged();

    await adsLibrary.navigateToCompetitors();
    await adsLibrary.searchCompetitor(brandName);

    await expect(adsLibrary.savedCompetitorCard(brandName)).toHaveCount(1);
  });

  test('clicking competitor icon on saved brand opens Remove Competitor modal', async () => {
    const brandName = await adsLibrary.ensureFirstCardTagged();

    // The same menu item reads "Remove Competitor" once the brand is saved — that flip is
    // part of the behaviour under test.
    expect(await adsLibrary.openCardCompetitorMenu()).toBe('Remove Competitor');
    await adsLibrary.clickCardCompetitorMenuItem();

    await expect(adsLibrary.removeCompetitorModal).toBeVisible();
    await expect(adsLibrary.removeCompetitorModal).toContainText('Are you sure you want to remove');
    await expect(adsLibrary.removeCompetitorModal).toContainText(brandName);
    await expect(adsLibrary.removeCompetitorCancelBtn).toBeVisible();
    await expect(adsLibrary.removeCompetitorConfirmBtn).toBeVisible();

    // Cancel — the brand must stay saved
    await adsLibrary.removeCompetitorCancelBtn.click();
    await adsLibrary.removeCompetitorModal.waitFor({ state: 'hidden' });
    await adsLibrary.navigateToCompetitors();
    await adsLibrary.searchCompetitor(brandName);
    await expect(adsLibrary.savedCompetitorCard(brandName)).toHaveCount(1);
  });

  test('pressing Escape on Remove Competitor modal closes it without removing the brand', async ({ page }) => {
    const brandName = await adsLibrary.ensureFirstCardTagged();

    await adsLibrary.openCardCompetitorMenu();
    await adsLibrary.clickCardCompetitorMenuItem();
    await expect(adsLibrary.removeCompetitorModal).toBeVisible();

    // Press Escape — must close modal without triggering removal
    await page.keyboard.press('Escape');
    await adsLibrary.removeCompetitorModal.waitFor({ state: 'hidden' });

    // Brand must still be in saved competitors — verify via Competitors page
    await adsLibrary.navigateToCompetitors();
    await adsLibrary.searchCompetitor(brandName);
    await expect(adsLibrary.savedCompetitorCard(brandName)).toHaveCount(1);
  });

  test('removed competitor no longer appears on Competitors page', async () => {
    const brandName = await adsLibrary.ensureFirstCardTagged();

    await adsLibrary.openCardCompetitorMenu();
    await adsLibrary.clickCardCompetitorMenuItem();
    await expect(adsLibrary.removeCompetitorModal).toBeVisible();

    await adsLibrary.removeCompetitorConfirmBtn.click();
    await adsLibrary.removeCompetitorModal.waitFor({ state: 'hidden' });

    await adsLibrary.navigateToCompetitors();
    await adsLibrary.searchCompetitor(brandName);

    // The brand itself is still in the search results — it is only the saved-competitor card
    // that must be gone.
    await expect(adsLibrary.savedCompetitorCard(brandName)).toHaveCount(0);
  });

});
