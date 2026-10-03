import { setWorldConstructor, setDefaultTimeout, World } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import { SANDBOX_ORIGIN, SandboxLoginPage } from '../../../../playwright/pages/semana-06/LoginPage';

export class Semana06World extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  loginPage?: SandboxLoginPage;

  async initWeb(): Promise<void> {
    if (process.env.BASE_URL && process.env.BASE_URL.replace(/\/$/, '') !== SANDBOX_ORIGIN) {
      throw new Error(`Semana 06 solo permite ${SANDBOX_ORIGIN}`);
    }
    this.browser = await chromium.launch({ headless: process.env.HEADED !== 'true' });
    this.context = await this.browser.newContext({ baseURL: SANDBOX_ORIGIN });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(15000);
    this.page.setDefaultNavigationTimeout(20000);
    this.loginPage = new SandboxLoginPage(this.page);
  }

  async teardown(): Promise<void> {
    try { await this.context?.close(); }
    finally { await this.browser?.close(); }
  }
}
setDefaultTimeout(30000);
setWorldConstructor(Semana06World);
