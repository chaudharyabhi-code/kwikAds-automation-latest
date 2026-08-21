import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds, PERF_DEFAULTS } from '../../../../pages/my-ads';

const DIMENSION_TABS = ['Hook', 'Narration', 'Message Style', 'Visual Style'];
const ALL_TABS = ['Ad Level', ...DIMENSION_TABS];

// Each dimension tab groups by one KAAI attribute. The KAAI Analysis tab renders every
// attribute identically, so the tab is fully described by the label of the row it groups on.
const KAAI_FIELD = {
  'Hook': 'Hook Type',
  'Narration': 'Structure',
  'Message Style': 'Message Angle',
  'Visual Style': 'Product Show',
};

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await myAds.openPerformanceView();
});

// ─── Active tab highlighting ──────────────────────────────────────────────────
// The selected tab is painted white with a shadow while the rest stay transparent, so the check
// is not "the tab I clicked is highlighted" but "it is the ONLY one" — a stale highlight left on
// the previous tab is exactly the bug worth catching here.
test('Performance - only the clicked VIEW DATA BY tab is highlighted', async () => {
  for (const tab of ALL_TABS) {
    await myAds.openViewDataByTab(tab);

    const highlighted = [];
    for (const candidate of ALL_TABS) {
      if (await myAds.isViewDataByTabActive(candidate)) highlighted.push(candidate);
    }
    expect.soft(highlighted, `after clicking "${tab}", these tabs were highlighted`).toEqual([tab]);
  }
});

// ─── Format lock ──────────────────────────────────────────────────────────────
// Only Hook and Narration lock FORMAT. Both describe something only a video has — a spoken hook,
// a narration — whereas a message angle or visual style applies to an image just as well, so
// those two tabs leave the filter alone. Measured: Hook/Narration disabled=true value=Video,
// Message Style/Visual Style disabled=false value=All.
test('Performance - Hook and Narration lock FORMAT to Video and disable it', async () => {
  expect(await myAds.isPerfFormatLocked(), 'FORMAT is already locked on Ad Level').toBe(false);

  for (const tab of ['Hook', 'Narration']) {
    await myAds.openViewDataByTab(tab);
    expect.soft(await myAds.isPerfFormatLocked(), `"${tab}" left FORMAT editable`).toBe(true);
    expect.soft(await myAds.getSelectValue(myAds.perfFormatFilter),
      `"${tab}" did not force FORMAT to Video`).toBe('Video');
  }
});

test('Performance - Message Style and Visual Style leave FORMAT editable', async () => {
  for (const tab of ['Message Style', 'Visual Style']) {
    await myAds.openViewDataByTab(tab);
    expect.soft(await myAds.isPerfFormatLocked(), `"${tab}" locked FORMAT`).toBe(false);
    expect.soft(await myAds.getSelectValue(myAds.perfFormatFilter),
      `"${tab}" changed FORMAT away from All`).toBe(PERF_DEFAULTS.format);
  }
});

test('Performance - returning to Ad Level unlocks FORMAT again', async () => {
  await myAds.openViewDataByTab('Hook');
  expect(await myAds.isPerfFormatLocked(), 'Hook did not lock FORMAT').toBe(true);

  await myAds.openViewDataByTab('Ad Level');
  expect(await myAds.isPerfFormatLocked(), 'FORMAT is still locked on Ad Level').toBe(false);
});

// ─── The grouping pattern, per dimension tab ──────────────────────────────────
// One test per tab: the group is titled by its dimension value, expanding it reveals member ads
// carrying that same tag plus their own metrics, and the arrow collapses it back to one row.
for (const tab of DIMENSION_TABS) {
  test(`Performance ${tab} - groups by its ${tab} value, expands to member ads and collapses back`, async () => {
    await myAds.openViewDataByTab(tab);
    // 30s, not the 5s assertion default: Message Style and Visual Style are the two tabs that do
    // NOT lock FORMAT, so they load with FORMAT = All and far more data. On QA the table had not
    // rendered at all when this ran and the failure read "element(s) not found" for thead th.
    await expect(myAds.perfFirstColumnHeader).toHaveText(tab, { timeout: 30000 });

    const groups = await myAds.getPerfGroupTitles();
    if (groups.length === 0) {
      await expect(myAds.perfEmptyState, `"${tab}" has no groups and no empty state`).toBeVisible();
      return;
    }

    // Every group is titled, and starts collapsed
    for (const [i, title] of groups.entries()) {
      expect.soft(title, `"${tab}" group ${i} has no title`).not.toBe('');
    }
    expect(await myAds.isPerfGroupExpanded(0), `"${tab}" group 0 is already expanded`).toBe(false);
    expect(await myAds.perfAdRows.count(), `"${tab}" shows ad rows while collapsed`).toBe(0);

    await myAds.expandPerfGroup(0);
    expect(await myAds.isPerfGroupExpanded(0), 'the chevron did not turn to expanded').toBe(true);

    // Member ads carry the group's tag and their own metrics
    const ads = await myAds.getPerfAdRows();
    expect(ads.length, `expanding "${groups[0]}" revealed no ads`).toBeGreaterThan(0);
    for (const ad of ads) {
      expect.soft(ad.status, `"${ad.name}" is not tagged with its group "${groups[0]}"`)
        .toContain(groups[0]);
    }
    const spends = await myAds.getPerfAdColumnValues('Ad Spends');
    for (const [i, spend] of spends.entries()) {
      expect.soft(spend, `ad row ${i} has no Ad Spends value`).not.toBe('');
    }

    await myAds.collapsePerfGroup(0);
    expect(await myAds.isPerfGroupExpanded(0), 'the chevron did not turn back to collapsed').toBe(false);
    expect(await myAds.perfRows.count(), 'collapsing did not return to the group rows alone')
      .toBe(groups.length);
  });
}

// ─── The group title is the ad's top-ranked KAAI label ────────────────────────
// A group is named after the KAAI attribute its ads share, so the first ad's starred (top-ranked)
// tag for that attribute must read back as the group's own title.
//
// "Non KAAI" groups the ads that have no analysis at all, so there is no tag to compare — those
// groups are stepped over, and a merchant whose only group is "Non KAAI" skips the test.
for (const tab of DIMENSION_TABS) {
  test(`Performance ${tab} - the group title matches the first ad's starred KAAI ${KAAI_FIELD[tab]}`, async () => {
    await myAds.openViewDataByTab(tab);

    const titles = await myAds.getPerfGroupTitles();
    const index = titles.findIndex(title => !/^non\s*kaai$/i.test(title));
    test.skip(index === -1,
      `"${tab}" has no analysed group (titles: ${titles.join(' | ') || 'none'})`);

    await myAds.expandPerfGroup(index);
    await myAds.openPerfAdDetail(0);

    await myAds.openModalTab('KAAI Analysis');
    await expect(myAds.modalKaaiHeading).toBeVisible({ timeout: 15000 });

    const field = KAAI_FIELD[tab];
    const top = await myAds.getKaaiTopTag(field);
    expect(top, `the KAAI analysis has no "${field}" row`).not.toBeNull();
    expect(top.starred, `the first "${field}" tag is not the starred one`).toBe(true);
    expect(top.text.toLowerCase(),
      `group is "${titles[index]}" but the ad's top ${field} is "${top.text}"`)
      .toBe(titles[index].toLowerCase());

    await myAds.closeAdDetailModal();
  });
}

// ─── Every ad in a group shares the group's label ─────────────────────────────
// The single-ad check above proves the group is titled after its first ad. This proves the group
// is coherent: sample three of its ads and every one must carry the same starred label. A group
// that mixes labels would still pass the first-ad check.
test('Performance Hook - three ads in a group all carry the group title as their starred Hook Type', async () => {
  await myAds.openViewDataByTab('Hook');

  const titles = await myAds.getPerfGroupTitles();
  const index = titles.findIndex(title => !/^non\s*kaai$/i.test(title));
  test.skip(index === -1, `Hook has no analysed group (titles: ${titles.join(' | ') || 'none'})`);

  await myAds.expandPerfGroup(index);
  const ads = await myAds.getPerfAdRows();
  test.skip(ads.length < 3,
    `the "${titles[index]}" group holds ${ads.length} ad(s); this needs 3`);

  const field = KAAI_FIELD['Hook'];
  for (let i = 0; i < 3; i++) {
    await myAds.openPerfAdDetail(i);
    await myAds.openModalTab('KAAI Analysis');
    await expect(myAds.modalKaaiHeading).toBeVisible({ timeout: 15000 });

    const top = await myAds.getKaaiTopTag(field);
    expect.soft(top, `ad "${ads[i].name}" has no "${field}" row`).not.toBeNull();
    expect.soft(top?.starred, `ad "${ads[i].name}" does not star its first ${field}`).toBe(true);
    expect.soft(top?.text.toLowerCase(),
      `ad "${ads[i].name}" has top ${field} "${top?.text}" but sits in group "${titles[index]}"`)
      .toBe(titles[index].toLowerCase());

    await myAds.closeAdDetailModal();
  }
});

// ─── Action button per row level ──────────────────────────────────────────────
test('Performance Hook - the group row offers Competitor Tracker and its ads offer Creative Signals', async () => {
  await myAds.openViewDataByTab('Hook');
  test.skip(await myAds.perfGroupRows.count() === 0, 'No Hook groups on this merchant');

  expect(await myAds.getPerfGroupButtons(0),
    'the group row should offer Competitor Tracker').toContain('Competitor Tracker');

  await myAds.expandPerfGroup(0);

  expect(await myAds.getPerfAdButtons(0),
    'an ad row should offer Creative Signals').toContain('Creative Signals');
  expect(await myAds.getPerfAdButtons(0),
    'Competitor Tracker belongs to the group level, not the ad level').not.toContain('Competitor Tracker');
});

// ─── Filter state across tab switches ─────────────────────────────────────────
test('Performance - STATUS and DATE RANGE stay applied when switching to a dimension tab', async () => {
  await myAds.selectStatus('Paused');
  const [from, to] = await myAds.getPerfDateValues();

  await myAds.openViewDataByTab('Hook');

  expect(await myAds.getSelectValue(myAds.statusFilter), 'STATUS was reset by the tab switch')
    .toBe('Paused');
  expect(await myAds.getPerfDateValues(), 'DATE RANGE was reset by the tab switch')
    .toEqual([from, to]);
});

test('Performance - Ad Level keeps no lingering lock after visiting a dimension tab', async () => {
  await myAds.openViewDataByTab('Hook');
  await myAds.openViewDataByTab('Ad Level');

  await expect(myAds.perfFirstColumnHeader).toHaveText('Ad creative');
  expect(await myAds.isPerfFormatLocked()).toBe(false);

  // The filter is not merely enabled — it still filters
  await myAds.selectPerfFormat('Image');
  expect(await myAds.getSelectValue(myAds.perfFormatFilter)).toBe('Image');

  const rows = await myAds.getPerfRows();
  const wrong = rows.filter(r => r.format.toLowerCase() !== 'image');
  expect(wrong.map(r => `${r.name} → ${r.format}`),
    'Ad Level returned non-Image rows after FORMAT = Image').toEqual([]);

  // And it can be put back
  await myAds.selectPerfFormat(PERF_DEFAULTS.format);
  expect(await myAds.getSelectValue(myAds.perfFormatFilter)).toBe(PERF_DEFAULTS.format);
});



// ─── Switching tabs collapses expanded groups ─────────────────────────────────
test('Performance - switching dimension tabs leaves every group collapsed', async () => {
  await myAds.openViewDataByTab('Hook');
  test.skip(await myAds.perfGroupRows.count() === 0, 'Hook has no groups on this merchant');

  await myAds.expandPerfGroup(0);
  expect(await myAds.perfAdRows.count(), 'the group did not expand').toBeGreaterThan(0);

  await myAds.openViewDataByTab('Narration');
  expect(await myAds.perfAdRows.count(), 'Narration opened with ad rows already showing').toBe(0);

  await myAds.openViewDataByTab('Hook');
  expect(await myAds.perfAdRows.count(), 'Hook kept its group expanded after leaving and returning')
    .toBe(0);
});
