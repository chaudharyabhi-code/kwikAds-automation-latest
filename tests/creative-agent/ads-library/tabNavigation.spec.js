import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

let adsLibrary;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
});

// ─── Test 0: Creative Agent lands on the AI Assistant tab by default ──────────
test('Tab navigation - Creative Agent opens on the AI Assistant tab by default', async ({ page }) => {
  // No explicit tab navigation — assert the default landing state
  await page.waitForLoadState('networkidle');

  // AI Assistant is the active tab (blue text); the others are neutral
  await expect(adsLibrary.aiAssistantTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.adsLibraryTab).not.toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.myAdsTab).not.toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.competitorsTab).not.toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.collectionsTab).not.toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
});

// ─── Test 1: All tabs are clickable and navigate to correct content ───────────
test('Tab navigation - each tab is clickable and loads its content without crash', async ({ page }) => {
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // ── Ad Library (already active after navigateToAdsLibrary) ───────────────────
  await expect(adsLibrary.adsLibraryTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.adCardList).toBeVisible();

  // ── My Ads ────────────────────────────────────────────────────────────────────
  await adsLibrary.myAdsTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await expect(adsLibrary.myAdsTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  // Page must not crash — the content wrapper stays visible
  await expect(adsLibrary.adsLibraryContent).toBeVisible();

  // ── Competitors ───────────────────────────────────────────────────────────────
  await adsLibrary.competitorsTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await expect(adsLibrary.competitorsTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.competitorSearchInput).toBeVisible();

  // ── Collections ───────────────────────────────────────────────────────────────
  await adsLibrary.collectionsTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await expect(adsLibrary.collectionsTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.adsLibraryContent).toBeVisible();

  // ── AI Assistant ──────────────────────────────────────────────────────────────
  await adsLibrary.aiAssistantTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await expect(adsLibrary.aiAssistantTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  // Content wrapper must be visible — AI assistant page must not crash
  await expect(adsLibrary.adsLibraryContent).toBeVisible();
});

// ─── Test 2: Only the clicked tab is active; others are not ──────────────────
test('Tab navigation - only the active tab has the highlighted style; others are neutral', async ({ page }) => {
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // When Competitors is active, Ad Library tab must NOT have the active color
  await adsLibrary.competitorsTab.click({ force: true });
  await page.waitForLoadState('networkidle');

  await expect(adsLibrary.competitorsTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.adsLibraryTab).not.toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
  await expect(adsLibrary.collectionsTab).not.toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);
});

// ─── Test 3: Filters reset to default after navigating away and back ──────────
test('Tab navigation - filters reset to default state after navigating away and returning', async ({ page }) => {
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Apply a Status filter
  await adsLibrary.selectStatus('Active Ads');
  await adsLibrary.waitForFilter();

  // Confirm the filter is visibly applied in the dropdown
  await expect(adsLibrary.allStatusFilter).toContainText('Active Ads');

  // Navigate away to My Ads tab
  await adsLibrary.myAdsTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await expect(adsLibrary.myAdsTab).toHaveCSS('color', adsLibrary.ACTIVE_TAB_COLOR);

  // Return to Ad Library by clicking the tab directly
  await adsLibrary.adsLibraryTab.click({ force: true });
  await page.waitForLoadState('networkidle');
  await adsLibrary.pageSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

  // Filter selection must be reset — "Active Ads" must no longer be the selected value in the dropdown
  await expect(adsLibrary.allStatusFilter).not.toContainText('Active Ads');
});
