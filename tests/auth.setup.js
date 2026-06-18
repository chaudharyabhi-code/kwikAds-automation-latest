import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/login';

setup('authenticate and select merchant', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login();
  await loginPage.selectMerchant();
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: '.auth/user.json' });
});
