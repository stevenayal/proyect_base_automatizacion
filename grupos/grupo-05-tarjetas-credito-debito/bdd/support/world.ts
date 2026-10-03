// world.ts — contexto por escenario: page + Page Objects (lazy) + API del módulo.
// Los steps nunca instancian Page Objects ni tocan `page`: piden this.login,
// this.tarjetas o this.api (patrón de skills/playwright-ai-agents-skill).

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { APIRequestContext, Browser, Page, chromium, request } from '@playwright/test';
import * as dotenv from 'dotenv';
import { LoginPage } from '../../playwright/pages/LoginPage';
import { TarjetasPage } from '../../playwright/pages/TarjetasPage';
import { RespuestaApi, TarjetasApi } from './tarjetas-api';

dotenv.config();

export class Grupo05World extends World {
  browser?: Browser;
  page?: Page;
  request?: APIRequestContext;

  baseUrl = process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app/';
  apiUrl = process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app';
  apiKey = process.env.SANDBOX_API_KEY || '';
  usuarioId = Number(process.env.SANDBOX_USUARIO_ID ?? 1);

  /** Tarjeta creada por el escenario: los ids sembrados cambian entre corridas. */
  tarjetaId?: number;

  /** Última respuesta de la API; los hooks la guardan como evidencia. */
  ultimaRespuesta?: RespuestaApi;

  private cache = new Map<string, unknown>();

  constructor(options: IWorldOptions) {
    super(options);
  }

  private lazy<T>(clave: string, crear: () => T): T {
    if (!this.cache.has(clave)) this.cache.set(clave, crear());
    return this.cache.get(clave) as T;
  }

  private paginaAbierta(): Page {
    if (!this.page) throw new Error('El escenario no abrió navegador: falta el tag @web');
    return this.page;
  }

  get login(): LoginPage {
    return this.lazy('login', () => new LoginPage(this.paginaAbierta()));
  }

  get tarjetas(): TarjetasPage {
    return this.lazy('tarjetas', () => new TarjetasPage(this.paginaAbierta()));
  }

  get api(): TarjetasApi {
    return this.lazy('api', () => new TarjetasApi(this.request!));
  }

  /** Id de la tarjeta del escenario; falla claro si ningún Given la creó. */
  tarjetaRegistrada(): number {
    if (this.tarjetaId === undefined) throw new Error('El escenario no registró ninguna tarjeta');
    return this.tarjetaId;
  }

  async initWeb() {
    this.browser = await chromium.launch({ headless: process.env.HEADED !== 'true' });
    this.page = await this.browser.newPage({ baseURL: this.baseUrl });
  }

  /** Crea el contexto HTTP. `apiKey` vacía permite probar el rechazo por credencial inválida. */
  async initApi(apiKey: string = this.apiKey) {
    await this.request?.dispose();
    this.cache.delete('api');
    this.request = await request.newContext({
      baseURL: this.apiUrl,
      extraHTTPHeaders: apiKey ? { 'x-api-key': apiKey } : {},
    });
  }

  async teardown() {
    this.cache.clear();
    await this.request?.dispose();
    await this.page?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(Grupo05World);
