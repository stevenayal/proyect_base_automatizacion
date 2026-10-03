// tarjetas.steps.ts — steps web del módulo Tarjetas, apoyados en TarjetasPage.
// El Gherkin habla de tarjetas y estados; los `data-testid` viven en el POM.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { TarjetasPage } from '../../../playwright/pages/TarjetasPage';
import { AiquaaWorld } from '../support/world';

function tarjetasPage(world: AiquaaWorld): TarjetasPage {
  if (!world.tarjetasPage) {
    world.tarjetasPage = new TarjetasPage(world.page!);
  }
  return world.tarjetasPage;
}

Given('el cliente entra al módulo de tarjetas', async function (this: AiquaaWorld) {
  await tarjetasPage(this).abrirDesdeNavegacion();
});

When('el cliente filtra las tarjetas del usuario {string}',
  async function (this: AiquaaWorld, usuarioId: string) {
    await tarjetasPage(this).filtrarPorUsuario(this.resolve(usuarioId));
  });

When('el cliente bloquea la tarjeta {string} desde el listado',
  async function (this: AiquaaWorld, alias: string) {
    await tarjetasPage(this).bloquear(this.resolve(alias));
  });

When('el cliente activa la tarjeta {string} desde el listado',
  async function (this: AiquaaWorld, alias: string) {
    await tarjetasPage(this).activar(this.resolve(alias));
  });

When('el cliente abre el detalle de la tarjeta {string}',
  async function (this: AiquaaWorld, alias: string) {
    await tarjetasPage(this).abrirDetalle(this.resolve(alias));
  });

When('el cliente cambia la marca de la tarjeta {string} a {string}',
  async function (this: AiquaaWorld, alias: string, marca: string) {
    await tarjetasPage(this).editarMarca(this.resolve(alias), marca);
  });

Then('el detalle de la tarjeta muestra {string}', async function (this: AiquaaWorld, texto: string) {
  await tarjetasPage(this).expectDetalleContiene(this.resolve(texto));
});

Then('el listado muestra la tarjeta {string}', async function (this: AiquaaWorld, alias: string) {
  await tarjetasPage(this).expectTarjetaVisible(this.resolve(alias));
});

Then('el listado muestra la tarjeta {string} con estado {string}',
  async function (this: AiquaaWorld, alias: string, estado: string) {
    await tarjetasPage(this).expectEstado(this.resolve(alias), estado);
  });

// ─── Setup de datos del módulo (API) ────────────────────────────────────────

Given('el cliente posee una tarjeta {string} marca {string} registrada',
  async function (this: AiquaaWorld, tipo: string, marca: string) {
    const respuesta = await this.conReintento(() => this.apiContext!.post('/api/v1/tarjetas', {
      data: { usuarioId: Number(process.env.SANDBOX_USUARIO_ID ?? 1), tipo, marca },
    }));
    const cuerpo = await respuesta.json();
    expect(respuesta.status(), `no se pudo crear la tarjeta: ${JSON.stringify(cuerpo)}`).toBe(201);
    this.lastStatus = respuesta.status();
    this.lastBody = cuerpo;
    this.context.tarjetaId = cuerpo.data.id;
  });
