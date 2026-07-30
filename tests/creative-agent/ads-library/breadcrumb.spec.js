import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// The Creative Agent route is /kwikads/creative-agent and does NOT change per tab —
// switching Ad Library / My Ads / Competitors / Collections keeps the same URL.
const CREATIVE_AGENT_PATH = 'kwikads/creative-agent';

let adsLibrary;

// The breadcrumb belongs to the Creative Agent page shell and is identical on every
// tab, so we only need to land on Creative Agent — no need to open any specific tab.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.adsLibraryContent.waitFor({ state: 'visible' });
});

// ─── Test 1: Breadcrumb shows correct path ────────────────────────────────────
test('Breadcrumb - shows Home icon and Creative Agent label on the Creative Agent page', async () => {
  // Breadcrumb container is visible
  await expect(adsLibrary.breadcrumbNav).toBeVisible();

  // Home icon link — href="/" and contains the home SVG icon
  await expect(adsLibrary.breadcrumbHomeLink).toBeVisible();
  await expect(adsLibrary.breadcrumbHomeIcon).toBeVisible();

  // Creative Agent label — href points to /kwikads. The label renders uppercased
  // ("CREATIVE AGENT") via CSS, so match case-insensitively on the DOM text.
  await expect(adsLibrary.breadcrumbCreativeAgentLink).toBeVisible();
  await expect(adsLibrary.breadcrumbCreativeAgentLink).toContainText(/creative agent/i);
});

// ─── Test 2: Home icon in breadcrumb is clickable ────────────────────────────
test('Breadcrumb - clicking the Home icon navigates away from Creative Agent to the dashboard root', async ({ page }) => {
  // Sanity check: we start on the Creative Agent route
  expect(page.url()).toContain(CREATIVE_AGENT_PATH);

  await adsLibrary.breadcrumbHomeLink.click();
  await page.waitForLoadState('networkidle');

  // Must have left the Creative Agent route entirely.
  // (The old assertion checked for 'ads-library', which no longer appears in any
  // URL — so it passed trivially and proved nothing.)
  expect(page.url()).not.toContain(CREATIVE_AGENT_PATH);
  expect(page.url()).not.toContain('kwikads');
});

// ─── Test 3: Creative Agent label in breadcrumb is clickable ─────────────────
test('Breadcrumb - clicking Creative Agent label keeps the Creative Agent page loaded with its tab bar intact', async ({ page }) => {
  await adsLibrary.breadcrumbCreativeAgentLink.click();
  await page.waitForLoadState('networkidle');

  // Still on the Creative Agent route
  expect(page.url()).toContain(CREATIVE_AGENT_PATH);

  // Page must not crash — the app shell and its tab bar stay rendered.
  // We deliberately do NOT assert any single tab's content: the Creative Agent page
  // defaults to the AI Assistant tab, so a re-mount lands there, not on Ad Library.
  await expect(adsLibrary.adsLibraryContent).toBeVisible();
  await expect(adsLibrary.aiAssistantTab).toBeVisible();
  await expect(adsLibrary.adsLibraryTab).toBeVisible();
  await expect(adsLibrary.myAdsTab).toBeVisible();
  await expect(adsLibrary.competitorsTab).toBeVisible();
  await expect(adsLibrary.collectionsTab).toBeVisible();
});
