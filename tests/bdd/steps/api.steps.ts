// api.steps.ts — steps genéricos de API contra el sandbox AIQUAA.
// Parametrizados a propósito: un escenario nuevo debería poder armarse
// combinándolos, sin agregar definiciones nuevas.
//
// Los endpoints admiten placeholders `{alias}` con valores guardados en pasos
// anteriores, p. ej. "/api/v1/tarjetas/{tarjetaId}".

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AiquaaWorld } from '../support/world';

/** Lee un valor anidado por notación de punto: "data.estado". */
function valorEn(objeto: any, ruta: string): unknown {
  return ruta.split('.').reduce((acc, clave) => (acc == null ? acc : acc[clave]), objeto);
}

/** Guarda cuerpo y status de la última respuesta en el World. */
async function registrar(world: AiquaaWorld, respuesta: any) {
  world.lastStatus = respuesta.status();
  const texto = await respuesta.text();
  try {
    world.lastBody = texto ? JSON.parse(texto) : null;
  } catch {
    world.lastBody = texto;
  }
}

// ─── Autenticación ──────────────────────────────────────────────────────────

Given('que tengo una API key válida', async function (this: AiquaaWorld) {
  expect(this.apiKey, 'falta SANDBOX_API_KEY en .env').not.toBe('');
  await this.apiContext?.dispose();
  await this.initApi(this.apiKey);
});

Given('que tengo una API key inválida', async function (this: AiquaaWorld) {
  await this.apiContext?.dispose();
  await this.initApi('sbx_invalida_00000000');
});

// ─── Requests ───────────────────────────────────────────────────────────────

When('hago GET a {string}', async function (this: AiquaaWorld, endpoint: string) {
  await registrar(this, await this.conReintento(() => this.apiContext!.get(this.resolve(endpoint))));
});

When('hago POST a {string} con body:',
  async function (this: AiquaaWorld, endpoint: string, body: string) {
    await registrar(this, await this.conReintento(() => this.apiContext!.post(this.resolve(endpoint), {
      data: JSON.parse(this.resolve(body)),
    })));
  });

When('hago PATCH a {string}', async function (this: AiquaaWorld, endpoint: string) {
  await registrar(this, await this.conReintento(() => this.apiContext!.patch(this.resolve(endpoint))));
});

When('hago PATCH a {string} con body:',
  async function (this: AiquaaWorld, endpoint: string, body: string) {
    await registrar(this, await this.conReintento(() => this.apiContext!.patch(this.resolve(endpoint), {
      data: JSON.parse(this.resolve(body)),
    })));
  });

When('hago DELETE a {string}', async function (this: AiquaaWorld, endpoint: string) {
  await registrar(this, await this.conReintento(() => this.apiContext!.delete(this.resolve(endpoint))));
});

// ─── Assertions ─────────────────────────────────────────────────────────────

Then('la respuesta tiene status {int}', function (this: AiquaaWorld, esperado: number) {
  expect(this.lastStatus, `cuerpo: ${JSON.stringify(this.lastBody)}`).toBe(esperado);
});

Then('el campo {string} de la respuesta existe', function (this: AiquaaWorld, ruta: string) {
  expect(valorEn(this.lastBody, ruta), `campo "${ruta}" ausente`).toBeDefined();
});

Then('el campo {string} de la respuesta es {string}',
  function (this: AiquaaWorld, ruta: string, esperado: string) {
    expect(String(valorEn(this.lastBody, ruta))).toBe(this.resolve(esperado));
  });

Then('la respuesta tiene un array {string} con al menos {int} elemento(s)',
  function (this: AiquaaWorld, ruta: string, minimo: number) {
    const valor = valorEn(this.lastBody, ruta);
    expect(Array.isArray(valor), `"${ruta}" no es un array`).toBe(true);
    expect((valor as unknown[]).length).toBeGreaterThanOrEqual(minimo);
  });

Then('el código de error es {string}', function (this: AiquaaWorld, codigo: string) {
  expect(String(valorEn(this.lastBody, 'error.code'))).toBe(codigo);
});

// ─── Contexto entre steps ───────────────────────────────────────────────────

Then('guardo el campo {string} de la respuesta como {string}',
  function (this: AiquaaWorld, ruta: string, alias: string) {
    const valor = valorEn(this.lastBody, ruta);
    expect(valor, `no se puede guardar "${ruta}": el campo no existe`).toBeDefined();
    this.context[alias] = valor;
  });
