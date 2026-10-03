// hooks.ts — ciclo de vida de la corrida.
//
//   BeforeAll  contexto de la API + elección del titular (una vez por corrida)
//   Before     cliente de la API por escenario (registra las llamadas para la evidencia)
//   Before @web  navegador: 1 Chromium por proceso, 1 contexto por escenario con la sesión
//               guardada (el login por la web se hace una sola vez)
//   After      (cucumber los ejecuta en orden inverso al definido)
//              1. @web: verificación API vs web + captura      ← el primero en correr
//              2. evidencia: llamadas a la API del escenario (también en los exitosos)
//              3. @web: cierra el contexto; traza solo si el escenario falló
//              4. limpieza: da de baja las facturas creadas      ← el último
//   AfterAll   resumen de la corrida (titular, peticiones, 429, limpieza) en run-info.json

import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type APIRequestContext, type Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient, estadisticas, turno } from './api/ApiClient';
import { FacturasApi } from './api/FacturasApi';
import { config, credencialesWeb } from './config';
import { elegirTitular, infoTitular } from './titular';
import { verificarEnWeb } from './web/VerificacionWeb';
import { LoginPage } from '../playwright/pages/LoginPage';
import type { G3World } from './world';

// Ritmo de 20 req/min + posibles esperas por 429 (hasta 60 s cada una): margen amplio.
setDefaultTimeout(240_000);

let apiGlobal: APIRequestContext;
let browser: Browser | undefined;
let sesionWeb: string | undefined;
const resumen = {
  inicio: new Date().toISOString(),
  fin: '',
  escenarios: 0,
  escenariosWeb: 0,
  facturasLimpiadas: 0,
  limpiezaFallida: [] as number[],
};

BeforeAll(async function () {
  fs.mkdirSync(config.results, { recursive: true });
  apiGlobal = await request.newContext();
  await elegirTitular(new FacturasApi(new ApiClient(apiGlobal)));
});

Before(async function (this: G3World) {
  resumen.escenarios++;
  this.request = apiGlobal;
  this.http = new ApiClient(apiGlobal);
  this.facturas = new FacturasApi(this.http);
});

Before({ tags: '@web' }, async function (this: G3World) {
  resumen.escenariosWeb++;
  browser ??= await chromium.launch({ headless: !config.headed });
  if (!sesionWeb) sesionWeb = await iniciarSesionWeb(browser);
  this.context = await browser.newContext({ storageState: sesionWeb, viewport: { width: 1366, height: 900 } });
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
});

// ── After: definidos en orden inverso al de ejecución ─────────────────────────

// 4 · limpieza (corre último)
After({ name: 'Limpieza: baja de las facturas creadas por el escenario' }, async function (this: G3World) {
  for (const id of this.creadas) {
    const r = await this.facturas.darDeBaja(id, { etiqueta: 'limpieza' });
    if (r.status === 204) resumen.facturasLimpiadas++;
    else if (r.status !== 404) resumen.limpiezaFallida.push(id);
  }
});

// 3 · cierre del navegador del escenario
After({ tags: '@web', name: 'Cierre del navegador (traza solo si falló)' }, async function (this: G3World, { pickle, result }) {
  if (!this.context) return;
  if (result?.status === Status.FAILED) {
    const nombre = pickle.name.replace(/[^\w-]+/g, '_').slice(0, 80);
    const destino = path.join(config.results, 'traces', `${nombre}.zip`);
    await this.context.tracing.stop({ path: destino });
    this.log(`Traza de Playwright: ${destino} (abrir con npx playwright show-trace)`);
  } else {
    await this.context.tracing.stop();
  }
  await this.context.close();
});

// 2 · evidencia de la API (todos los escenarios)
After({ name: 'Evidencia: llamadas a la API del escenario' }, async function (this: G3World) {
  if (!this.http) return;
  await this.attach(
    JSON.stringify({ tipo: 'llamadas-api', titular: infoTitular().titular?.id ?? null, llamadas: this.http.llamadas }, null, 2),
    'application/json',
  );
});

// 1 · verificación en la web (corre primero, con las facturas todavía sin limpiar)
After({ tags: '@web', name: 'Verificación en la web: /facturas muestra lo mismo que la API' }, async function (this: G3World, { result }) {
  // Si el escenario ya falló por API, no tiene sentido comparar con la web.
  if (result?.status !== Status.PASSED) return;
  // La página consulta la misma API con la misma key: se reservan turnos para no pasarse del ritmo.
  await turno(3);
  await verificarEnWeb(this);
});

AfterAll(async function () {
  await browser?.close();
  await apiGlobal?.dispose();
  // La sesión guardada (localStorage de la web) no debe quedar en los resultados ni en el artifact.
  fs.rmSync(path.join(config.results, '.auth'), { recursive: true, force: true });
  resumen.fin = new Date().toISOString();
  const info = {
    ...resumen,
    titular: infoTitular().titular,
    errorTitular: infoTitular().error || null,
    rpm: config.rpm,
    apiUrl: config.apiUrl,
    webUrl: config.webUrl,
    peticiones: estadisticas.peticiones,
    rechazos429: estadisticas.rechazos429,
    esperas429Seg: Math.round(estadisticas.esperas429Ms / 1000),
  };
  fs.writeFileSync(path.join(config.results, 'run-info.json'), JSON.stringify(info, null, 2));
  console.log(
    `\n[G3] titular ${info.titular?.id ?? '-'} · ${info.peticiones} peticiones a la API · ${info.rechazos429} con 429 ` +
      `(reintentadas) · ${info.facturasLimpiadas} facturas dadas de baja en la limpieza`,
  );
});

/** Login por la web una sola vez; la sesión (localStorage) queda en un archivo para los demás escenarios. */
async function iniciarSesionWeb(b: Browser): Promise<string> {
  const { email, curso } = credencialesWeb();
  const destino = path.join(config.results, '.auth', 'web.json');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const context = await b.newContext();
  try {
    const page = await context.newPage();
    await new LoginPage(page, config.webUrl).iniciarSesion(curso, email);
    await context.storageState({ path: destino });
  } finally {
    await context.close();
  }
  return destino;
}
