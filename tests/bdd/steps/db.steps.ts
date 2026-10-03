// db.steps.ts — verificación en base de datos vía POST /api/v1/sql/select.
//
// Los nombres de tabla y columna llegan desde el .feature, así que se validan
// contra una whitelist local antes de interpolarlos en el SQL; los valores
// viajan siempre como parámetros ($1, $2), nunca concatenados.

import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AiquaaWorld } from '../support/world';

const TABLAS_PERMITIDAS = new Set([
  'tarjetas', 'usuarios', 'cuentas', 'movimientos', 'transferencias', 'notificaciones',
]);

const IDENTIFICADOR = /^[a-z_][a-z0-9_]*$/;

function validarIdentificador(nombre: string, tipo: 'tabla' | 'columna'): string {
  if (!IDENTIFICADOR.test(nombre)) {
    throw new Error(`Nombre de ${tipo} inválido: "${nombre}"`);
  }
  if (tipo === 'tabla' && !TABLAS_PERMITIDAS.has(nombre)) {
    throw new Error(
      `Tabla "${nombre}" fuera de la whitelist (${[...TABLAS_PERMITIDAS].join(', ')})`);
  }
  return nombre;
}

/** Ejecuta un SELECT parametrizado contra el endpoint SQL del sandbox. */
async function consultar(world: AiquaaWorld, sql: string, params: unknown[]): Promise<any[]> {
  const respuesta = await world.conReintento(
    () => world.apiContext!.post('/api/v1/sql/select', { data: { sql, params } }));
  const cuerpo = await respuesta.json();
  expect(respuesta.status(), `SQL falló: ${JSON.stringify(cuerpo)}`).toBe(200);
  return cuerpo.data ?? [];
}

Then('en la base de datos, {string} con id {string} tiene {string} igual a {string}',
  async function (this: AiquaaWorld, tabla: string, alias: string, columna: string, esperado: string) {
    const t = validarIdentificador(tabla, 'tabla');
    const c = validarIdentificador(columna, 'columna');
    const id = this.context[alias];
    expect(id, `no hay ningún valor guardado como "${alias}"`).toBeDefined();

    const filas = await consultar(this, `SELECT ${c} FROM ${t} WHERE id = $1`, [id]);
    expect(filas.length, `no existe ${t} con id ${id}`).toBe(1);
    expect(String(filas[0][c])).toBe(this.resolve(esperado));
  });

Then('en la base de datos, {string} tiene {int} fila(s) con {string} igual a {string}',
  async function (this: AiquaaWorld, tabla: string, cantidad: number, columna: string, valor: string) {
    const t = validarIdentificador(tabla, 'tabla');
    const c = validarIdentificador(columna, 'columna');

    const filas = await consultar(
      this, `SELECT COUNT(*)::int AS total FROM ${t} WHERE ${c} = $1`, [this.resolve(valor)]);
    expect(Number(filas[0].total)).toBe(cantidad);
  });

Then('en la base de datos, no existe ninguna fila en {string} con {string} igual a {string}',
  async function (this: AiquaaWorld, tabla: string, columna: string, valor: string) {
    const t = validarIdentificador(tabla, 'tabla');
    const c = validarIdentificador(columna, 'columna');

    const filas = await consultar(
      this, `SELECT COUNT(*)::int AS total FROM ${t} WHERE ${c} = $1`, [this.resolve(valor)]);
    expect(Number(filas[0].total)).toBe(0);
  });
