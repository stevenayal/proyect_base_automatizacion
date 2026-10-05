// Smoke test del contrato de locators de la Tarea 6 (Grupo 07 - Andrea Escurra).
//
// NO crea el workspace ni escribe datos: solo navega, lee y reporta.
// El sandbox web es Next.js client-side, asi que los `data-testid` no se pueden
// confirmar por HTTP: hacen falta un navegador real. Este script es el Paso 0
// de la seccion 7.5 del plan, para no descubrir un testid cambiado a mitad del
// escenario oficial.
//
// Uso: node tests/bdd/_smoke-locators.mjs
// Salida: tabla de hallazgos en stdout. Codigo de salida 0 siempre (es diagnostico).

import 'dotenv/config';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://aiquaa-sandbox-web.vercel.app';
const API_URL = process.env.SANDBOX_API_URL ?? 'https://aiquaa-sandbox-api.vercel.app';
const API_KEY = process.env.SANDBOX_API_KEY ?? '';

const rows = [];
function record(etiqueta, ok, detalle = '') {
  rows.push({ etiqueta, ok, detalle });
  console.log(`  ${ok ? 'OK   ' : 'FALLA'} ${etiqueta}${detalle ? ` -> ${detalle}` : ''}`);
}
function nota(mensaje) {
  console.log(`  ---   ${mensaje}`);
}

async function testIdPresente(page, testid) {
  return (await page.getByTestId(testid).count()) > 0;
}

async function main() {
  if (!API_KEY) {
    console.error('Falta SANDBOX_API_KEY en .env');
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  try {
    // ---------------------------------------------------------------- Fase 1
    console.log('\n[1] Flujo /curso -> /auth/login');
    await page.goto('/curso', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const radio = page.getByRole('radio', { name: /Curso 1 · Automatización/i });
    const hayRadio = (await radio.count()) > 0;
    record('Curso 1 · Automatización (radio)', hayRadio);
    if (hayRadio) await radio.first().check();

    const continuar = page.getByRole('button', { name: 'Continuar', exact: true });
    const hayContinuar = (await continuar.count()) > 0;
    record('Botón Continuar', hayContinuar);

    if (hayContinuar) {
      await Promise.all([
        page.waitForURL(/\/auth\/login/, { timeout: 20_000 }).catch(() => {}),
        continuar.click(),
      ]);
    }
    record('Llegó a /auth/login', /\/auth\/login/.test(page.url()), page.url().replace(BASE_URL, ''));

    const campoEmail = page.getByRole('textbox', { name: 'Email', exact: true });
    record('Campo Email', (await campoEmail.count()) > 0);

    const passwords = await page.locator('input[type="password"]').count();
    record('Sin campo password (login sin contraseña)', passwords === 0, `${passwords} encontrados`);

    // ---------------------------------------------------------------- Fase 2
    console.log('\n[2] Usuario activo por SQL + login');
    const res = await fetch(`${API_URL}/api/v1/sql/select`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'SELECT id, nombre, email FROM usuarios WHERE activo = $1 ORDER BY id LIMIT 1',
        params: [true],
      }),
    });
    record('POST /api/v1/sql/select', res.ok, `HTTP ${res.status}`);
    const body = res.ok ? await res.json() : { data: [] };
    const usuario = body?.data?.[0];
    record('Devuelve un usuario activo', Boolean(usuario), usuario ? `${usuario.nombre} <${usuario.email}>` : 'sin datos');

    if (usuario) {
      await campoEmail.first().fill(usuario.email);
      const ingresar = page.getByRole('button', { name: 'Ingresar', exact: true });
      record('Botón Ingresar', (await ingresar.count()) > 0);
      await ingresar.first().click();
      const bienvenida = page.getByRole('heading', { name: `Bienvenido, ${usuario.nombre}` });
      const llego = await bienvenida
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      record('Encabezado de bienvenida', llego, `esperaba "Bienvenido, ${usuario.nombre}"`);
      if (!llego) nota(`URL actual: ${page.url().replace(BASE_URL, '')}`);
    }

    // ---------------------------------------------------------------- Fase 3
    console.log('\n[3] /ordenes (RF-G7-01)');
    await page.goto('/ordenes', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    record('Tabla del listado', await testIdPresente(page, 'ordenes-list'));

    const filas = await page.locator('[data-testid^="ordenes-row-"]').count();
    record('Filas con data-testid ordenes-row-*', filas > 0, `${filas} filas`);
    const montos = await page.locator('[data-testid^="ordenes-row-"] [data-value]').count();
    record('Montos con atributo data-value', montos > 0, `${montos} montos`);
    if (montos > 0) {
      const primerMonto = await page.locator('[data-testid^="ordenes-row-"] [data-value]').first();
      const valor = await primerMonto.getAttribute('data-value');
      const texto = (await primerMonto.innerText()).trim();
      nota(`data-value="${valor}" | texto en pantalla="${texto}" (el texto va con formato local)`);
    }

    // ---------------------------------------------------------------- Fase 4
    console.log('\n[4] /ordenes/new (RF-G7-02)');
    await page.goto('/ordenes/new', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    record('Formulario', await testIdPresente(page, 'ordenes-form'));
    record('Campo usuarioId', await testIdPresente(page, 'ordenes-field-usuarioId'));
    record('Ítem 0 - producto', await testIdPresente(page, 'ordenes-field-items-0-producto'));
    record('Ítem 0 - cantidad', await testIdPresente(page, 'ordenes-field-items-0-cantidad'));
    record('Ítem 0 - precioUnitario', await testIdPresente(page, 'ordenes-field-items-0-precioUnitario'));
    record('Botón agregar ítem', await testIdPresente(page, 'ordenes-agregar-item'));
    record('Botón confirmar', await testIdPresente(page, 'ordenes-submit'));

    const usuarioId = page.getByTestId('ordenes-field-usuarioId');
    if ((await usuarioId.count()) > 0) {
      const valor = await usuarioId.first().inputValue().catch(() => '');
      nota(`usuarioId por defecto = "${valor}"`);
    }

    // ---------------------------------------------------------------- Fase 5
    console.log('\n[5] /ordenes/1 (RF-G7-03)');
    await page.goto('/ordenes/1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    record('Cabecera del detalle', await testIdPresente(page, 'ordenes-detail'));
    record('Tabla de ítems', await testIdPresente(page, 'ordenes-row-1-items'));

    if (await testIdPresente(page, 'ordenes-detail')) {
      const detalle = page.getByTestId('ordenes-detail');
      const etiquetas = await detalle.locator('dt').allInnerTexts();
      nota(`<dt> encontrados: ${etiquetas.map((t) => t.trim()).join(' | ') || '(ninguno)'}`);
      const dataValues = await detalle.locator('[data-value]').count();
      record('Monto con data-value dentro del detalle', dataValues > 0, `${dataValues}`);
      const quita = await page.getByTestId('ordenes-row-0-quitar').isDisabled().catch(() => null);
      if (quita !== null) nota(`ordenes-row-0-quitar deshabilitado con un solo ítem: ${quita}`);
    }
  } catch (error) {
    console.error('\nERROR inesperado:', error?.message ?? error);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }

  // ---------------------------------------------------------------- Resumen
  const fallados = rows.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(72)}`);
  console.log(`RESULTADO: ${rows.length - fallados.length}/${rows.length} verificaciones OK`);
  if (fallados.length) {
    console.log('\nFALLARON (revisar la seccion 6 del plan antes de escribir los POM):');
    for (const f of fallados) console.log(`  - ${f.etiqueta} ${f.detalle}`);
    process.exitCode = 1;
  } else {
    console.log('El contrato de locators de la seccion 6 esta vigente.');
  }
}

await main();