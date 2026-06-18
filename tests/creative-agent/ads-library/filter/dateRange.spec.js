import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

const DATE_FROM = process.env.LAUNCH_DATE_FROM;
const DATE_TO   = process.env.LAUNCH_DATE_TO;

// Sets a date to local midnight 00:00:00 so .getTime() comparison is timezone-safe
const toMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ─── Test 1: Date range returns ads within range ──────────────────────────────
test('Launch Date filter - first ad in ASC order is not before start date, first ad in DESC order is not after end date', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.setDateRange(DATE_FROM, DATE_TO);

  // ── Run both sorts and collect dates first ──
  await adsLibrary.sortAsc();
  const firstAdDateAsc  = await adsLibrary.getFirstAdLaunchDate();

  await adsLibrary.sortDesc();
  const firstAdDateDesc = await adsLibrary.getFirstAdLaunchDate();

  // ── Report both results together ──
  const startDate = toMidnight(new Date(DATE_FROM));
  const endDate   = toMidnight(new Date(DATE_TO));
  const ascDate   = toMidnight(firstAdDateAsc);
  const descDate  = toMidnight(firstAdDateDesc);

  console.table({
    'ASC first ad':  { date: ascDate.toDateString(),  expected: `>= ${startDate.toDateString()}`,  pass: ascDate.getTime()  >= startDate.getTime() },
    'DESC first ad': { date: descDate.toDateString(), expected: `<= ${endDate.toDateString()}`,     pass: descDate.getTime() <= endDate.getTime()   },
  });

  // ── Soft assertions — both are checked and reported even if one fails ──
  expect.soft(ascDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
  expect.soft(descDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
});


// ─── Test 2: Future date is disabled in the calendar picker ──────────────────
test('Launch Date filter - future dates are disabled in the date picker', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Open the date range picker
  await adsLibrary.launchDateRangePicker.click();
  await page.waitForSelector('.ant-picker-dropdown', { state: 'visible' });

  // A future date cell in the Ant Design calendar carries the class "ant-picker-cell-disabled"
  const futureDateCell = page.locator('.ant-picker-dropdown .ant-picker-cell-disabled').first();

  await expect(futureDateCell).toBeVisible();

  // Clicking a disabled cell must NOT close the picker (picker remains open)
  await futureDateCell.click({ force: true });
  await expect(page.locator('.ant-picker-dropdown')).toBeVisible();
});
