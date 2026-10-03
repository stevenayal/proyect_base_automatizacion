// S_registro.steps.ts — RF-G3-04 · Crear una factura (POST /api/v1/facturas).

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { rechazo, status } from '../support/afirmaciones';
import { numeroUnico, type DatosFactura } from '../support/api/FacturasApi';
import { config } from '../support/config';
import type { G3World } from '../support/world';

/** Registra y, si la API la crea (incluso cuando no debería), la recuerda para limpiarla. */
async function registrar(world: G3World, datos: DatosFactura): Promise<void> {
  world.respuesta = await world.facturas.registrar(datos, { apiKey: world.apiKey });
  if (world.respuesta.status === 201 && world.respuesta.body?.data?.id) {
    world.factura = world.recordar(world.respuesta.body.data);
  }
}

const valida = (world: G3World, proveedor = 'ANDE'): DatosFactura => ({
  usuarioId: world.titular,
  proveedor,
  numeroFactura: numeroUnico(proveedor),
  monto: 1000,
  fechaVencimiento: '2026-12-31',
});

// ── When ──────────────────────────────────────────────────────────────────────

When(
  'el usuario registra una factura de {string} por {float} con vencimiento {string}',
  async function (this: G3World, proveedor: string, monto: number, vencimiento: string) {
    await registrar(this, { ...valida(this, proveedor), monto, fechaVencimiento: vencimiento });
  },
);

When(
  'el usuario registra una factura de {string} por {float} con vencimiento {string} indicando que ya está {string}',
  async function (this: G3World, proveedor: string, monto: number, vencimiento: string, estado: string) {
    await registrar(this, { ...valida(this, proveedor), monto, fechaVencimiento: vencimiento, estado });
  },
);

When(
  'el usuario registra una factura de {string} con vencimiento ya pasado {string}',
  async function (this: G3World, proveedor: string, vencimiento: string) {
    await registrar(this, { ...valida(this, proveedor), fechaVencimiento: vencimiento });
  },
);

When('el usuario intenta registrar otra factura con el mismo número de factura', async function (this: G3World) {
  const original = this.f;
  await registrar(this, { ...valida(this, original.proveedor), numeroFactura: original.numero });
  this.factura = original;
});

When('el usuario intenta registrar una factura del proveedor {string}', async function (this: G3World, proveedor: string) {
  await registrar(this, { ...valida(this), proveedor, numeroFactura: numeroUnico(proveedor) });
});

When('el usuario intenta registrar una factura para un usuario que no existe', async function (this: G3World) {
  await registrar(this, { ...valida(this), usuarioId: config.usuarioInexistente });
});

When(
  /^el usuario intenta registrar una factura (sin indicar el usuario|sin indicar el proveedor|sin indicar el número de factura|sin indicar el monto|con monto cero|con monto negativo|sin indicar la fecha de vencimiento)$/,
  async function (this: G3World, caso: string) {
    const datos: DatosFactura = valida(this);
    if (caso === 'sin indicar el usuario') delete datos.usuarioId;
    if (caso === 'sin indicar el proveedor') delete datos.proveedor;
    if (caso === 'sin indicar el número de factura') delete datos.numeroFactura;
    if (caso === 'sin indicar el monto') delete datos.monto;
    if (caso === 'con monto cero') datos.monto = 0;
    if (caso === 'con monto negativo') datos.monto = -10;
    if (caso === 'sin indicar la fecha de vencimiento') delete datos.fechaVencimiento;
    await registrar(this, datos);
  },
);

When('el usuario intenta registrar una factura con vencimiento {string}', async function (this: G3World, vencimiento: string) {
  await registrar(this, { ...valida(this), fechaVencimiento: vencimiento });
});

When('el usuario intenta registrar una factura con datos mal formados', async function (this: G3World) {
  // JSON cortado a propósito.
  this.respuesta = await this.facturas.registrarCrudo(`{ "usuarioId": ${this.titular}, "proveedor":`, { apiKey: this.apiKey });
  if (this.respuesta.status === 201 && this.respuesta.body?.data?.id) this.recordar(this.respuesta.body.data);
});

// ── Then ──────────────────────────────────────────────────────────────────────

Then('la factura se registra correctamente', async function (this: G3World) {
  status(this.r, 201);
  expect(this.r.body?.data?.id, 'data.id').toBeTruthy();
});

Then('al consultar el detalle de la factura, figura en estado {string}', async function (this: G3World, estado: string) {
  const r = await this.facturas.consultar(this.f.id, { etiqueta: 'verificación' });
  status(r, 200);
  expect(r.body?.data?.estado, 'data.estado').toBe(estado);
});

Then('el sistema rechaza la factura porque el número de factura ya existe', async function (this: G3World) {
  rechazo(this.r, 409, 'CONFLICT');
});

Then('el sistema rechaza la factura porque no puede interpretar la fecha de vencimiento', async function (this: G3World) {
  rechazo(this.r, 400, 'EXECUTION_ERROR');
});
