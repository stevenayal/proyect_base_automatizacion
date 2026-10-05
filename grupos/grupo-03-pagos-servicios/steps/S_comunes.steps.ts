// S_comunes.steps.ts — preparación de datos y respuestas comunes a varios RF.
// Reglas de capa (playwright-ai-agents-skill · BDD + POM):
//   - un step = una llamada a this.facturas (API de negocio) o al World
//   - cero locators y cero page.* en steps/
//   - los Then de negocio (status funcional, estado, montos) son BLACKLIST del Healer

import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { motivo } from '../support/api/ApiClient';
import { rechazo } from '../support/afirmaciones';
import { config } from '../support/config';
import type { G3World } from '../support/world';

// ── Background y API key ──────────────────────────────────────────────────────

Given('el usuario tiene una API key válida y activa', async function (this: G3World) {
  this.apiKey = config.apiKey;
  expect(this.apiKey, 'API key configurada (G3_API_KEY)').not.toBe('');
  // El titular se elige una vez por corrida (hooks.ts): si no se pudo, el escenario no sigue.
  expect(this.titular, 'titular de las facturas de prueba').toBeGreaterThan(0);
});

Given('el usuario tiene una API key inválida', async function (this: G3World) {
  this.apiKey = config.apiKeyInvalida;
});

// ── Preparación de facturas ───────────────────────────────────────────────────

Given('el usuario tiene una factura de {string} pendiente de pago', async function (this: G3World, proveedor: string) {
  await this.crearFacturaPendiente(proveedor);
});

Given('el usuario tiene otra factura de {string} pendiente de pago', async function (this: G3World, proveedor: string) {
  await this.crearFacturaPendiente(proveedor);
});

Given('existe una factura vencida sin pagar', async function (this: G3World) {
  // Datos sembrados: la API no permite dejar una factura en estado vencida.
  const r = await this.facturas.listar({ estado: 'vencida' }, { etiqueta: 'preparación' });
  const f = r.status === 200 && Array.isArray(r.body?.data) ? r.body.data[0] : undefined;
  if (!f) {
    if (r.status !== 200) throw new Error(`Precondición no cumplida: no se pudo listar las facturas vencidas (${motivo(r)})`);
    // Cada pago consume una vencida sembrada y la API no deja crear otras: sin datos el
    // escenario se omite (no falla) y el motivo queda en el informe.
    await this.attach('Escenario omitido: no quedan facturas vencidas sin pagar en los datos sembrados del sandbox.', 'text/plain');
    return 'skipped';
  }
  this.factura = this.recordar(f, { sembrada: true });
});

Given('la factura fue dada de baja', async function (this: G3World) {
  const r = await this.facturas.darDeBaja(this.f.id, { etiqueta: 'preparación' });
  if (r.status !== 204) throw new Error(`Precondición no cumplida: no se pudo dar de baja la factura ${this.f.id} (${motivo(r)})`);
  this.f.dadaDeBaja = true;
});

Given('la factura ya fue pagada con el medio de pago {string}', async function (this: G3World, medio: string) {
  const r = await this.facturas.pagar(this.f.id, { metodoPago: medio }, { etiqueta: 'preparación' });
  if (r.status !== 200) throw new Error(`Precondición no cumplida: no se pudo pagar la factura ${this.f.id} (${motivo(r)})`);
  this.f.estado = 'pagada';
});

// ── Respuestas comunes ────────────────────────────────────────────────────────

Then('se muestra el mensaje {string}', async function (this: G3World, mensaje: string) {
  expect(this.r.body?.error?.message, 'error.message').toBe(mensaje);
});

// 400 VALIDATION_ERROR para pago, consulta, registro, modificación y baja.
Then(
  /^el sistema rechaza (el pago|la consulta|la factura|la modificación|la baja) por datos inválidos$/,
  async function (this: G3World, _operacion: string) {
    rechazo(this.r, 400, 'VALIDATION_ERROR');
  },
);

Then('el sistema informa que la factura no fue encontrada', async function (this: G3World) {
  rechazo(this.r, 404, 'NOT_FOUND');
});

Then('el sistema rechaza el acceso por API key inválida', async function (this: G3World) {
  rechazo(this.r, 401, 'UNAUTHORIZED');
});

/** Estado de la factura en la respuesta: la del pago trae data.factura; registro y modificación, data. */
Then('la factura queda en estado {string}', async function (this: G3World, estado: string) {
  const data = this.r.body?.data;
  const actual = data?.factura ? data.factura.estado : data?.estado;
  expect(actual, data?.factura ? 'data.factura.estado' : 'data.estado').toBe(estado);
});
