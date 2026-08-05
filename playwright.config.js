// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
/* In headless mode the browser window defaults to 800x600. With `viewport: null` the page
   inherits that, so CI renders the ad grid at ONE card per row (locally, maximised, it is
   three) and most content sits below the fold — layout-dependent tests then behave nothing
   like a local run. Pin a realistic desktop viewport in CI; keep the real maximised window
   locally so headed debugging still uses the full screen. */
const VIEWPORT = process.env.CI ? { width: 1920, height: 1080 } : null;

/* Competitor specs that MUTATE the shared saved-competitor list, or that need a merged group
   to already exist. These run in their own project that DEPENDS on the read-only competitor
   project, so Playwright finishes every read-only test before any deletion starts.

   Without the split, the delete and merge specs ran concurrently with the merge-selection
   specs across 4 workers and drained the list underneath them — seeding 5 and deleting 3 left
   the selection tests skipping with "Needs at least 2 saved competitors; found 1". */
const COMPETITOR_MUTATING = [
  '**/competitor/delete/**/*.spec.js',
  '**/competitor/merge/merge.spec.js',
  '**/competitor/merge/mergeGroupActions.spec.js',
  '**/competitor/merge/mergeViewData.spec.js',
  '**/competitor/merge/mergedGroupCard.spec.js',
];

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 0 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 4 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html']],
  /* Per-test budget. Every test logs in from scratch (login + merchant select + KYC
     dismiss) before it does anything, which alone costs ~30-40s on the dev env — and
     any test that then opens a collection or an ad detail measured 52-56s. 60s left no
     headroom, so those failed intermittently in beforeEach/mid-test. */
  timeout: 120000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',
    /* Both of these default to 0 = "no limit, bounded only by the test timeout". That is
       what turned several failures into bare "Test timeout of 120000ms exceeded" with no
       indication of what was stuck: one click() on a permanently-disabled button, or one
       check() on a checkbox that never became actionable, silently consumed the entire
       per-test budget. Bounding them makes the offending action fail fast and name itself
       in the call log, and leaves the remaining budget for the rest of the test. */
    actionTimeout: 20000,
    navigationTimeout: 45000,
    screenshot: 'only-on-failure',
    headless: !!process.env.CI,
    viewport: VIEWPORT,
    ignoreHTTPSErrors: true,
    launchOptions: {
      slowMo: 500,
      args: [
        '--start-maximized',
      ],
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: 'tests/auth.setup.js',
    },
    /* Seeds saved competitors before the suite runs. A merchant can legitimately have
       none, which leaves every Competitors-tab test with nothing to act on. Idempotent:
       it tops up only the shortfall, so an already-populated merchant costs one page
       load. */
    {
      name: 'competitor-setup',
      testMatch: 'tests/competitor.setup.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    /* Seeds a collection that CONTAINS an ad before the suite runs. Collections and
       Select-mode tests skipped wholesale without one ("No collection with at least one ad").
       Idempotent: an already-populated merchant costs one page load. */
    {
      name: 'collection-setup',
      testMatch: 'tests/collection.setup.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    /* Everything except the Competitors tab — no competitor seeding needed, so these do
       not pay for it. */
    {
      name: 'chromium',
      testIgnore: ['**/competitor/**', '**/*.setup.js'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'collection-setup'],
    },
    /* Competitors tab only — these need saved competitors to exist, so this is the only
       project that depends on the seeder. Playwright prunes a project with no matching
       tests, so seeding is skipped when you run e.g. just an ads-library spec. */
    {
      name: 'chromium-competitor',
      testMatch: '**/competitor/**/*.spec.js',
      testIgnore: COMPETITOR_MUTATING,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'competitor-setup'],
    },
    /* Deletes and merges, plus the specs that read a merged group. Depends on the read-only
       competitor project, so nothing is still reading the list when these start consuming it. */
    {
      name: 'chromium-competitor-mutating',
      testMatch: COMPETITOR_MUTATING,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'competitor-setup', 'chromium-competitor'],
    },


    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'],
    //     storageState: '.auth/user.json',

    //    },
    //   dependencies: ['setup'],
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

