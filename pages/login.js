import { Page } from '@playwright/test';

export class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = this.page.locator('input[placeholder="example@email.com"]');
    this.passwordInput = this.page.locator('input[type="password"]');
    this.otpInput = this.page.locator('input[placeholder="******"]');
    this.submitButton = this.page.locator('button[type="submit"]');
    this.otpSubmitButton = this.page.locator('button[type="button"]').nth(0);
    this.merchantChangeButton = this.page.locator('button[type="button"] span[role="img"]').nth(0);
    this.merchantChangeSearchInput = this.page.locator('div[role="dialog"] input[type="text"]');
    this.merchantSelectCheckbox = this.page.locator('div[role="dialog"] ul').locator('input[type="radio"]').nth(0);
    this.setMerchantButton = this.page.locator('div[role="dialog"] button[type="button"]').filter({hasText:"Set Merchant"});
  }

  async goto() {
    await this.page.goto(`${process.env.BASE_URL}/login`);
    await this.emailInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async enterUsername() {
    await this.emailInput.fill(process.env.LOGIN_EMAIL);
  }

  async enterOTP() {
    await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.otpInput.fill(process.env.OTP);
  }

  async enterPassword() {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.passwordInput.fill(process.env.PASSWORD);
  }

  async login() {
    await this.enterUsername();
    await this.submitButton.click();
    await this.enterPassword();

    // Surface the backend's reason for a rejected sign-in. The app swallows it completely: on a
    // 400 it silently resets the form to the email step and shows nothing, so a locked account
    // surfaced 15s later as "waiting for input[placeholder=\"******\"]" — a timeout that says
    // nothing about the real cause. The lock is the one failure worth naming, because it blocks
    // every test in the suite for the better part of an hour.
    const signin = this.page
      .waitForResponse(r => /dashboard\/user\/signin/.test(r.url()), { timeout: 30000 })
      .catch(() => null);
    await this.submitButton.click();

    const res = await signin;
    if (res && !res.ok()) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Sign-in rejected (${res.status()}): ${body.message ?? '<no message>'}`);
    }

    await this.enterOTP();
    await this.otpSubmitButton.click();
  }
  async selectMerchant() {
    await this.merchantChangeButton.click();
    await this.merchantChangeSearchInput.fill(process.env.MERCHANT_ID);
    await this.page.waitForTimeout(1000);
    await this.merchantSelectCheckbox.check();
    await this.page.waitForTimeout(1000);
    await this.setMerchantButton.click();
    // Wait for the dialog to fully close before returning — merchant context is only
    // committed once the dialog dismisses and the page settles
    await this.page.locator('div[role="dialog"]').waitFor({ state: 'hidden' });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }
}
