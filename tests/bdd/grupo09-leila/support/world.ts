import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';
import { SandboxSessionPage } from '../pages/SandboxSessionPage';
import { RolesPage } from '../pages/RolesPage';
import { ReportesPage } from '../pages/ReportesPage';
import { SandboxApi, type UsuarioSandbox } from './sandbox-api';

export class LeilaWorld extends World {
  context?: BrowserContext;
  page?: Page;
  apiContext?: APIRequestContext;
  usuario?: UsuarioSandbox;

  private get p(): Page {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.page;
  }

  get session() { return new SandboxSessionPage(this.p); }
  get roles() { return new RolesPage(this.p); }
  get reportes() { return new ReportesPage(this.p); }

  get api(): SandboxApi {
    if (!this.apiContext) throw new Error('Falta SANDBOX_API_KEY para usar la API del sandbox');
    return new SandboxApi(this.apiContext);
  }
}
setWorldConstructor(LeilaWorld);
