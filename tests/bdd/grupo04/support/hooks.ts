import 'dotenv/config';
import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { Grupo04World } from './world';

let browser: Browser;
let session: Awaited<ReturnType<BrowserContext['storageState']>>;
const baseURL = process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app';
setDefaultTimeout(60_000);

BeforeAll(async function () {
  const email = process.env.SANDBOX_LOGIN_EMAIL;
  if (!email) throw new Error('Configurar SANDBOX_LOGIN_EMAIL en .env o en el secreto de CI.');
  browser = await chromium.launch({ headless: process.env.HEADED !== 'true' });
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/curso');
    const curso = page.getByRole('radio', { name: /Curso 1 · Automatización/ });
    await curso.check();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByRole('heading', { name: /^Bienvenido,/ }).waitFor();
    session = await context.storageState();
  } finally {
    await context.close();
  }
});

Before(async function (this: Grupo04World) {
  this.context = await browser.newContext({ baseURL, storageState: session });
  this.page = await this.context.newPage();
  this.page.on('request', request => {
    if (request.method() === 'POST' && /\/usuarios\/?$/.test(new URL(request.url()).pathname)) this.postAltas++;
  });
});

After(async function (this: Grupo04World, { result, pickle }) {
  try {
    if (this.page && result?.status === Status.FAILED) {
      await mkdir('results/screenshots', { recursive: true });
      const id = pickle.tags.find(t => t.name.startsWith('@S6-'))?.name.slice(1) || 'escenario';
      await this.attach(await this.page.screenshot({ path: `results/screenshots/${id}.png`, fullPage: true }), 'image/png');
    }
    if (this.datos) await this.attach(JSON.stringify({ escenario: pickle.name, datos: this.datos, ficha: this.ficha }), 'application/json');
  } finally { await this.context?.close(); }
});
AfterAll(async function () { await browser?.close(); });
