import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// ─── Test 1: Breadcrumb shows correct path ────────────────────────────────────
test('Breadcrumb - shows Home icon and Creative Agent label on Ad Library page', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Breadcrumb container is visible
  await expect(adsLibrary.breadcrumbNav).toBeVisible();

  // Home icon link — href="/" and contains the home SVG icon
  await expect(adsLibrary.breadcrumbHomeLink).toBeVisible();
  await expect(
    adsLibrary.breadcrumbHomeLink.locator('[aria-label="home"]')
  ).toBeVisible();

  // Creative Agent label — href points to /kwikads and text is "Creative Agent"
  await expect(adsLibrary.breadcrumbCreativeAgentLink).toBeVisible();
  await expect(adsLibrary.breadcrumbCreativeAgentLink).toContainText('Creative Agent');
});

// ─── Test 2: Home icon in breadcrumb is clickable ────────────────────────────
test('Breadcrumb - clicking the Home icon navigates to the dashboard root', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.breadcrumbHomeLink.click();
  await page.waitForLoadState('networkidle');

  // Must have navigated away from /ads-library
  expect(page.url()).not.toContain('ads-library');
});

// ─── Test 3: Creative Agent label in breadcrumb is clickable ─────────────────
test('Breadcrumb - clicking Creative Agent label stays on or reloads the Ad Library page', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.breadcrumbCreativeAgentLink.click();
  await page.waitForLoadState('networkidle');

  // URL must still contain kwikads path and Ad Library content must be visible
  expect(page.url()).toContain('kwikads');
  await expect(adsLibrary.adCardList).toBeVisible();
});
