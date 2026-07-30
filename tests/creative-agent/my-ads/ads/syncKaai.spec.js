import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

let myAds;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});

// ─── Test 1: Hovering sync icon shows "Sync KAAI" tooltip ────────────────────
test('My Ads - Sync KAAI: hovering over refresh icon shows Sync KAAI tooltip', async () => {
  await myAds.syncButton.hover();

  await expect(myAds.syncKaaiTooltip).toBeVisible({ timeout: 5000 });
  await expect(myAds.syncKaaiTooltip).toHaveText('Sync KAAI');
});

// ─── Test 2: Clicking sync opens confirm modal with correct content ───────────
test('My Ads - Sync KAAI: clicking refresh icon opens Sync KAAI confirmation modal', async () => {
  await myAds.openSyncKaaiModal();

  await expect(myAds.syncKaaiModal).toContainText('Sync KAAI');
  await expect(myAds.syncKaaiModal).toContainText('This will trigger a KAAI sync for your ads');
  await expect(myAds.syncKaaiModalCancelBtn).toBeVisible();
  await expect(myAds.syncKaaiModalSyncBtn).toBeVisible();
});

// ─── Test 3: Clicking Cancel closes the modal without triggering sync ─────────
test('My Ads - Sync KAAI: clicking Cancel closes the modal without triggering sync', async ({ page }) => {
  // Track whether op6 (KAAI sync API) is called
  let syncApiCalled = false;
  page.on('request', (req) => {
    if (req.url().includes('op6') || req.postData()?.includes('op6')) {
      syncApiCalled = true;
    }
  });

  await myAds.openSyncKaaiModal();
  await myAds.syncKaaiModalCancelBtn.click();

  await expect(myAds.syncKaaiModal).not.toBeVisible();
  expect(syncApiCalled).toBe(false);
});

// ─── Test 4: Confirming sync shows loading state and triggers the API ─────────
test('My Ads - Sync KAAI: clicking Sync button shows loading state and triggers KAAI sync API', async ({ page }) => {
  // Intercept the sync API call (op6 operation) — 502 is a backend issue, not UI
  const syncRequestPromise = page.waitForRequest(
    (req) => {
      const body = req.postData() ?? '';
      return body.includes('op6') || req.url().includes('op6');
    },
    { timeout: 15000 }
  );

  await myAds.openSyncKaaiModal();

  // Sync button in modal should show loading indicator after click
  await myAds.syncKaaiModalSyncBtn.click();
  const loadingBtn = myAds.syncKaaiModal.locator('button.ant-btn-primary.ant-btn-loading');
  await expect(loadingBtn).toBeVisible({ timeout: 5000 });

  // Verify the sync API was actually invoked
  const syncRequest = await syncRequestPromise;
  expect(syncRequest).toBeTruthy();

  console.log('Sync KAAI API URL:', syncRequest.url());
});
