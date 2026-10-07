import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { LeilaWorld } from './world';

setDefaultTimeout(180_000);
let browser: Browser | undefined;

const BASE_URL = process.env.BASE_URL ?? 'https://aiquaa-sandbox-web.vercel.app';
const API_URL = process.env.SANDBOX_API_URL ?? 'https://aiquaa-sandbox-api.vercel.app';

BeforeAll(async () => {
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});

Before(async function (this: LeilaWorld) {
  if (!browser) throw new Error('Chromium no fue inicializado');
  this.context = await browser.newContext({ baseURL: BASE_URL });
  this.context.setDefaultTimeout(15_000);
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  if (process.env.SANDBOX_API_KEY) {
    this.apiContext = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'x-api-key': process.env.SANDBOX_API_KEY },
    });
  }
});

After(async function (this: LeilaWorld, { pickle, result }) {
  try {
    if (this.page && !this.page.isClosed()) {
      // Evidencia de TODOS los escenarios (el PDF la incluye).
      await this.attach(await this.page.screenshot({ fullPage: true, timeout: 5_000 }), 'image/png');
    }
    if (result?.status === Status.FAILED && this.context) {
      await mkdir('results/grupo09-leila/traces', { recursive: true });
      const safe = pickle.name.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
      const path = `results/grupo09-leila/traces/${safe}.zip`;
      await this.context.tracing.stop({ path });
      await this.attach(`Trace: ${path}`, 'text/plain');
    } else {
      await this.context?.tracing.stop();
    }
  } finally {
    await this.apiContext?.dispose();
    await this.context?.close();
  }
});

AfterAll(async () => {
  await browser?.close();
});
