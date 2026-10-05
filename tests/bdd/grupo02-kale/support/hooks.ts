import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { Grupo02World } from './world';

setDefaultTimeout(180_000); // incluye esperas por rate limit (429)

const BASE_URL = process.env.BASE_URL ?? 'https://aiquaa-sandbox-web.vercel.app';
const API_URL = process.env.SANDBOX_API_URL ?? 'https://aiquaa-sandbox-api.vercel.app';

let browser: Browser | undefined;

BeforeAll(async () => {
  if (!process.env.SANDBOX_API_KEY) {
    throw new Error('Defini SANDBOX_API_KEY (x-api-key del sandbox) antes de ejecutar la suite BDD.');
  }
  browser = await chromium.launch({ headless: process.env.HEADED !== '1', slowMo: Number(process.env.SLOWMO ?? 0) });
});

Before(async function (this: Grupo02World) {
  if (!browser) throw new Error('Chromium no fue inicializado');
  this.browser = browser;
  this.context = await browser.newContext({ baseURL: BASE_URL, locale: 'es-PY' });
  this.context.setDefaultTimeout(15_000);
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.api = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { 'x-api-key': process.env.SANDBOX_API_KEY ?? '' },
  });
});

After(async function (this: Grupo02World, { result, pickle }) {
  try {
    // Evidencia: captura final de cada escenario (pasado o fallado).
    const shot = await this.page.screenshot({ fullPage: true, timeout: 5_000 }).catch(() => undefined);
    if (shot) await this.attach(shot, 'image/png');
    if (result?.status === Status.FAILED) {
      await mkdir('results/traces', { recursive: true });
      const safe = pickle.name.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
      const tracePath = `results/traces/${safe}.zip`;
      await this.context.tracing.stop({ path: tracePath });
      await this.attach(`Trace: ${tracePath} (abrir con: npx playwright show-trace ${tracePath})`, 'text/plain');
    } else {
      await this.context.tracing.stop();
    }
  } finally {
    // Limpieza: si el escenario creo una transferencia, se anula (soft-delete)
    // para no ensuciar la BD compartida del curso.
    if (this.transferenciaId && pickle.tags.some((t) => t.name === '@crea-datos')) {
      await this.api.delete(`/api/v1/transferencias/${this.transferenciaId}`).catch(() => undefined);
    }
    await this.api?.dispose();
    await this.context?.close();
  }
});

AfterAll(async () => {
  await browser?.close();
});
