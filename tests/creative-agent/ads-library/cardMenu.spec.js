import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

let adsLibrary;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
});

// ─── Test 1: 3-dot menu opens with exactly 6 options in order ────────────────
test('Card 3-dot menu - opens with exactly 6 options: Share Creative, Download Creative, View Meta Ad Link, Save to Collection, Copy Library ID, Tag Competitor', async () => {
  await adsLibrary.openFirstCardMenu();

  await expect(adsLibrary.cardDropdownItems).toHaveCount(6);
  await expect(adsLibrary.cardDropdownItems.nth(0)).toContainText('Share Creative');
  await expect(adsLibrary.cardDropdownItems.nth(1)).toContainText('Download Creative');
  await expect(adsLibrary.cardDropdownItems.nth(2)).toContainText('View Meta Ad Link');
  await expect(adsLibrary.cardDropdownItems.nth(3)).toContainText('Save to Collection');
  await expect(adsLibrary.cardDropdownItems.nth(4)).toContainText('Copy Library ID');
  await expect(adsLibrary.cardDropdownItems.nth(5)).toContainText('Tag Competitor');
});



// ─── Test 2: Copy Library ID copies the correct value ────────────────────────
// The clipboard is read directly rather than pasted with Ctrl+V. A real paste races the
// app's asynchronous clipboard write and reads the SHARED OS clipboard, so it regularly
// picked up whatever was last copied on the machine (e.g. a file path from the editor).
test('Card 3-dot menu - Copy Library ID copies value that matches Library ID shown in card detail', async ({ page }) => {
  // Step 1: note the Library ID shown in the card detail modal
  const libraryIdFromModal = await adsLibrary.getFirstAdLibraryId();
  console.log('Library ID from card detail:', libraryIdFromModal);

  // Step 2: record what the page writes to the clipboard
  await adsLibrary.startCapturingClipboardWrites();

  // Step 3: 3-dot menu → Copy Library ID
  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Copy Library ID');

  // Step 4: the write is async — poll until it lands
  const copiedId = await adsLibrary.waitForClipboardWrite();

  expect(copiedId).toBe(libraryIdFromModal);
});

// ─── Test 3: Save to Collection from 3-dot menu opens collection modal ────────
test('Card 3-dot menu - Save to Collection opens the collection selection modal', async () => {
  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Save to Collection');

  // Modal must appear with the collections list
  await expect(adsLibrary.saveToCollectionModal).toBeVisible();
  await expect(adsLibrary.saveToCollectionModal).toContainText('Save to Collection');

  // Select the first collection and verify the modal closes (= success)
  await adsLibrary.saveToCollectionRows.first().click();
  await expect(adsLibrary.saveToCollectionModal).not.toBeVisible();
});

// ─── Test 4: Clicking outside the 3-dot menu closes it ───────────────────────
test('Card 3-dot menu - clicking outside the open menu closes it without any action', async () => {
  await adsLibrary.openFirstCardMenu();
  await expect(adsLibrary.cardDropdownMenu).toBeVisible();

  // Click a neutral area outside the menu
  await adsLibrary.searchInputBox.click();

  await expect(adsLibrary.cardDropdownMenu).not.toBeVisible();
});

// ─── Test 5: Only one 3-dot menu is open at a time ───────────────────────────
test('Card 3-dot menu - opening a second card menu closes the first one automatically', async () => {
  // Open the first card's menu
  await adsLibrary.openFirstCardMenu();
  await expect(adsLibrary.cardDropdownMenu).toBeVisible();

  // Open ANOTHER card's menu without explicitly closing the first. The card is chosen at
  // runtime: the grid renders 3 cards per row when maximised but only 1 in a headless CI
  // window, so a fixed "second card in row 0" does not exist everywhere.
  const opened = await adsLibrary.openAnotherCardMenu(0);
  test.skip(opened === -1, 'Only one ad card menu is reachable at this viewport');

  // Only one dropdown should be visible — the first must have closed automatically
  await expect(adsLibrary.openCardDropdowns).toHaveCount(1);
});

// ─── Test 6: 3-dot menu closes on page scroll ────────────────────────────────
test('Card 3-dot menu - scrolling the ad grid closes the open menu', async () => {
  await adsLibrary.openFirstCardMenu();
  await expect(adsLibrary.cardDropdownMenu).toBeVisible();

  // Scroll a full screen so the menu's anchor card definitely leaves the viewport —
  // a fixed pixel amount is not enough on a taller window (e.g. CI at 1080px).
  await adsLibrary.scrollAdGridByOneScreen();

  await expect(adsLibrary.cardDropdownMenu).not.toBeVisible();
});
