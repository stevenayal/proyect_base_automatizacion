// world.ts — contexto compartido entre steps (Cucumber World).
// Cada escenario recibe su propia instancia: browser, page y contexto de API aislados.

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { APIRequestContext, Browser, Page, chromium, request } from '@playwright/test';
import * as dotenv from 'dotenv';
import { LoginPage } from '../../../playwright/pages/LoginPage';
import { TarjetasPage } from '../../../playwright/pages/TarjetasPage';

dotenv.config();

export class AiquaaWorld extends World {
  browser?: Browser;
  page?: Page;

  /** Page Objects, instanciados por los steps que los necesitan. */
  loginPage?: LoginPage;
  tarjetasPage?: TarjetasPage;

  /** Contexto HTTP para los steps de API y de base de datos. */
  apiContext?: APIRequestContext;

  baseUrl = process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app/';
  apiUrl = process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app';
  apiKey = process.env.SANDBOX_API_KEY || '';

  /** Última respuesta de API: cuerpo parseado y status. */
  lastBody: any;
  lastStatus = 0;

  /** Valores guardados entre steps (alias → valor). */
  context: Record<string, unknown> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }

  async initWeb() {
    this.browser = await chromium.launch({ headless: process.env.HEADED !== 'true' });
    this.page = await this.browser.newPage({ baseURL: this.baseUrl });
  }

  /** Crea el contexto de API. `apiKey` vacía permite probar el rechazo por credencial inválida. */
  async initApi(apiKey: string = this.apiKey) {
    this.apiContext = await request.newContext({
      baseURL: this.apiUrl,
      extraHTTPHeaders: apiKey ? { 'x-api-key': apiKey } : {},
    });
  }

  /**
   * Ejecuta una petición reintentando ante 429: el sandbox limita a 30
   * peticiones por minuto y una suite completa roza ese techo.
   */
  async conReintento<T extends { status(): number }>(peticion: () => Promise<T>): Promise<T> {
    const esperaMs = Number(process.env.RATE_LIMIT_WAIT_MS ?? 20000);
    let respuesta = await peticion();
    for (let intento = 0; respuesta.status() === 429 && intento < 2; intento++) {
      await new Promise((r) => setTimeout(r, esperaMs));
      respuesta = await peticion();
    }
    return respuesta;
  }

  /** Reemplaza placeholders `{alias}` por los valores guardados en el contexto. */
  resolve(texto: string): string {
    return texto.replace(/\{(\w+)\}/g, (match, alias) =>
      alias in this.context ? String(this.context[alias]) : match);
  }

  async teardown() {
    this.loginPage = undefined;
    this.tarjetasPage = undefined;
    await this.apiContext?.dispose();
    await this.page?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(AiquaaWorld);
