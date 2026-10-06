import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  Status,
  setDefaultTimeout
} from '@cucumber/cucumber';

import {
  chromium,
  request,
  type Browser
} from '@playwright/test';

import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { PlaywrightWorld } from './world';

setDefaultTimeout(30_000);

let browser: Browser | undefined;

BeforeAll(async () => {
  browser = await chromium.launch({
    headless: process.env.HEADED !== '1'
  });
});

Before(async function (this: PlaywrightWorld) {
  if (!browser) {
    throw new Error('Chromium no fue inicializado');
  }

  this.context = await browser.newContext({
    baseURL:
      process.env.BASE_URL ??
      'https://aiquaa-sandbox-web.vercel.app'
  });

  this.context.setDefaultTimeout(10_000);
  await this.context.tracing.start({
    screenshots: true,
    snapshots: true
  });

  this.page = await this.context.newPage();

  if (process.env.SANDBOX_API_KEY) {
    this.api = await request.newContext({
      baseURL:
        process.env.API_URL ??
        'https://aiquaa-sandbox-api.vercel.app',
      extraHTTPHeaders: {
        'x-api-key': process.env.SANDBOX_API_KEY
      }
    });
  }
});

After(async function (this: PlaywrightWorld, { result }) {
  try {
    if (result?.status === Status.FAILED && this.context) {
      await mkdir(
        'grupos/grupo-08-reservas-turnos/TAREA 6 SALMAGIMENEZ/reports/traces',
        { recursive: true }
      );

      const tracePath =
        `grupos/grupo-08-reservas-turnos/TAREA 6 SALMAGIMENEZ/reports/traces/${randomUUID()}.zip`;

      try {
        if (this.page && !this.page.isClosed()) {
          await this.attach(
            await this.page.screenshot({ timeout: 5_000 }),
            'image/png'
          );
        }
      } finally {
        await this.context.tracing.stop({ path: tracePath });
        await this.attach(`Trace: ${tracePath}`, 'text/plain');
      }
    } else {
      await this.context?.tracing.stop();
    }
  } finally {
    await this.api?.dispose();
    await this.context?.close();
  }
});

AfterAll(async () => {
  await browser?.close();
});
