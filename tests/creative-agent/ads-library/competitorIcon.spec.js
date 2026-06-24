import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// All 4 tests operate on row 0, first card.
// Server-side competitor state persists across tests (serial execution):
//
//   Test 1 — add competitor  → verify success toast
//   Test 2 — verify brand appears on Competitors page (state from Test 1)
//   Test 3 — click remove icon → verify modal text → cancel  (brand stays saved)
//   Test 4 — click remove icon → confirm remove → verify gone from Competitors page

test.describe.serial('Competitor Icon', () => {

  // ─── Test 1 ───────────────────────────────────────────────────────────────
  // Brand is NOT a competitor at the start of the suite.
  test('clicking competitor icon on non-saved brand shows success toast', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    const brandName = await adsLibrary.getFirstCardBrandName();
    await adsLibrary.clickTagCompetitorBtn(0, 'first');

    await expect(adsLibrary.successToast).toBeVisible();
    await expect(adsLibrary.successToast).toContainText(`${brandName} saved as competitor`);
  });

  // ─── Test 2 ───────────────────────────────────────────────────────────────
  // Brand is now a saved competitor from Test 1.
  test('saved competitor appears on Competitors page after adding', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    const brandName = await adsLibrary.getFirstCardBrandName();
    await adsLibrary.navigateToCompetitors();

    await adsLibrary.searchCompetitor(brandName);

    // Exactly one competitor card should match the brand name
    await expect(adsLibrary.adsLibraryContent.getByText(brandName, { exact: true })).not.toHaveCount(1) && await expect(adsLibrary.adsLibraryContent.getByText(brandName, { exact: true })).not.toHaveCount(0);
  });

  // ─── Test 3 ───────────────────────────────────────────────────────────────
  // Brand is still a saved competitor. Click remove → verify modal → cancel.
  test('clicking competitor icon on saved brand opens Remove Competitor modal', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    const brandName = await adsLibrary.getFirstCardBrandName();
    await adsLibrary.clickRemoveCompetitorBtn(0, 'first');

    await expect(adsLibrary.removeCompetitorModal).toBeVisible();
    await expect(adsLibrary.removeCompetitorModal).toContainText('Are you sure you want to remove');
    await expect(adsLibrary.removeCompetitorModal).toContainText(brandName);
    await expect(adsLibrary.removeCompetitorCancelBtn).toBeVisible();
    await expect(adsLibrary.removeCompetitorConfirmBtn).toBeVisible();

    // Cancel — keep brand saved for Test 4
    await adsLibrary.removeCompetitorCancelBtn.click();
    await adsLibrary.removeCompetitorModal.waitFor({ state: 'hidden' });
  });

  // ─── Test 4 ───────────────────────────────────────────────────────────────
  // Brand is still a saved competitor. Confirm removal and verify it's gone.
  test('removed competitor no longer appears on Competitors page', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    const brandName = await adsLibrary.getFirstCardBrandName();
    await adsLibrary.clickRemoveCompetitorBtn(0, 'first');
    await expect(adsLibrary.removeCompetitorModal).toBeVisible();

    await adsLibrary.removeCompetitorConfirmBtn.click();
    await adsLibrary.removeCompetitorModal.waitFor({ state: 'hidden' });

    await adsLibrary.navigateToCompetitors();
    await adsLibrary.searchCompetitor(brandName);

    // Brand should not appear in results after removal
    await expect(adsLibrary.adsLibraryContent.getByText(brandName, { exact: true })).toHaveCount(1);
  });

});
