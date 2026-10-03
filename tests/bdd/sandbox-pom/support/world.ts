import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { SandboxCoursePage } from '../pages/SandboxCoursePage';
import { SandboxLoginPage } from '../pages/SandboxLoginPage';
import { ReportesPage } from '../pages/ReportesPage';
import type { SandboxUser } from './sandbox-users-api';
import type { ResumenMovimientos } from './sandbox-reportes-api';

export class SandboxWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api?: APIRequestContext;
  activeUser?: SandboxUser;

  // Estado del escenario de reportes (Grupo 09).
  movimientoId?: string;
  resumenPrevio?: ResumenMovimientos;
  cantidadPreviaPorTipo?: number;

  private coursePage?: SandboxCoursePage;
  private loginPage?: SandboxLoginPage;
  private reportesPage?: ReportesPage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get course(): SandboxCoursePage {
    return this.coursePage ??= new SandboxCoursePage(this.page);
  }

  get login(): SandboxLoginPage {
    return this.loginPage ??= new SandboxLoginPage(this.page);
  }

  get reportes(): ReportesPage {
    return this.reportesPage ??= new ReportesPage(this.page);
  }
}

setWorldConstructor(SandboxWorld);
