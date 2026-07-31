import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../pages/kwikads';
import { AdsLibrary } from '../pages/ads-library';
import { Competitor } from '../pages/competitor';

// Minimum saved competitors the Competitors-tab suite needs.
// The merge tests need 2; 5 leaves headroom for the destructive tests that delete or
// merge cards away during a run.
const MIN_COMPETITORS = 5;

/**
 * Precondition for every Competitors-tab test: make sure saved competitors exist.
 *
 * A merchant can legitimately have zero saved competitors, which leaves those tests with
 * nothing to act on — they would skip (or worse, index into an empty list). Rather than
 * depend on whatever happens to be in the environment, this seeds them through the real
 * user flow:
 *
 *   Ad Library → Brand Name filter → select ONE brand → that brand's ads load →
 *   3-dot menu on the first ad → "Tag Competitor" → deselect the brand → next brand
 *
 * Idempotent: it counts what already exists and only tops up the difference, so a run
 * against an already-populated merchant costs one page load.
 */
test('seed saved competitors', async ({ page }) => {
  test.setTimeout(600000);

  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  const adsLibrary = new AdsLibrary(page);

  // How many are there already?
  await competitor.navigate();
  const existing = await competitor.countAllCards();
  console.log(`saved competitors before seeding: ${existing} (need ${MIN_COMPETITORS})`);

  if (existing >= MIN_COMPETITORS) {
    console.log('enough competitors already — nothing to seed');
    return;
  }

  // Seed the shortfall by tagging brands from the Ad Library
  await adsLibrary.navigateToAdsLibrary();
  const needed = MIN_COMPETITORS - existing;
  const tagged = await adsLibrary.seedCompetitorsFromBrands(needed);
  console.log(`tagged ${tagged} new competitor(s)`);

  // Confirm the Competitors tab now reflects them
  await competitor.navigate();
  const after = await competitor.countAllCards();
  console.log(`saved competitors after seeding: ${after}`);

  // Don't fail the whole run if the environment simply has too few brands with ads —
  // the per-spec precondition guards will skip those tests with a clear reason.
  if (after < MIN_COMPETITORS) {
    console.warn(
      `Only ${after} competitor(s) available after seeding (wanted ${MIN_COMPETITORS}). ` +
      `Competitor tests needing more will skip.`
    );
  }
  expect(after).toBeGreaterThan(0);
});
