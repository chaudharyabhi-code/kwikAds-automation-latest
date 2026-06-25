import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// Each test targets a specific ad via Library ID search (env vars SHARE_AD_ID_1–4).
// Searching by ID isolates the exact ad to row 0, first card — no dependency on
// grid position or scroll. Tests run in parallel; no serial state.
//
//   Test 1 → SHARE_AD_ID_1  (default state, X-close, generate, readonly)
//   Test 2 → SHARE_AD_ID_2  (checkbox interactions, button enable/disable)
//   Test 3 → SHARE_AD_ID_3 + SHARE_AD_ID_4  (persistence + no carryover)
//
// SHARE_AD_ID_1/2/3 should be ads with no previously generated share link
// (first run only for the "no link" assertions; subsequent runs re-generate).

test('Share popup - default state, generate link, and link is readonly', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();

  await adsLibrary.searchAd(process.env.SHARE_AD_ID_1);
  await adsLibrary.waitForFilter();
  await adsLibrary.openCardSharePopup(0, 'first');

  // ── Default state ─────────────────────────────────────────────────────────
  await expect(adsLibrary.sharePopup).toContainText('Share Creative');
  await expect(adsLibrary.sharePopup).toContainText('Generate a shareable link for this ad');
  await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareUgcCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.sharePromptsCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
  await expect(adsLibrary.shareActionBtn).not.toBeDisabled();
  await expect(adsLibrary.shareLinkInput).not.toBeVisible();

  // ── Close via X → popup gone; reopen same ad → still no link ─────────────
  await adsLibrary.closeSharePopup();
  await expect(adsLibrary.sharePopup).not.toBeVisible();

  await adsLibrary.openCardSharePopup(0, 'first');
  await expect(adsLibrary.shareLinkInput).not.toBeVisible();

  // ── Generate link ─────────────────────────────────────────────────────────
  await adsLibrary.generateShareLink();
  const link = await adsLibrary.getGeneratedShareLink();
  expect(link).toMatch(/^https?:\/\/.+/);
  await expect(adsLibrary.shareLinkInput).toBeVisible();
  await expect(adsLibrary.shareCopyBtn).toBeVisible();
  await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
  await expect(adsLibrary.shareActionBtn).toBeDisabled();

  // ── Link is readonly — typing must not change its value ───────────────────
  await expect(adsLibrary.shareLinkInput).toHaveAttribute('readonly', '');
  await adsLibrary.shareLinkInput.click();
  await page.keyboard.type('EDIT_ATTEMPT');
  expect(await adsLibrary.getGeneratedShareLink()).toBe(link);

  await adsLibrary.closeSharePopup();
});

test('Share popup - checkbox interactions and Regenerate button enable/disable', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();

  await adsLibrary.searchAd(process.env.SHARE_AD_ID_2);
  await adsLibrary.waitForFilter();
  await adsLibrary.openCardSharePopup(0, 'first');

  // ── Uncheck KAAI → 0 options checked → button disabled ───────────────────
  await adsLibrary.shareKaaiCheckbox.locator('.ant-checkbox-inner').evaluate(el => el.click());
  await expect(adsLibrary.shareKaaiCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareActionBtn).toBeDisabled();

  // ── Re-check KAAI → button enabled ───────────────────────────────────────
  await adsLibrary.shareKaaiCheckbox.locator('.ant-checkbox-inner').evaluate(el => el.click());
  await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

  // ── Also check UGC + Prompts → generate with all 3 ───────────────────────
  await adsLibrary.shareUgcCheckbox.locator('.ant-checkbox-inner').evaluate(el => el.click());
  await adsLibrary.sharePromptsCheckbox.locator('.ant-checkbox-inner').evaluate(el => el.click());
  await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareUgcCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.sharePromptsCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);

  await adsLibrary.generateShareLink();
  expect(await adsLibrary.getGeneratedShareLink()).toMatch(/^https?:\/\/.+/);

  // ── After generate: button disabled; uncheck one → re-enabled ────────────
  await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
  await expect(adsLibrary.shareActionBtn).toBeDisabled();

  await adsLibrary.shareUgcCheckbox.locator('.ant-checkbox-inner').evaluate(el => el.click());
  await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

  await adsLibrary.closeSharePopup();
});

test('Share popup - generated link persists on reopen; different ad has no carryover', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();

  // ── Generate on Ad 3 ─────────────────────────────────────────────────────
  await adsLibrary.searchAd(process.env.SHARE_AD_ID_3);
  await adsLibrary.waitForFilter();
  await adsLibrary.openCardSharePopup(0, 'first');
  await adsLibrary.generateShareLink();
  const savedLink = await adsLibrary.getGeneratedShareLink();
  expect(savedLink).toMatch(/^https?:\/\/.+/);
  await adsLibrary.closeSharePopup();

  // ── Ad 4 (different ad) must be clean — no carryover from Ad 3 ───────────
  await adsLibrary.searchAd(process.env.SHARE_AD_ID_4);
  await adsLibrary.waitForFilter();
  await adsLibrary.openCardSharePopup(0, 'first');
  await expect(adsLibrary.shareLinkInput).not.toBeVisible();
  await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareUgcCheckbox).not.toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
  await expect(adsLibrary.shareActionBtn).not.toBeDisabled();
  await adsLibrary.closeSharePopup();

  // ── Reopen Ad 3 → server-persisted link and state retained ───────────────
  await adsLibrary.searchAd(process.env.SHARE_AD_ID_3);
  await adsLibrary.waitForFilter();
  await adsLibrary.openCardSharePopup(0, 'first');
  await expect(adsLibrary.shareLinkInput).toBeVisible();
  expect(await adsLibrary.getGeneratedShareLink()).toBe(savedLink);
  await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(/ant-checkbox-wrapper-checked/);
  await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
  await expect(adsLibrary.shareActionBtn).toBeDisabled();
  await adsLibrary.closeSharePopup();
});
