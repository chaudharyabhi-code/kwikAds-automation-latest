import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

let adsLibrary;

// Opt this file out of the config's fullyParallel.
//
// Every describe below competes for the same scarce, server-side mutable resource: ads that
// have never had a share link generated. Under fullyParallel the blocks ran in 4 different
// workers, and findFreshSharePopup() is deterministic (same startRow, same row order in
// every worker) — so they all converged on the SAME "first fresh ad", while the
// "generating a link" block mutated the very ad the read-only blocks were asserting on.
//
// 'default', not 'serial': serial would additionally SKIP every remaining test in the file
// after the first failure, hiding real regressions behind one flake.
test.describe.configure({ mode: 'default' });

// Shared setup: log in and land on the Ad Library grid.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
});

// The target ad is DISCOVERED at runtime, not read from .env.
//
// findFreshSharePopup() walks the grid card by card — opening each card's 3-dot menu →
// "Share Creative" — until it finds one whose popup is still in the default,
// never-generated state (only "KAAI Analysis" ticked, button reads "Generate Link",
// no link input). It scrolls to pull in more virtualised rows as needed and leaves the
// matching popup open.
//
// Why: generating a link persists server-side, so a fixed SHARE_LIBRARY_ID can only ever
// show the default state on the very first run — after that those tests were asserting
// against an ad that already had a link. Scanning finds a genuinely fresh ad every run.

// ─── Popup chrome — state-agnostic, so no fresh-ad scan is needed ──────────────
// Scanning for a fresh ad is expensive and gets slower over time (each generate test
// permanently consumes one), so only the tests that genuinely depend on the
// never-generated state pay that cost.
test.describe('Share popup — chrome and dismissal (any ad)', () => {

  test.beforeEach(async () => {
    await adsLibrary.openSharePopupOnFirstCard();
  });

  test('Share popup - opens with title and description', async () => {
    await expect(adsLibrary.sharePopup).toContainText('Share Creative');
    await expect(adsLibrary.sharePopup).toContainText('Generate a shareable link for this ad');

    await adsLibrary.closeSharePopup();
  });
  test('Share popup - the three shareable options are listed', async () => {
    await expect(adsLibrary.sharePopup).toContainText('Include in shared page');
    await expect(adsLibrary.shareKaaiCheckbox).toBeVisible();
    await expect(adsLibrary.shareUgcCheckbox).toBeVisible();
    await expect(adsLibrary.sharePromptsCheckbox).toBeVisible();

    await adsLibrary.closeSharePopup();
  });
  test('Share popup - closing via X hides the popup', async () => {
    await adsLibrary.closeSharePopup();

    await expect(adsLibrary.sharePopup).not.toBeVisible();
  });
});

// ─── Default state of a never-shared ad (non-destructive: never generates) ─────
test.describe('Share popup — default state of a fresh ad', () => {
  // The fresh-ad scan opens/closes a popup per candidate; with the top of the grid
  // already consumed it can examine 25+ ads before finding one.
  test.setTimeout(300000);

  test.beforeEach(async () => {
    const found = await adsLibrary.findFreshSharePopup();
    test.skip(!found, 'No ad found whose share link has not been generated yet');
  });


  test('Share popup - default state has only KAAI Analysis checked', async () => {
    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.shareUgcCheckbox).not.toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.sharePromptsCheckbox).not.toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - default action button is an enabled "Generate Link" with no link shown', async () => {
    await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();
    await expect(adsLibrary.shareLinkInput).not.toBeVisible();

    await adsLibrary.closeSharePopup();
  });


});

// ─── Checkbox interactions on a fresh ad (non-destructive) ─────────────────────
test.describe('Share popup — checkbox interactions', () => {
  test.setTimeout(300000);

  test.beforeEach(async () => {
    const found = await adsLibrary.findFreshSharePopup();
    test.skip(!found, 'No ad found whose share link has not been generated yet');
  });

  test('Share popup - unchecking the only selected option disables the action button', async () => {
    await adsLibrary.toggleShareKaaiCheckbox();

    await expect(adsLibrary.shareKaaiCheckbox).not.toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - re-checking an option enables the action button again', async () => {
    await adsLibrary.toggleShareKaaiCheckbox();
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.toggleShareKaaiCheckbox();

    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - all three options can be selected at once', async () => {
    await adsLibrary.toggleShareUgcCheckbox();
    await adsLibrary.toggleSharePromptsCheckbox();

    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.shareUgcCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.sharePromptsCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);

    await adsLibrary.closeSharePopup();
  });
});

// ─── Generating a link (destructive: consumes one fresh ad per test) ───────────
test.describe('Share popup — generating a link', () => {
  test.setTimeout(300000);

  test.beforeEach(async () => {
    const found = await adsLibrary.findFreshSharePopup();
    test.skip(!found, 'No ad found whose share link has not been generated yet');
  });

  test('Share popup - generating a link returns a valid URL', async () => {
    await adsLibrary.generateShareLink();

    expect(await adsLibrary.getGeneratedShareLink()).toMatch(/^https?:\/\/.+/);

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - generating a link reveals the link input and Copy button', async () => {
    await adsLibrary.generateShareLink();

    await expect(adsLibrary.shareLinkInput).toBeVisible();
    await expect(adsLibrary.shareCopyBtn).toBeVisible();

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - after generating, the action button becomes a disabled "Regenerate Link"', async () => {
    await adsLibrary.generateShareLink();

    await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - changing an option after generating re-enables Regenerate Link', async () => {
    await adsLibrary.generateShareLink();
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.toggleShareUgcCheckbox();

    await expect(adsLibrary.shareActionBtn).not.toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - generated link input is readonly and typing does not change it', async ({ page }) => {
    await adsLibrary.generateShareLink();
    const link = await adsLibrary.getGeneratedShareLink();

    await expect(adsLibrary.shareLinkInput).toHaveAttribute('readonly', '');

    await adsLibrary.shareLinkInput.click();
    await page.keyboard.type('EDIT_ATTEMPT');

    expect(await adsLibrary.getGeneratedShareLink()).toBe(link);

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - generating with all three options selected returns a valid URL', async () => {
    await adsLibrary.toggleShareUgcCheckbox();
    await adsLibrary.toggleSharePromptsCheckbox();

    await adsLibrary.generateShareLink();

    expect(await adsLibrary.getGeneratedShareLink()).toMatch(/^https?:\/\/.+/);
    await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');

    await adsLibrary.closeSharePopup();
  });
});

// ─── Persistence and no cross-ad carryover ────────────────────────────────────
// Each test generates on its own freshly-discovered ad and reopens it WITHIN THE SAME
// page session. Remembering {row, card} across tests does not work: every test logs in
// again and the "Recently Added" grid can reorder between loads, so the same coordinates
// can resolve to a different ad.
test.describe('Share popup — link persistence and no carryover', () => {
  test.setTimeout(300000);

  test('Share popup - a generated link is still shown when the popup is reopened', async () => {
    const target = await adsLibrary.findFreshSharePopup();
    test.skip(!target, 'No ad found whose share link has not been generated yet');

    await adsLibrary.generateShareLink();
    const savedLink = await adsLibrary.getGeneratedShareLink();
    expect(savedLink).toMatch(/^https?:\/\/.+/);
    await adsLibrary.closeSharePopup();

    // Same session, same card — the link must come back from the server
    await adsLibrary.openSharePopupOnCard(target.row, target.card);

    await expect(adsLibrary.shareLinkInput).toBeVisible();
    expect(await adsLibrary.getGeneratedShareLink()).toBe(savedLink);

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - a reopened ad keeps the generated state (Regenerate Link, disabled)', async () => {
    const target = await adsLibrary.findFreshSharePopup();
    test.skip(!target, 'No ad found whose share link has not been generated yet');

    await adsLibrary.generateShareLink();
    await adsLibrary.closeSharePopup();

    await adsLibrary.openSharePopupOnCard(target.row, target.card);

    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.shareActionBtn).toContainText('Regenerate Link');
    await expect(adsLibrary.shareActionBtn).toBeDisabled();

    await adsLibrary.closeSharePopup();
  });

  test('Share popup - generating on one ad leaves other ads with no link', async () => {
    const first = await adsLibrary.findFreshSharePopup();
    test.skip(!first, 'No ad found whose share link has not been generated yet');

    await adsLibrary.generateShareLink();
    await adsLibrary.closeSharePopup();

    // Any other ad still in default state proves the link did not leak across ads
    const other = await adsLibrary.findFreshSharePopup();
    test.skip(!other, 'No second fresh ad available to check for carryover');

    await expect(adsLibrary.shareLinkInput).not.toBeVisible();
    await expect(adsLibrary.shareActionBtn).toContainText('Generate Link');
    await expect(adsLibrary.shareKaaiCheckbox).toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);
    await expect(adsLibrary.shareUgcCheckbox).not.toHaveClass(adsLibrary.CHECKED_CHECKBOX_CLASS);

    await adsLibrary.closeSharePopup();
  });
});
