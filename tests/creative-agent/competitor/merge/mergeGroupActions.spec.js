import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';


let competitor;

// File-level shared setup — also applies to tests inside the describe block below.
// Index of the merged-group card, discovered per run. Merge order is not guaranteed,
// so the merged card is not necessarily the first one in the list.
let mergedCard;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  mergedCard = await competitor.findMergedGroupCardIndex();
  // competitor.setup.js seeds a merged group, so a missing one is a real failure, not a skip.
  expect(mergedCard, 'no merged group card exists — competitor.setup.js should have seeded one').not.toBe(-1);
});

test('Merged group - Sync button triggers sync popover', async () => {
  await competitor.syncCompetitor(mergedCard);

  await expect(competitor.syncPopover).toBeVisible();
  await expect(competitor.syncPopover).toContainText(/Starting|Syncing/);
});

test('Merged group - View Ads navigates to Ad Library with brand filter applied', async () => {
  await competitor.clickViewAds(mergedCard);

  await expect(competitor.adLibraryGrid).toBeVisible();
  await expect(competitor.adLibraryBrandFilterTag).toBeVisible();
  const filterText = await competitor.adLibraryBrandFilterTag.innerText();
  expect(filterText.trim().length).toBeGreaterThan(0);
});

// Delete modal check (cancel) and confirm delete must run in serial —
// confirm permanently removes the merged group card.
test.describe.serial('Merged group - Delete flow', () => {

  test('Delete opens modal with correct buttons', async () => {
    await competitor.deleteCompetitor(mergedCard);

    await expect(competitor.removeCompetitorModal).toBeVisible();
    await expect(competitor.removeCompetitorConfirmBtn).toBeVisible();
    await expect(competitor.removeCompetitorCancelBtn).toBeVisible();

    await competitor.removeCompetitorCancelBtn.click();
    await expect(competitor.removeCompetitorModal).not.toBeVisible();
  });

  // Must be last — permanently deletes the merged group
  test('Delete confirm - shows success toast and decrements saved count by 1', async () => {
    const countBefore = await competitor.getSavedCount();

    await competitor.deleteCompetitor(mergedCard);
    await expect(competitor.removeCompetitorModal).toBeVisible();

    await competitor.removeCompetitorConfirmBtn.click();

    await expect(competitor.successToast).toBeVisible();
    await expect(competitor.successToast).toContainText('deleted');

    // Poll rather than read once: the "Saved Competitors (N)" heading is repainted by a
    // refetch that lands AFTER the success toast, so an immediate read still returned the
    // pre-delete value (observed countAfter 2 where countBefore-1 was 1).
    await expect
      .poll(() => competitor.getSavedCount(), { timeout: 15000 })
      .toBe(countBefore - 1);
  });
});
