import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test';
import { CursoPage } from '../pages/CursoPage';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { TransferenciasPage } from '../pages/TransferenciasPage';
import { TransferenciaDetallePage } from '../pages/TransferenciaDetallePage';
import { SandboxDb, type CuentaRow, type UsuarioRow } from './sandbox-db';

/**
 * Estado compartido por los steps de un escenario. Cada escenario recibe un
 * World nuevo (contexto de navegador limpio), asi los escenarios no se
 * contaminan entre si.
 */
export class Grupo02World extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api!: APIRequestContext;

  // Datos dinamicos obtenidos de la BD via /api/v1/sql/select
  usuario?: UsuarioRow;
  cuentaOrigen?: CuentaRow;
  cuentaDestino?: CuentaRow;
  descripcion?: string;
  transferenciaId?: number;
  totalAntes?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get db(): SandboxDb { return new SandboxDb(this.api); }
  get curso(): CursoPage { return new CursoPage(this.page); }
  get login(): LoginPage { return new LoginPage(this.page); }
  get home(): HomePage { return new HomePage(this.page); }
  get transferencias(): TransferenciasPage { return new TransferenciasPage(this.page); }
  get detalle(): TransferenciaDetallePage { return new TransferenciaDetallePage(this.page); }
}

setWorldConstructor(Grupo02World);
