// world.ts — contexto compartido entre los pasos del workspace de órdenes.
//
// Cada escenario recibe un contexto de navegador nuevo; el navegador se levanta
// una sola vez por proceso. Los Page Objects se instancian por getter y se
// cachean, para que un paso y otro compartan la misma página.

import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { SandboxCursoPage } from '../pages/SandboxCursoPage';
import { SandboxLoginPage } from '../pages/SandboxLoginPage';
import { OrdenesListadoPage } from '../pages/OrdenesListadoPage';
import { OrdenesNuevaPage } from '../pages/OrdenesNuevaPage';
import { OrdenesDetallePage } from '../pages/OrdenesDetallePage';
import { OrdenesApi, UsuariosApi, type SandboxOrden, type SandboxUsuario } from './sandbox-db';

export class Grupo07World extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api?: APIRequestContext;

  /** Usuario activo consultado por SQL, el que inicia sesión en el front. */
  activeUser?: SandboxUsuario;
  /** Datos de la orden que crea el escenario, para verificarla y limpiarla. */
  ordenCreada?: { id: string; producto: string; cantidad: number; precioUnitario: number };
  /** Producto que se inventó para el escenario (lleva uuid). */
  productoInventado?: string;

  private cursoPage?: SandboxCursoPage;
  private loginPage?: SandboxLoginPage;
  private listadoPage?: OrdenesListadoPage;
  private nuevaPage?: OrdenesNuevaPage;
  private detallePage?: OrdenesDetallePage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  // ---- Page Objects (CÓMO) ----------------------------------------------
  get curso(): SandboxCursoPage {
    return (this.cursoPage ??= new SandboxCursoPage(this.page));
  }

  get login(): SandboxLoginPage {
    return (this.loginPage ??= new SandboxLoginPage(this.page));
  }

  get listado(): OrdenesListadoPage {
    return (this.listadoPage ??= new OrdenesListadoPage(this.page));
  }

  get nueva(): OrdenesNuevaPage {
    return (this.nuevaPage ??= new OrdenesNuevaPage(this.page));
  }

  get detalle(): OrdenesDetallePage {
    return (this.detallePage ??= new OrdenesDetallePage(this.page));
  }

  // ---- API (verificación y limpieza) ------------------------------------
  get usuarios(): UsuariosApi {
    if (!this.api) throw new Error('Falta el contexto de API');
    return new UsuariosApi(this.api);
  }

  get ordenes(): OrdenesApi {
    if (!this.api) throw new Error('Falta el contexto de API');
    return new OrdenesApi(this.api);
  }

  /** Limpieza del After. Silencioso si el escenario no llegó a crear la orden. */
  async borrarOrdenCreada(): Promise<void> {
    if (!this.ordenCreada) return;
    try {
      const resultado = await this.ordenes.borrar(this.ordenCreada.id);
      if (resultado !== 'borrada') {
        console.warn(`Limpieza: la orden ${this.ordenCreada.id} no se borró (${resultado}).`);
      }
    } catch (error) {
      // Un fallo de limpieza no debe tapar el resultado real del escenario.
      console.warn(`Limpieza: ${(error as Error).message}`);
    }
  }
}

setWorldConstructor(Grupo07World);