import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// Two serial groups that run in parallel with each other — each group uses
// distinct ads so server-side share-link state never collides between groups.
//
// Group 1 → Ad A (row 0, first) + Ad B (row 0, last)
// Group 2 → Ad C (row 2, first) + Ad D (row 2, last)
//
// Checkbox locators point to .ant-checkbox-wrapper (the label wrapper):
//   - click via  .locator('.ant-checkbox-inner').click()  — the visible 16px square
//   - assert via toHaveClass(/ant-checkbox-wrapper-checked/)

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1
// ═══════════════════════════════════════════════════════════════════════════════
test.describe.serial('Share popup - group 1', () => {

  // ─── Test 1 ───────────────────────────────────────────────────────────────
  // Ad A — clean
  test('opens with correct title/subtitle and KAAI Analysis checked by default', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(0, 'first');

    await expect(adsLibrary.sharePopup).toContainText('Share Creative');
    await expect(adsLibrary.sharePopup).toContainText('Generate a shareable link for this ad');
    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareUgcCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.sharePromptsCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 2 ───────────────────────────────────────────────────────────────
  // Ad A — still clean
  test('closing via X closes the popup without generating a link', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(0, 'first');

    await adsLibrary.closeSharePopup();
    await expect(adsLibrary.sharePopup).not.toBeVisible();

    // Reopen same ad — no link should be present
    await adsLibrary.openCardSharePopup(0, 'first');
    await expect(adsLibrary.shareLinkInput).not.toBeVisible();

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 3 ───────────────────────────────────────────────────────────────
  // Ad A — first generation (KAAI only)
  test('Generate Link with KAAI Analysis only produces a valid shareable link', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(0, 'first');

    await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

    await adsLibrary.generateShareLink();

    const link = await adsLibrary.getGeneratedShareLink();
    expect(link).toMatch(/^https?:\/\/.+/);
    await expect(adsLibrary.shareLinkInput).toBeVisible();
    await expect(adsLibrary.shareCopyBtn).toBeVisible();

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 4 ───────────────────────────────────────────────────────────────
  // Ad A — KAAI link exists from test 3; click UGC + Prompts inner to change
  // selection (enables Regenerate), then regenerate with all 3
  test('Generate Link with all 3 options checked produces a valid shareable link', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(0, 'first');

    await adsLibrary.shareUgcCheckbox.locator('.ant-checkbox-inner').dispatchEvent('click');
    await adsLibrary.sharePromptsCheckbox.locator('.ant-checkbox-inner').dispatchEvent('click');

    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareUgcCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.sharePromptsCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);

    await adsLibrary.generateShareLink();

    const link = await adsLibrary.getGeneratedShareLink();
    expect(link).toMatch(/^https?:\/\/.+/);

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 5 ───────────────────────────────────────────────────────────────
  // Ad A (has state from test 4) + Ad B (clean — never touched)
  test('opening the popup for a different ad resets to default state (no carryover)', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    // Ad A has all 3 checked + a link. Toggle UGC to change selection
    // (enables Regenerate Link), then regenerate to leave a dirty state.
    await adsLibrary.openCardSharePopup(0, 'first');
    await adsLibrary.shareUgcCheckbox.locator('.ant-checkbox-inner').dispatchEvent('click');
    await adsLibrary.generateShareLink();
    await adsLibrary.closeSharePopup();

    // Open Ad B — completely untouched, must be in default state with no carryover
    await adsLibrary.openCardSharePopup(3, 'last');

    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareUgcCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.sharePromptsCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareLinkInput).not.toBeVisible();
    await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 6 ───────────────────────────────────────────────────────────────
  // Ad B — clean (test 5 only read it, no link generated)
  test('Generate Link button is disabled when all options are unchecked', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(0, 'last');

    await adsLibrary.shareKaaiCheckbox.locator('.ant-checkbox-inner').dispatchEvent('click');
    await expect(adsLibrary.shareKaaiCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2
// ═══════════════════════════════════════════════════════════════════════════════
test.describe.serial('Share popup - group 2', () => {

  // ─── Test 7 ───────────────────────────────────────────────────────────────
  // Ad C (row 2, first) — clean
  test('button changes from "Generate Link" to "Regenerate Link" after generation, stays disabled until checkbox changes', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(2, 'first');

    await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

    await adsLibrary.generateShareLink();

    await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.shareUgcCheckbox.locator('.ant-checkbox-inner').dispatchEvent('click');
    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 8 ───────────────────────────────────────────────────────────────
  // Ad D (row 2, last) — clean
  test('reopening the popup for the same ad retains previously generated link and checkbox state', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(2, 'last');
    await adsLibrary.shareUgcCheckbox.locator('.ant-checkbox-inner').dispatchEvent('click');
    await adsLibrary.generateShareLink();
    const generatedLink = await adsLibrary.getGeneratedShareLink();
    await adsLibrary.closeSharePopup();

    // Reopen the exact same ad
    await adsLibrary.openCardSharePopup(2, 'last');

    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareUgcCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
    await expect(adsLibrary.shareLinkInput).toBeVisible();
    expect(await adsLibrary.getGeneratedShareLink()).toBe(generatedLink);
    await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  // ─── Test 9 ───────────────────────────────────────────────────────────────
  // Ad C — link already exists from test 7; just verify the field is readonly
  test('generated link field is read-only and cannot be edited', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary = new AdsLibrary(page);
    await adsLibrary.navigateToAdsLibrary();

    await adsLibrary.openCardSharePopup(2, 'first');

    // A link from test 7 is already present; if running in isolation, generate one
    if (!(await adsLibrary.shareLinkInput.isVisible())) {
      await adsLibrary.generateShareLink();
    }

    await expect(adsLibrary.shareLinkInput).toHaveAttribute('readonly', '');

    const originalLink = await adsLibrary.getGeneratedShareLink();
    await adsLibrary.shareLinkInput.click();
    await page.keyboard.type('EDIT_ATTEMPT');
    expect(await adsLibrary.getGeneratedShareLink()).toBe(originalLink);

    await adsLibrary.closeSharePopup();
  });

});
