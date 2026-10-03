// S_modificacion_baja.steps.ts — RF-G3-05 · Reemplazar (PUT) y RF-G3-06 · Dar de baja (DELETE).

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { rechazo, status } from '../support/afirmaciones';
import { numeroUnico, type DatosFactura } from '../support/api/FacturasApi';
import { config } from '../support/config';
import type { G3World, FacturaEscenario } from '../support/world';

/** Cuerpo completo del reemplazo a partir de la factura del escenario. */
const reemplazo = (f: FacturaEscenario, cambios: DatosFactura = {}): DatosFactura => ({
  proveedor: f.proveedor,
  numeroFactura: f.numero,
  monto: f.monto,
  fechaVencimiento: '2026-12-31',
  ...cambios,
});

async function modificar(world: G3World, id: number, datos: DatosFactura): Promise<void> {
  world.respuesta = await world.facturas.modificar(id, datos, { apiKey: world.apiKey });
}

// ── RF-G3-05 · When ───────────────────────────────────────────────────────────

When('el usuario modifica el monto de la factura a {int}', async function (this: G3World, monto: number) {
  await modificar(this, this.f.id, reemplazo(this.f, { monto }));
  if (this.r.status === 200) this.f.monto = Number(this.r.body.data.monto);
});

When('el usuario modifica la factura indicando que ya está {string}', async function (this: G3World, estado: string) {
  await modificar(this, this.f.id, reemplazo(this.f, { monto: 90000, estado }));
});

When(
  'el usuario modifica la factura de {string} asignándole el número de la factura de {string}',
  async function (this: G3World, destino: string, origen: string) {
    const aModificar = this.porProveedor[destino];
    const conElNumero = this.porProveedor[origen];
    if (!aModificar || !conElNumero) throw new Error(`El escenario no preparó facturas de ${destino} y ${origen}`);
    await modificar(this, aModificar.id, reemplazo(aModificar, { numeroFactura: conElNumero.numero, monto: 5000 }));
  },
);

When('el usuario intenta modificar una factura que no existe', async function (this: G3World) {
  await modificar(this, config.facturaInexistente, {
    proveedor: 'ANDE',
    numeroFactura: numeroUnico('ANDE'),
    monto: 5000,
    fechaVencimiento: '2026-12-31',
  });
});

When('el usuario intenta modificar la factura', async function (this: G3World) {
  await modificar(this, this.f.id, reemplazo(this.f, { monto: 5000 }));
});

When(
  /^el usuario intenta modificar la factura (con un proveedor no permitido|sin indicar el proveedor|con monto cero)$/,
  async function (this: G3World, caso: string) {
    const datos = reemplazo(this.f, { monto: 1000 });
    if (caso === 'con un proveedor no permitido') datos.proveedor = 'Claro';
    if (caso === 'sin indicar el proveedor') delete datos.proveedor;
    if (caso === 'con monto cero') datos.monto = 0;
    await modificar(this, this.f.id, datos);
  },
);

// ── RF-G3-05 · Then ───────────────────────────────────────────────────────────

Then('la factura se actualiza correctamente', async function (this: G3World) {
  status(this.r, 200);
  expect(Number(this.r.body?.data?.id), 'data.id').toBe(this.f.id);
});

Then('la factura queda con monto {float}', async function (this: G3World, monto: number) {
  expect(Number(this.r.body.data.monto), 'data.monto').toBe(monto);
});

Then(
  'el sistema rechaza la modificación porque el número de factura ya pertenece a otra factura',
  async function (this: G3World) {
    rechazo(this.r, 409, 'CONFLICT');
  },
);

// ── RF-G3-06 · When ───────────────────────────────────────────────────────────

When('el usuario da de baja la factura', async function (this: G3World) {
  this.respuesta = await this.facturas.darDeBaja(this.f.id, { apiKey: this.apiKey });
  if (this.r.status === 204) this.f.dadaDeBaja = true;
});

When('el usuario intenta dar de baja una factura que no existe', async function (this: G3World) {
  this.respuesta = await this.facturas.darDeBaja(config.facturaInexistente, { apiKey: this.apiKey });
});

When(
  'el usuario intenta dar de baja una factura con el identificador inválido {string}',
  async function (this: G3World, id: string) {
    this.respuesta = await this.facturas.darDeBaja(id, { apiKey: this.apiKey });
  },
);

// ── RF-G3-06 · Then ───────────────────────────────────────────────────────────

Then('la factura se da de baja correctamente', async function (this: G3World) {
  status(this.r, 204);
  expect(this.r.texto, 'sin cuerpo').toBe('');
});

Then('al consultar el detalle de la factura, el sistema informa que no fue encontrada', async function (this: G3World) {
  rechazo(await this.facturas.consultar(this.f.id, { etiqueta: 'verificación' }), 404, 'NOT_FOUND');
});

Then('en la base de datos el pago de la factura se conserva', async function (this: G3World) {
  const { respuesta, cantidad } = await this.facturas.contarPagos(this.f.id);
  status(respuesta, 200);
  expect(cantidad, 'pagos registrados para la factura dada de baja').toBe(1);
});
