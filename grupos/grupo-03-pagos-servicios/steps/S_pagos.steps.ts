// S_pagos.steps.ts — RF-G3-03 · Pagar una factura (POST /api/v1/facturas/{id}/pagar).

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { rechazo, status } from '../support/afirmaciones';
import { config } from '../support/config';
import type { G3World } from '../support/world';

/** Si el pago salió bien, la factura del escenario pasa a pagada (lo usa la verificación web). */
function registrarPago(world: G3World): void {
  if (world.r.status === 200 && world.factura) world.factura.estado = 'pagada';
}

// ── When ──────────────────────────────────────────────────────────────────────

When('el usuario paga la factura con el medio de pago {string}', async function (this: G3World, medio: string) {
  this.respuesta = await this.facturas.pagar(this.f.id, { metodoPago: medio }, { apiKey: this.apiKey });
  registrarPago(this);
});

When(
  'el usuario paga la factura con el medio de pago {string} e intenta indicar un monto de {int}',
  async function (this: G3World, medio: string, monto: number) {
    this.respuesta = await this.facturas.pagar(this.f.id, { metodoPago: medio, monto }, { apiKey: this.apiKey });
    registrarPago(this);
  },
);

When('el usuario intenta pagar nuevamente la factura con el medio de pago {string}', async function (this: G3World, medio: string) {
  this.respuesta = await this.facturas.pagar(this.f.id, { metodoPago: medio }, { apiKey: this.apiKey });
});

When('el usuario intenta pagar la factura sin indicar el medio de pago', async function (this: G3World) {
  this.respuesta = await this.facturas.pagar(this.f.id, {}, { apiKey: this.apiKey });
});

When('el usuario intenta pagar una factura que no existe', async function (this: G3World) {
  this.idInexistenteUsado = config.facturaInexistente;
  this.respuesta = await this.facturas.pagar(config.facturaInexistente, { metodoPago: 'tarjeta' }, { apiKey: this.apiKey });
});

When('el usuario intenta pagar una factura con el identificador inválido {string}', async function (this: G3World, id: string) {
  this.respuesta = await this.facturas.pagar(id, { metodoPago: 'tarjeta' }, { apiKey: this.apiKey });
});

// Regla transversal: con API key inválida (el id inexistente evita tocar una factura real).
When('el usuario intenta pagar una factura con el medio de pago {string}', async function (this: G3World, medio: string) {
  this.respuesta = await this.facturas.pagar(config.facturaInexistente, { metodoPago: medio }, { apiKey: this.apiKey });
});

When(
  'el usuario intenta usar la operación de pago de una factura con un tipo de solicitud no permitido',
  async function (this: G3World) {
    this.respuesta = await this.facturas.pagarConMetodo('GET', config.facturaInexistente, { apiKey: this.apiKey });
  },
);

// ── Then ──────────────────────────────────────────────────────────────────────

Then('la factura se paga correctamente', async function (this: G3World) {
  status(this.r, 200);
  const data = this.r.body?.data;
  expect(typeof data?.factura, 'data.factura').toBe('object');
  expect(typeof data?.pago, 'data.pago').toBe('object');
  expect(Number(data.factura.id), 'la factura pagada es la del escenario').toBe(this.f.id);
});

Then('el pago queda en estado {string}', async function (this: G3World, estado: string) {
  expect(this.r.body?.data?.pago?.estado, 'data.pago.estado').toBe(estado);
});

Then('el pago se registra con el medio de pago {string}', async function (this: G3World, medio: string) {
  expect(this.r.body?.data?.pago?.metodo_pago, 'data.pago.metodo_pago').toBe(medio);
});

Then('el monto pagado es igual al monto de la factura y no al indicado por el usuario', async function (this: G3World) {
  const { pago, factura } = this.r.body.data;
  expect(Number(pago.monto), 'data.pago.monto = monto de la factura creada').toBe(this.f.monto);
  expect(Number(pago.monto), 'data.pago.monto = data.factura.monto').toBe(Number(factura.monto));
  expect(Number(pago.monto), 'no toma el monto enviado por el usuario').not.toBe(1);
});

Then('el pago queda a nombre del titular de la factura', async function (this: G3World) {
  const { pago, factura } = this.r.body.data;
  expect(Number(pago.usuario_id), 'data.pago.usuario_id = data.factura.usuario_id').toBe(Number(factura.usuario_id));
  expect(Number(pago.usuario_id), 'data.pago.usuario_id = titular').toBe(this.titular);
});

Then('el monto pagado es igual al monto original de la factura, sin recargos', async function (this: G3World) {
  expect(Number(this.r.body.data.pago.monto), 'data.pago.monto = monto original').toBe(this.f.monto);
});

Then('el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada', async function (this: G3World) {
  rechazo(this.r, 404, 'NOT_FOUND');
});

Then('el sistema indica que la operación no está permitida', async function (this: G3World) {
  status(this.r, 405);
});

// ── Verificación posterior (consulta y base de datos) ─────────────────────────

Then('al consultar el detalle de la factura el sistema informa que no fue encontrada', async function (this: G3World) {
  rechazo(await this.facturas.consultar(this.f.id, { etiqueta: 'verificación' }), 404, 'NOT_FOUND');
});

Then('al consultar el detalle de la factura, sigue en estado {string}', async function (this: G3World, estado: string) {
  const r = await this.facturas.consultar(this.f.id, { etiqueta: 'verificación' });
  status(r, 200);
  expect(r.body?.data?.estado, 'data.estado').toBe(estado);
});

Then('en la base de datos queda registrado un solo pago para la factura', async function (this: G3World) {
  const { respuesta, cantidad } = await this.facturas.contarPagos(this.f.id);
  status(respuesta, 200);
  expect(cantidad, 'pagos registrados para la factura').toBe(1);
});

Then('en la base de datos no queda registrado ningún pago para esa factura', async function (this: G3World) {
  const { respuesta, cantidad } = await this.facturas.contarPagos(this.idInexistenteUsado ?? config.facturaInexistente);
  status(respuesta, 200);
  expect(cantidad, 'pagos registrados para la factura inexistente').toBe(0);
});
