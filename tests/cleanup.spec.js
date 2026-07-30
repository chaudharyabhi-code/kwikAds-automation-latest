import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../pages/kwikads';
import { Collections } from '../pages/collections';

/**
 * Maintenance helper — NOT part of the regular suite.
 * Deletes any leftover collections created by test runs whose cleanup hook did not
 * finish (interrupted run, timed-out afterAll, etc).
 *
 * Skipped unless CLEANUP=1, so a normal suite run can never delete data mid-flight.
 *
 * Run on demand:
 *   CLEANUP=1 npx playwright test tests/cleanup.spec.js --timeout=300000
 */
const TEST_COLLECTION_PREFIXES = [
  'playwright-test-name-only',
  'playwright-test-with-desc',
  'playwright-to-delete',
  'playwright-save-verify',
  'playwright-resave-test',
  'playwright-inline-create',
];

test('@cleanup remove leftover playwright test collections', async ({ page }) => {
  // Destructive — never run as part of a normal suite execution
  test.skip(!process.env.CLEANUP, 'Set CLEANUP=1 to run maintenance cleanup');
  test.setTimeout(300000);

  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  const removed = [];
  for (const prefix of TEST_COLLECTION_PREFIXES) {
    // A prefix can match several cards (names were once suffixed with Math.random())
    for (let guard = 0; guard < 10; guard++) {
      const card = collections.getCardByName(prefix).first();
      if (await card.count() === 0) break;
      const name = (await card.innerText()).split('\n')[0].trim();
      await collections.getCardDeleteButtonByName(prefix).first().click();
      await collections.deleteModal.waitFor({ state: 'visible', timeout: 10000 });
      await collections.deleteConfirmBtn.click();
      await collections.deleteModal.waitFor({ state: 'hidden', timeout: 15000 });
      await page.waitForLoadState('networkidle');
      removed.push(name);
    }
  }

  console.log(removed.length ? `Removed: ${removed.join(', ')}` : 'Nothing to clean up');

  // None of the test-data prefixes may remain
  for (const prefix of TEST_COLLECTION_PREFIXES) {
    await expect(collections.collectionCards.filter({ hasText: prefix })).toHaveCount(0);
  }
});
