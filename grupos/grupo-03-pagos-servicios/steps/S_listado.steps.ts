// S_listado.steps.ts — RF-G3-01 · Listar facturas (GET /api/v1/facturas?usuarioId=&estado=).

import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { status } from '../support/afirmaciones';
import { config } from '../support/config';
import type { G3World } from '../support/world';

async function listar(world: G3World, filtros: Record<string, string | number>): Promise<void> {
  world.filtrosListado = filtros;
  world.respuesta = await world.facturas.listar(filtros, { apiKey: world.apiKey });
}

function ids(world: G3World): number[] {
  return (world.r.body?.data ?? []).map((f: any) => Number(f.id));
}

// ── When ──────────────────────────────────────────────────────────────────────

When('el usuario consulta las facturas en estado {string}', async function (this: G3World, estado: string) {
  await listar(this, { estado });
});

When('el usuario consulta las facturas del titular en estado {string}', async function (this: G3World, estado: string) {
  await listar(this, { usuarioId: this.titular, estado });
});

When(
  'el usuario consulta las facturas de un usuario con el identificador no numérico {string}',
  async function (this: G3World, usuarioId: string) {
    await listar(this, { usuarioId });
  },
);

When('el usuario consulta las facturas de un usuario que no tiene facturas', async function (this: G3World) {
  await listar(this, { usuarioId: config.usuarioSinFacturas });
});

When('el usuario consulta todas las facturas sin filtros', async function (this: G3World) {
  await listar(this, {});
});

// Regla transversal (con API key inválida).
When(/^el usuario intenta (consultar el listado de facturas|consultar el detalle de una factura|dar de baja una factura)$/,
  async function (this: G3World, accion: string) {
    const opciones = { apiKey: this.apiKey };
    const id = config.facturaInexistente; // si la autenticación fallara, no se toca ninguna factura real
    this.respuesta =
      accion === 'consultar el listado de facturas' ? await this.facturas.listar({}, opciones)
      : accion === 'consultar el detalle de una factura' ? await this.facturas.consultar(id, opciones)
      : await this.facturas.darDeBaja(id, opciones);
  });

// ── Then ──────────────────────────────────────────────────────────────────────

Then('el sistema devuelve el listado de facturas', async function (this: G3World) {
  status(this.r, 200);
  expect(Array.isArray(this.r.body?.data), 'data es un listado').toBe(true);
});

Then('todas las facturas del listado están en estado {string}', async function (this: G3World, estado: string) {
  const data: any[] = this.r.body.data;
  expect(data.length, 'el listado tiene facturas').toBeGreaterThan(0);
  const otras = data.filter((f) => f.estado !== estado).map((f) => `${f.id}:${f.estado}`);
  expect(otras, `facturas que no están en estado ${estado}`).toEqual([]);
});

Then('todas las facturas del listado pertenecen al titular', async function (this: G3World) {
  const data: any[] = this.r.body.data;
  expect(data.length, 'el listado tiene facturas').toBeGreaterThan(0);
  const ajenas = data.filter((f) => Number(f.usuario_id) !== this.titular).map((f) => `${f.id}:usuario ${f.usuario_id}`);
  expect(ajenas, `facturas que no son del titular ${this.titular}`).toEqual([]);
});

Then('el listado está vacío', async function (this: G3World) {
  expect(this.r.body.data, 'data').toEqual([]);
});

Then('el listado tiene como máximo 100 facturas', async function (this: G3World) {
  expect(this.r.body.data.length, 'cantidad de facturas').toBeLessThanOrEqual(100);
});

Then('la factura aparece en el listado', async function (this: G3World) {
  expect(
    ids(this),
    'el listado está limitado a 100 registros; si el titular tiene más pendientes, la factura puede quedar fuera',
  ).toContain(this.f.id);
});

Then('la factura no aparece en el listado', async function (this: G3World) {
  expect(ids(this), 'ids del listado').not.toContain(this.f.id);
});
