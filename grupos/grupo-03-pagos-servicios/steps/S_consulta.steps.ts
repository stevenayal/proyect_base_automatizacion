// S_consulta.steps.ts — RF-G3-02 · Consultar una factura (GET /api/v1/facturas/{id}).

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { status } from '../support/afirmaciones';
import { config } from '../support/config';
import type { G3World } from '../support/world';

When('el usuario consulta el detalle de la factura', async function (this: G3World) {
  this.respuesta = await this.facturas.consultar(this.f.id, { apiKey: this.apiKey });
});

When('el usuario consulta el detalle de una factura que no existe', async function (this: G3World) {
  this.respuesta = await this.facturas.consultar(config.facturaInexistente, { apiKey: this.apiKey });
});

When(
  'el usuario consulta el detalle de una factura con el identificador inválido {string}',
  async function (this: G3World, id: string) {
    this.respuesta = await this.facturas.consultar(id, { apiKey: this.apiKey });
  },
);

Then('el sistema devuelve el detalle de la factura', async function (this: G3World) {
  status(this.r, 200);
  expect(Number(this.r.body?.data?.id), 'data.id').toBe(this.f.id);
});

Then('la factura tiene número de factura', async function (this: G3World) {
  const numero = this.r.body.data.numero_factura;
  expect(typeof numero === 'string' && numero.length > 0, 'data.numero_factura no vacío').toBe(true);
  expect(numero, 'coincide con el registrado').toBe(this.f.numero);
});

Then('la factura es del proveedor {string}', async function (this: G3World, proveedor: string) {
  expect(this.r.body.data.proveedor, 'data.proveedor').toBe(proveedor);
});

Then('la factura está en estado {string}', async function (this: G3World, estado: string) {
  expect(this.r.body?.data?.estado, 'data.estado').toBe(estado);
});
