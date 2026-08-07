import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';
import path from 'path';
import fs from 'fs';

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});


// Real fixtures in creatives/ at the repo root. Paths resolve from cwd, which is the repo root
// when Playwright runs.
const creative = (f) => path.join(process.cwd(), 'creatives', f);
const VALID_FILES     = ['1mb.png', '2mb.jpg', '1mb.mp4', '1mb.mov'];   // all under the 50MB cap
const OVERSIZED_FILES = ['56mb.png', '56mb.jpg', '71mb.mp4', '71mb.mov'];
const SAMPLE = creative('1mb.png');
const SAMPLE1 = creative('2mb.jpg');

const INVALID_FILES = ['Dummy.md', 'Dummy.txt','Dummy.docx','Dummy.pdf'].map(f => path.join(process.cwd(), 'unsupported-draft', f));

// The same real creative under a one-off name. ONLY the upload test needs this: re-running with
// a fixed filename would hit the duplicate path on the FIRST upload, which is precisely what
// that test has to avoid.
// A RANDOM suffix as well as the timestamp. The upload tests run in parallel, and two workers
// can call this inside the same millisecond — identical names, and because the app dedupes by
// filename one of them is then rejected as a duplicate and fails for the wrong reason.
const uniqueName = () => `pw-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const uniqueUpload = () => ({
  name: `${uniqueName()}.png`,
  mimeType: 'image/png',
  buffer: fs.readFileSync(SAMPLE),
});
// Sourced from 2mb.jpg, so the extension and mime type must say jpeg — naming JPEG bytes .png
// is the kind of mismatch an upload validator is entitled to reject.
const uniqueUpload1 = () => ({
  name: `${uniqueName()}.jpg`,
  mimeType: 'image/jpeg',
  buffer: fs.readFileSync(SAMPLE1),
});

// ─── Test 1: the + button opens the upload modal with its details ─────────────
test('My Ads - "+" opens the Upload Media popup with drop zone, formats and limits', async () => {
  await myAds.openUploadModal();

  await expect(myAds.uploadModal).toContainText('Upload Media to My Ads');
  await expect(myAds.uploadDropZone).toBeVisible();
  await expect(myAds.uploadModal).toContainText('Drop files here or click to browse');
  await expect(myAds.uploadModal).toContainText(/JPG, PNG, MP4, MOV/);
  await expect(myAds.uploadModal).toContainText(/up to 50 files/);
  await expect(myAds.uploadModal).toContainText(/max 50MB each/);

  expect(await myAds.getUploadSelectedCount()).toBe(0);
  await expect(myAds.uploadDismissBtn).toBeVisible();
  await expect(myAds.uploadConfirmBtn).toBeVisible();
});

// ─── Test 2: Upload is disabled until a file is chosen ────────────────────────
test('My Ads - Upload is disabled with 0 files selected and enables once one is chosen', async () => {
  await myAds.openUploadModal();

  expect(await myAds.getUploadSelectedCount()).toBe(0);
  await expect(myAds.uploadConfirmBtn).toBeDisabled();

  await myAds.uploadFileInput.setInputFiles(SAMPLE);

  expect(await myAds.getUploadSelectedCount()).toBe(1);
  await expect(myAds.uploadConfirmBtn).toBeEnabled();
});

// ─── Test 3: a chosen file is listed as ready ─────────────────────────────────
test('My Ads - a chosen file is listed with its size and a Ready state', async () => {
  await myAds.openUploadModal();
  await myAds.uploadFileInput.setInputFiles(SAMPLE);

  await expect(myAds.uploadFileRows).toHaveCount(1);
  await expect(myAds.uploadFileRows.first()).toContainText(path.basename(SAMPLE));
  await expect(myAds.uploadFileRows.first()).toContainText(/Ready/i);
  await expect(myAds.uploadConfirmBtn).toContainText(/Upload 1 file/i);
});

// ─── Test 4: the row delete icon removes the file again ───────────────────────
test('My Ads - removing a chosen file clears the row and disables Upload again', async () => {
  await myAds.openUploadModal();
  await myAds.uploadFileInput.setInputFiles(SAMPLE);
  expect(await myAds.getUploadSelectedCount()).toBe(1);

  await myAds.uploadRowDeleteBtn(0).click();

  await expect(myAds.uploadFileRows).toHaveCount(0);
  expect(await myAds.getUploadSelectedCount()).toBe(0);
  await expect(myAds.uploadConfirmBtn).toBeDisabled();
});

// ─── Test 5: Cancel closes without uploading ──────────────────────────────────
test('My Ads - Cancel closes the popup without uploading and leaves the ad count unchanged', async () => {
  const { total: before } = await myAds.getResultsLoadedAndTotal();

  await myAds.openUploadModal();
  await myAds.uploadFileInput.setInputFiles(SAMPLE);
  expect(await myAds.getUploadSelectedCount()).toBe(1);

  await myAds.uploadDismissBtn.click();

  await expect(myAds.uploadModal).not.toBeVisible();
  expect((await myAds.getResultsLoadedAndTotal()).total).toBe(before);
});

// ─── Test 6: the X button also closes the popup ───────────────────────────────
test('My Ads - the X button closes the Upload Media popup', async () => {
  await myAds.openUploadModal();
  await myAds.uploadModalCloseBtn.click();

  await expect(myAds.uploadModal).not.toBeVisible();
});

// ─── Test 7: reopening starts from a clean slate ──────────────────────────────
test('My Ads - reopening the Upload Media popup resets the previous selection', async () => {
  await myAds.openUploadModal();
  await myAds.uploadFileInput.setInputFiles(SAMPLE);
  expect(await myAds.getUploadSelectedCount()).toBe(1);

  await myAds.uploadDismissBtn.click();
  await expect(myAds.uploadModal).not.toBeVisible();

  await myAds.openUploadModal();

  await expect(myAds.uploadFileRows).toHaveCount(0);
  expect(await myAds.getUploadSelectedCount()).toBe(0);
  await expect(myAds.uploadConfirmBtn).toBeDisabled();
});

// Uploads `file` and reports how the attempt ended, asserting nothing itself.
// Shared by the two tests below so each can make its own assertions.
async function uploadAndReportOutcome(file) {
  await myAds.openUploadModal();
  await myAds.uploadFileInput.setInputFiles(file);
  // Armed before the click — the toast is long gone by the time the upload finishes
  const toasts = await myAds.watchForToasts();
  await myAds.uploadConfirmBtn.click();
  return { outcome: await myAds.waitForUploadOutcome(), toasts };
}

// ─── Test 8: the happy path — a new creative uploads ──────────────────────────
// ADDS ONE CREATIVE. The first-attempt assertion is deliberately strict: uploads are
// intermittently rejected with "1 upload failed. Click Retry on each row." even though a retry
// then works, so this going red IS the report of that defect, not a test problem.
test('My Ads - uploading a new creative succeeds and it appears in My Ads', async () => {
  test.setTimeout(300000);

  const { total: before } = await myAds.getResultsLoadedAndTotal();
  const { outcome, toasts } = await uploadAndReportOutcome(uniqueUpload());

  if (outcome === 'failed') {
    // Clear the failed row so the merchant is left tidy, then fail with the real reason
    await myAds.uploadRowRetryBtn(0).click();
    const afterRetry = await myAds.waitForUploadOutcome();
    expect(outcome,
      `upload was rejected on the first attempt (retry then: "${afterRetry}") — `
      + `intermittent app defect, the file itself is valid`).toBe('uploaded');
  }
  expect(outcome).toBe('uploaded');

  // "Cancel" becomes "Close" once an upload completes
  await expect(myAds.uploadDismissBtn).toContainText(/Close/i);
  await myAds.uploadDismissBtn.click();

  // The confirmation toast fires only AFTER the modal is dismissed — not when the upload
  // finishes — so asserting it before this click found nothing.
  await expect.poll(async () => (await toasts()).join(' | '), { timeout: 30000 })
    .toMatch(/creative added to My Ads/i);

  await expect.poll(async () => (await myAds.getResultsLoadedAndTotal()).total, { timeout: 30000 })
    .toBeGreaterThan(before);
});

// ─── Test 9: re-uploading the same creative is rejected ───────────────────────
// ADDS ONE CREATIVE as its own setup. Self-contained on purpose: relying on a file left behind
// by the test above would make this depend on execution order, and on the very first run against
// a clean merchant there would be nothing to duplicate.
test('My Ads - re-uploading a file already in the library is rejected as a duplicate', async () => {
  test.setTimeout(300000);

  const file = uniqueUpload1();

  // Setup: get the file into the library
  const first = await uploadAndReportOutcome(file);
  expect(first.outcome,
    'could not seed the library with a file, so the duplicate case cannot be exercised')
    .toBe('uploaded');
  await myAds.uploadDismissBtn.click();
  await expect(myAds.uploadModal).not.toBeVisible();

  // The actual case: the very same file again
  const second = await uploadAndReportOutcome(file);

  await expect.poll(async () => (await second.toasts()).join(' | '), { timeout: 60000 })
    .toMatch(/already in your library/i);
  expect(second.outcome, 'a duplicate must not be uploaded again').not.toBe('uploaded');
});

// ─── Tests 9-12: each supported format under 50MB, one test per file ──────────
// A test per file rather than one loop: each stands alone, and the report names the exact
// format that broke. Selection only — none of these uploads, so no creatives are added.
for (const file of VALID_FILES) {
  test(`My Ads - ${file} is accepted (under the 50MB cap)`, async () => {
    await myAds.openUploadModal();
    await myAds.uploadFileInput.setInputFiles(creative(file));

    expect(await myAds.getUploadSelectedCount(), `${file} was not accepted`).toBe(1);
    await expect(myAds.uploadFileRows.first()).toContainText(file);
    await expect(myAds.uploadFileRows.first()).toContainText(/Ready/i);
    await expect(myAds.uploadConfirmBtn).toBeEnabled();
  });
}

// ─── Tests 13-16: each oversized file is rejected, one test per file ──────────
// The modal states "max 50MB each". An oversized file IS listed, but flagged instead of queued:
// an error alert appears, the row explains why, it does not count towards "N/50 files selected",
// and Upload stays disabled. No Retry is offered — retry exists only for genuine upload
// failures, which is correct, since retrying an over-size file could never succeed.
for (const file of OVERSIZED_FILES) {
  test(`My Ads - ${file} is rejected (over the 50MB cap)`, async () => {
    await myAds.openUploadModal();
    await myAds.uploadFileInput.setInputFiles(creative(file));

    await expect(myAds.uploadFailureAlert).toContainText(/can't be uploaded/i);
    await expect(myAds.uploadFileRows.first()).toContainText(file);
    await expect(myAds.uploadFileRows.first()).toContainText(/Too large \(max 50MB\)/i);

    // Flagged, so it never becomes a queued selection
    expect(await myAds.getUploadSelectedCount(),
      `${file} is over the cap but counted as selected`).toBe(0);
    await expect(myAds.uploadConfirmBtn).toBeDisabled();

    // Retry would be meaningless for a size rejection
    await expect(myAds.uploadRowRetryBtn(0)).toHaveCount(0);
  });
}

// trying to upload unsupported file types
for (const file of INVALID_FILES) {
  test(`My Ads - ${file} is rejected (unsupported file type)`, async () => {
    await myAds.openUploadModal();
    await myAds.uploadFileInput.setInputFiles(file);

    await expect(myAds.uploadFailureAlert).toContainText(/can't be uploaded/i);
    await expect(myAds.uploadFileRows.first()).toContainText(/Unsupported format/i);

    // Flagged, so it never becomes a queued selection
    
    await expect(myAds.uploadConfirmBtn).toBeDisabled();

    // Retry would be meaningless for an unsupported file type
    await expect(myAds.uploadRowRetryBtn(0)).toHaveCount(0);
  });
}
