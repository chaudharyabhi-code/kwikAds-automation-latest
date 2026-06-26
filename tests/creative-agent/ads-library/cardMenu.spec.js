import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// ─── Test 1: 3-dot menu opens with exactly 3 options ─────────────────────────
test('Card 3-dot menu - opens with exactly 3 options: View Meta Ad Link, Save to Collection, Copy Library ID', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.openFirstCardMenu();

  await expect(adsLibrary.cardDropdownItems).toHaveCount(3);
  await expect(adsLibrary.cardDropdownItems.nth(0)).toContainText('View Meta Ad Link');
  await expect(adsLibrary.cardDropdownItems.nth(1)).toContainText('Save to Collection');
  await expect(adsLibrary.cardDropdownItems.nth(2)).toContainText('Copy Library ID');
});

// ─── Test 2: Copy Library ID copies the correct value ────────────────────────
test('Card 3-dot menu - Copy Library ID copies value that matches Library ID shown in card detail', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Step 1: Open card detail modal and note the Library ID shown
  await adsLibrary.openFirstCardDetail();
  const libraryIdFromModal = await adsLibrary.getCardDetailLibraryId();
  console.log('Library ID from card detail:', libraryIdFromModal);
  await adsLibrary.closeCardDetail();

  // Step 2: Use 3-dot menu → Copy Library ID
  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Copy Library ID');
  await adsLibrary.searchInputBox.click(); // Focus the input

await page.keyboard.down('Control');
await page.keyboard.down('Shift');
await page.keyboard.press('V');
await page.keyboard.up('Shift');
await page.keyboard.up('Control');
  const copiedId=await adsLibrary.searchValue();
  expect(copiedId).toBe(libraryIdFromModal);
});

// ─── Test 3: Save to Collection from 3-dot menu opens collection modal ────────
test('Card 3-dot menu - Save to Collection opens the collection selection modal', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Save to Collection');

  // Modal must appear with the collections list
  await expect(adsLibrary.saveToCollectionModal).toBeVisible();
  await expect(adsLibrary.saveToCollectionModal).toContainText('Save to Collection');

  // Select the first collection and verify the modal closes (= success)
  await adsLibrary.saveToCollectionModal.locator('[style*="cursor: pointer"]').first().click();
  await expect(adsLibrary.saveToCollectionModal).not.toBeVisible();
});

// ─── Test 4: Clicking outside the 3-dot menu closes it ───────────────────────
test('Card 3-dot menu - clicking outside the open menu closes it without any action', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.openFirstCardMenu();
  await expect(adsLibrary.cardDropdownMenu).toBeVisible();

  // Click a neutral area outside the menu
  await adsLibrary.searchInputBox.click();

  await expect(adsLibrary.cardDropdownMenu).not.toBeVisible();
});

// ─── Test 5: Only one 3-dot menu is open at a time ───────────────────────────
test('Card 3-dot menu - opening a second card menu closes the first one automatically', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Open the first card's menu
  await adsLibrary.openFirstCardMenu();
  await expect(adsLibrary.cardDropdownMenu).toBeVisible();

  // Open the second card's menu without explicitly closing the first
  await adsLibrary.openNthCardMenu(1);

  // Only one dropdown should be visible — the first must have closed automatically
  const openMenus = page.locator('.ant-dropdown:not(.ant-dropdown-hidden)');
  await expect(openMenus).toHaveCount(1);
});

// ─── Test 6: 3-dot menu closes on page scroll ────────────────────────────────
test('Card 3-dot menu - scrolling the ad grid closes the open menu', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.openFirstCardMenu();
  await expect(adsLibrary.cardDropdownMenu).toBeVisible();

  // Scroll the virtuoso ad grid downward
  const scroller = adsLibrary.adsLibraryContent.locator('.virtualized-ad-grid-scroller');
  await scroller.evaluate(el => el.scrollBy({ top: 400, behavior: 'instant' }));

  await expect(adsLibrary.cardDropdownMenu).not.toBeVisible();
});
