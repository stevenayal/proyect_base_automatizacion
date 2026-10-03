// hooks.ts — ciclo de vida del workspace BDD de órdenes.
//
// Copia el patrón de tests/bdd/sandbox-pom/support/hooks.ts (el ejemplo del
// profesor) con dos diferencias propias de este escenario:
//   1. La limpieza de la orden creada se hace SIEMPRE, no solo al fallar.
//   2. La evidencia (screenshot + trace) se guarda solo cuando el escenario falla.

import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Grupo07World } from './world';

setDefaultTimeout(30_000);
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

After(async function (this: Grupo07World, { result }) {
  try {
    if (result?.status === Status.FAILED) {
      // Evidencia del fallo: captura + traza reproducible.
      await mkdir('results/grupo07-andrea/traces', { recursive: true });
      const tracePath = `results/grupo07-andrea/traces/${randomUUID()}.zip`;
      try {
        await this.attach(await this.page.screenshot({ timeout: 5_000 }), 'image/png');
      } finally {
        await this.context.tracing.stop({ path: tracePath });
        await this.attach(`Trace: ${tracePath}`, 'text/plain');
      }
    } else {
      await this.context.tracing.stop();
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