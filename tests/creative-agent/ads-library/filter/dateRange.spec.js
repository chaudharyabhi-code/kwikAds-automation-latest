import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

let adsLibrary;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
});

const DATE_FROM = process.env.LAUNCH_DATE_FROM;
const DATE_TO   = process.env.LAUNCH_DATE_TO;

// Sets a date to local midnight 00:00:00 so .getTime() comparison is timezone-safe
const toMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ─── Test 1a: oldest ad in range is not before the start date ─────────────────
test('Launch Date filter - first ad in ASC order is not before the start date', async () => {
  await adsLibrary.setDateRange(DATE_FROM, DATE_TO);
  await adsLibrary.sortAsc();

  const startDate = toMidnight(new Date(DATE_FROM));
  const ascDate   = toMidnight(await adsLibrary.getFirstAdLaunchDate());

  console.log(`ASC first ad: ${ascDate.toDateString()} | expected >= ${startDate.toDateString()}`);
  expect(ascDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
});

// ─── Test 1b: newest ad in range is not after the end date ────────────────────
test('Launch Date filter - first ad in DESC order is not after the end date', async () => {
  await adsLibrary.setDateRange(DATE_FROM, DATE_TO);
  await adsLibrary.sortDesc();

  const endDate  = toMidnight(new Date(DATE_TO));
  const descDate = toMidnight(await adsLibrary.getFirstAdLaunchDate());

  console.log(`DESC first ad: ${descDate.toDateString()} | expected <= ${endDate.toDateString()}`);
  expect(descDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
});


// ─── Test 2: Future date is disabled in the calendar picker ──────────────────
test('Launch Date filter - future dates are disabled in the date picker', async () => {
  // Open the date range picker
  await adsLibrary.launchDateRangePicker.click();
  await adsLibrary.datePickerDropdown.waitFor({ state: 'visible' });

  // A future date cell in the Ant Design calendar carries the class "ant-picker-cell-disabled"
  const futureDateCell = adsLibrary.datePickerDisabledCells.first();

  await expect(futureDateCell).toBeVisible();

  // Clicking a disabled cell must NOT close the picker (picker remains open)
  await futureDateCell.click({ force: true });
  await expect(adsLibrary.datePickerDropdown).toBeVisible();
});
