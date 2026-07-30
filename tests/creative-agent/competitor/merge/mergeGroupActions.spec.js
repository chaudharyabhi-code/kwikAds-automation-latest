import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

const MERGED_CARD = 0;

let competitor;

// File-level shared setup — also applies to tests inside the describe block below.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
});

test('Merged group - Sync button triggers sync popover', async () => {
  await competitor.syncCompetitor(MERGED_CARD);

  await expect(competitor.syncPopover).toBeVisible();
  await expect(competitor.syncPopover).toContainText(/Starting|Syncing/);
});

test('Merged group - View Ads navigates to Ad Library with brand filter applied', async () => {
  await competitor.clickViewAds(MERGED_CARD);

  await expect(competitor.adLibraryGrid).toBeVisible();
  await expect(competitor.adLibraryBrandFilterTag).toBeVisible();
  const filterText = await competitor.adLibraryBrandFilterTag.innerText();
  expect(filterText.trim().length).toBeGreaterThan(0);
});

// Delete modal check (cancel) and confirm delete must run in serial —
// confirm permanently removes the merged group card.
test.describe.serial('Merged group - Delete flow', () => {

  test('Delete opens modal with correct buttons', async () => {
    await competitor.deleteCompetitor(MERGED_CARD);

    await expect(competitor.removeCompetitorModal).toBeVisible();
    await expect(competitor.removeCompetitorConfirmBtn).toBeVisible();
    await expect(competitor.removeCompetitorCancelBtn).toBeVisible();

    await competitor.removeCompetitorCancelBtn.click();
    await expect(competitor.removeCompetitorModal).not.toBeVisible();
  });

  // Must be last — permanently deletes the merged group
  test('Delete confirm - shows success toast and decrements saved count by 1', async () => {
    const countBefore = await competitor.getSavedCount();

    await competitor.deleteCompetitor(MERGED_CARD);
    await expect(competitor.removeCompetitorModal).toBeVisible();

    await competitor.removeCompetitorConfirmBtn.click();

    await expect(competitor.successToast).toBeVisible();
    await expect(competitor.successToast).toContainText('deleted');

    const countAfter = await competitor.getSavedCount();
    expect(countAfter).toBe(countBefore - 1);
  });
});
