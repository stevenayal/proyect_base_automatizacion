import { setWorldConstructor, World } from '@cucumber/cucumber';
import type {
  APIRequestContext,
  BrowserContext,
  Page
} from '@playwright/test';

import { SandboxLoginPage } from '../pages/SandboxLoginPage';
import { SandboxCoursePage } from '../pages/SandboxCoursePage';
import { ReservasPage } from '../pages/ReservasPage';
import type { SandboxUser } from './sandbox-users-api';

export class PlaywrightWorld extends World {
  context?: BrowserContext;
  page?: Page;
  api?: APIRequestContext;
  activeSandboxUser?: SandboxUser;

  private sandboxLoginPage?: SandboxLoginPage;
  private sandboxCoursePage?: SandboxCoursePage;
  private reservasPage?: ReservasPage;

  get sandboxLogin(): SandboxLoginPage {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.sandboxLoginPage ??= new SandboxLoginPage(this.page);
  }

  get sandboxCourse(): SandboxCoursePage {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.sandboxCoursePage ??= new SandboxCoursePage(this.page);
  }

  get reservas(): ReservasPage {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.reservasPage ??= new ReservasPage(this.page);
  }
}

setWorldConstructor(PlaywrightWorld);
