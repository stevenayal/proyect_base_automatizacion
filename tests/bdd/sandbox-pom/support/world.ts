import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { SandboxCoursePage } from '../pages/SandboxCoursePage';
import { SandboxLoginPage } from '../pages/SandboxLoginPage';
import type { SandboxUser } from './sandbox-users-api';

export class SandboxWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api?: APIRequestContext;
  activeUser?: SandboxUser;
  private coursePage?: SandboxCoursePage;
  private loginPage?: SandboxLoginPage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get course(): SandboxCoursePage {
    return this.coursePage ??= new SandboxCoursePage(this.page);
  }

  get login(): SandboxLoginPage {
    return this.loginPage ??= new SandboxLoginPage(this.page);
  }
}

setWorldConstructor(SandboxWorld);
