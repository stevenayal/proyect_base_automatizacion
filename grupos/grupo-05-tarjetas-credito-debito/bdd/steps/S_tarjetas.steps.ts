// S_tarjetas.steps.ts — glue del módulo Tarjetas (API, base de datos y web).
// El Gherkin habla de tarjetas y estados: endpoints y SQL viven en TarjetasApi,
// los `data-testid` en TarjetasPage. Los `expect` de negocio quedan en los Then.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Grupo05World } from '../support/world';

// ─── Precondiciones ─────────────────────────────────────────────────────────

Given('que el canal está autenticado con una API key válida', async function (this: Grupo05World) {
  expect(this.apiKey, 'falta SANDBOX_API_KEY en el entorno').not.toBe('');
});

Given('el cliente posee una tarjeta {string} marca {string} registrada',
  async function (this: Grupo05World, tipo: string, marca: string) {
    const alta = await this.api.crear(this.usuarioId, tipo, marca);
    expect(alta.status, `no se pudo crear la tarjeta: ${JSON.stringify(alta.body)}`).toBe(201);
    this.tarjetaId = alta.body.data.id;
    this.ultimaRespuesta = alta;
  });

Given('la tarjeta fue bloqueada por el cliente', async function (this: Grupo05World) {
  const bloqueo = await this.api.bloquear(this.tarjetaRegistrada());
  expect(bloqueo.status, `no se pudo bloquear la tarjeta: ${JSON.stringify(bloqueo.body)}`).toBe(200);
});

// ─── Operaciones por API ────────────────────────────────────────────────────

When('el cliente consulta su tarjeta', async function (this: Grupo05World) {
  this.ultimaRespuesta = await this.api.consultar(this.tarjetaRegistrada());
});

When('el cliente consulta la tarjeta inexistente {string}', async function (this: Grupo05World, id: string) {
  this.ultimaRespuesta = await this.api.consultar(id);
});

When('el cliente bloquea su tarjeta por reporte de pérdida', async function (this: Grupo05World) {
  this.ultimaRespuesta = await this.api.bloquear(this.tarjetaRegistrada());
});

When('el cliente reactiva su tarjeta', async function (this: Grupo05World) {
  this.ultimaRespuesta = await this.api.activar(this.tarjetaRegistrada());
});

// ─── Resultados de negocio (API) ────────────────────────────────────────────

Then('la operación es exitosa', function (this: Grupo05World) {
  expect(this.ultimaRespuesta?.status, JSON.stringify(this.ultimaRespuesta?.body)).toBe(200);
});

Then('la operación es rechazada por tarjeta no encontrada', function (this: Grupo05World) {
  expect(this.ultimaRespuesta?.status, JSON.stringify(this.ultimaRespuesta?.body)).toBe(404);
  expect(this.ultimaRespuesta?.body?.error?.code).toBe('NOT_FOUND');
});

Then('la tarjeta muestra el número enmascarado', function (this: Grupo05World) {
  expect(this.ultimaRespuesta?.body?.data?.numero_enmascarado).toBeTruthy();
});

Then('la tarjeta es de tipo {string} y marca {string}',
  function (this: Grupo05World, tipo: string, marca: string) {
    expect(this.ultimaRespuesta?.body?.data?.tipo).toBe(tipo);
    expect(this.ultimaRespuesta?.body?.data?.marca).toBe(marca);
  });

Then('la tarjeta está en estado {string}', function (this: Grupo05World, estado: string) {
  expect(this.ultimaRespuesta?.body?.data?.estado).toBe(estado);
});

// ─── Persistencia (base de datos) ───────────────────────────────────────────

Then('la base de datos registra la tarjeta con estado {string}',
  async function (this: Grupo05World, estado: string) {
    expect(await this.api.valorEnBaseDeDatos(this.tarjetaRegistrada(), 'estado')).toBe(estado);
  });

Then('la base de datos registra la tarjeta con marca {string}',
  async function (this: Grupo05World, marca: string) {
    expect(await this.api.valorEnBaseDeDatos(this.tarjetaRegistrada(), 'marca')).toBe(marca);
  });

// ─── Interfaz web ───────────────────────────────────────────────────────────

When('el cliente entra al módulo de tarjetas', async function (this: Grupo05World) {
  await this.tarjetas.abrirDesdeNavegacion();
});

When('el cliente filtra sus tarjetas', async function (this: Grupo05World) {
  await this.tarjetas.filtrarPorUsuario(String(this.usuarioId));
});

When('el cliente abre el detalle de la tarjeta registrada', async function (this: Grupo05World) {
  await this.tarjetas.abrirDetalle(String(this.tarjetaRegistrada()));
});

When('el cliente bloquea la tarjeta registrada desde el listado', async function (this: Grupo05World) {
  await this.tarjetas.bloquear(String(this.tarjetaRegistrada()));
});

When('el cliente cambia la marca de la tarjeta registrada a {string}',
  async function (this: Grupo05World, marca: string) {
    await this.tarjetas.editarMarca(String(this.tarjetaRegistrada()), marca);
  });

Then('el listado muestra la tarjeta registrada con estado {string}',
  async function (this: Grupo05World, estado: string) {
    await this.tarjetas.expectEstado(String(this.tarjetaRegistrada()), estado);
  });

Then('el detalle de la tarjeta muestra {string}', async function (this: Grupo05World, texto: string) {
  await this.tarjetas.expectDetalleContiene(texto);
});
