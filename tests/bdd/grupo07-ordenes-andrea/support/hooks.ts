// hooks.ts — ciclo de vida del workspace BDD de órdenes.
//
// Copia el patrón de tests/bdd/sandbox-pom/support/hooks.ts (el ejemplo del
// profesor) con cuatro diferencias propias de este escenario:
//   1. La limpieza de la orden creada se hace SIEMPRE, no solo al fallar.
//   2. Cada paso QUE PASA adjunta su captura fullPage, para que el reporte de
//      Cucumber muestre la vista que dejó cada paso y no solo la del fallo.
//   3. Al terminar se deja una captura suelta con el nombre que espera el
//      anexo de evidencias del reporter (<ID>-<PASSED|FAILED>-<sello>.png).
//   4. El trace (.zip) se sigue guardando solo cuando el escenario falla.

import {
  After,
  AfterAll,
  AfterStep,
  Before,
  BeforeAll,
  Status,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Grupo07World } from './world';

setDefaultTimeout(30_000);

// La misma carpeta que usa el workspace en cucumber.js (RESULTS_DIR).
const RESULTS_DIR = 'results/grupo07-andrea';

// Regex de ID de escenario: el mismo del reporter (bdd_report.py, ID_TAG_RE).
// El ID del anexo es el tag sin la "@": "OE-G07-01".
const ID_TAG_RE = /^@[A-Z]+\d*-[A-Z0-9]+-\d+$/;

function idEscenario(tags: readonly string[]): string | undefined {
  const tag = tags.find((t) => ID_TAG_RE.test(t));
  return tag ? tag.replace(/^@/, '') : undefined;
}

let browser: Browser | undefined;

BeforeAll(async () => {
  // HEADED=1 abre el navegador visible, útil para depurar a ojo.
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});

Before(async function (this: Grupo07World) {
  if (!browser) throw new Error('Chromium no fue inicializado');
  this.browser = browser;
  this.context = await browser.newContext({
    baseURL: process.env.BASE_URL ?? 'https://aiquaa-sandbox-web.vercel.app',
  });
  this.context.setDefaultTimeout(10_000);
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();

  // Contexto aparte para la API: mismo origen de datos, otra vía.
  this.api = await request.newContext({
    baseURL: process.env.SANDBOX_API_URL ?? 'https://aiquaa-sandbox-api.vercel.app',
    extraHTTPHeaders: { 'x-api-key': process.env.SANDBOX_API_KEY ?? '' },
  });
});

AfterStep(async function (this: Grupo07World, { result }) {
  // Evidencia visual del recorrido: la captura va adjunta al paso, así aparece
  // bajo ese paso en el reporte HTML y en el JSON de Cucumber. Solo cuando el
  // paso pasó: si falló, su error ya es la evidencia y el After adjunta la
  // captura del fallo.
  if (result?.status !== Status.PASSED) return;
  try {
    await this.attach(await this.page.screenshot({ fullPage: true, timeout: 5_000 }), 'image/png');
  } catch (error) {
    // Una captura que no se puede tomar no debe tumbar el escenario.
    console.warn(`Evidencia: no se pudo capturar el paso (${(error as Error).message}).`);
  }
});

After(async function (this: Grupo07World, { pickle, result }) {
  try {
    // Evidencia del fallo: captura + traza reproducible.
    if (result?.status === Status.FAILED) {
      await mkdir(`${RESULTS_DIR}/traces`, { recursive: true });
      const tracePath = `${RESULTS_DIR}/traces/${randomUUID()}.zip`;
      try {
        await this.attach(await this.page.screenshot({ timeout: 5_000 }), 'image/png');
      } finally {
        await this.context.tracing.stop({ path: tracePath });
        await this.attach(`Trace: ${tracePath}`, 'text/plain');
      }
    } else {
      await this.context.tracing.stop();
    }

    // Evidencia del escenario para el anexo del reporter. Va antes de borrar la
    // orden y en un try/finally propio: la limpieza no puede quedar sin hacer si
    // la captura falla.
    const id = idEscenario((pickle?.tags ?? []).map((tag) => tag.name));
    if (id) {
      const png = await this.page.screenshot({ fullPage: true, timeout: 5_000 });
      const estado = result?.status === Status.FAILED ? 'FAILED' : 'PASSED';
      await mkdir(RESULTS_DIR, { recursive: true });
      await writeFile(`${RESULTS_DIR}/${id}-${estado}-${Date.now()}.png`, png);
      await this.attach(png, 'image/png');
    }
  } finally {
    await this.borrarOrdenCreada();
    await this.api?.dispose();
    await this.context?.close();
  }
});

AfterAll(async () => {
  await browser?.close();
});