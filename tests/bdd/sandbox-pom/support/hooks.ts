import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { SandboxWorld } from './world';

setDefaultTimeout(30_000);
let browser: Browser | undefined;

BeforeAll(async () => {
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});

Before(async function (this: SandboxWorld) {
  if (!browser) throw new Error('Chromium no fue inicializado');
  this.browser = browser;
  this.context = await browser.newContext({ baseURL: process.env.BASE_URL ?? 'https://aiquaa-sandbox-web.vercel.app' });
  this.context.setDefaultTimeout(10_000);
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.api = await request.newContext({
    baseURL: process.env.SANDBOX_API_URL ?? 'https://aiquaa-sandbox-api.vercel.app',
    extraHTTPHeaders: { 'x-api-key': process.env.SANDBOX_API_KEY ?? '' },
  });
});

After(async function (this: SandboxWorld, { result }) {
  try {
    if (result?.status === Status.FAILED) {
      await mkdir('results/traces', { recursive: true });
      const tracePath = `results/traces/${randomUUID()}.zip`;
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
    await this.api?.dispose();
    await this.context?.close();
  }
});

AfterAll(async () => {
  await browser?.close();
});
