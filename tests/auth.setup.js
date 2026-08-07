import { test as setup } from '@playwright/test';
import fs from 'fs';
import { LoginPage } from '../pages/login';

const AUTH_FILE = '.auth/user.json';

/**
 * Establishes a logged-in session, REUSING the saved one when it is still valid.
 *
 * Why the reuse check matters: this setup runs on every `npx playwright test` invocation, and it
 * used to log in from scratch each time. A day of iterating — dozens of separate runs — is dozens
 * of logins, which trips the app's brute-force protection:
 * "Account temporarily locked due to suspicious login attempts. Please retry after 56 minutes."
 * Once that fires, every test in the suite is blocked, since they all depend on this project.
 *
 * Reusing a still-valid session means one login per session lifetime instead of one per run.
 */
setup('authenticate', async ({ browser }) => {
  if (fs.existsSync(AUTH_FILE)) {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();

    const stillValid = await page
      .goto(process.env.BASE_URL)
      .then(() => page.waitForURL(/executive-summary/, { timeout: 20000 }))
      .then(() => true)
      .catch(() => false);
    await context.close();

    if (stillValid) {
      console.log('reusing the saved session — no login needed');
      return;
    }
    console.log('saved session has expired — logging in again');
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login();

  // Wait until the post-login redirect lands on the executive-summary page —
  // this confirms the session is fully established before saving state.
  await page.waitForURL(/executive-summary/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Save only the login session — merchant selection happens in KwiksAdsCreativeAgent.goto()
  // on every test because merchant context is server-side and cannot be preserved via storageState
  await context.storageState({ path: AUTH_FILE });
  await context.close();
});
