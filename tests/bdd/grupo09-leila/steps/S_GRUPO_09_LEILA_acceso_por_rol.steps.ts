import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { LeilaWorld } from '../support/world';

// Glue fino: cada step delega en un Page Object o en la API (arquitectura
// BDD + POM de skills/playwright-ai-agents-skill).

const ADMIN_EMAIL = () => process.env.TEST_USER ?? 'admin@aiquaa.com';

Given('que inicié sesión en el sandbox como administrador', async function (this: LeilaWorld) {
  await this.session.ensureLoggedIn(ADMIN_EMAIL());
});

Given('que obtengo desde la API un usuario activo con el rol {string}', async function (this: LeilaWorld, rol: string) {
  this.usuario = await this.api.usuarioConRol(rol);
  this.attach(`Usuario dinamico: id=${this.usuario.id} (${this.usuario.nombre}) rol=${rol}`, 'text/plain');
});

Given('que obtengo desde la API un usuario activo sin roles asignados', async function (this: LeilaWorld) {
  this.usuario = await this.api.usuarioSinRoles();
  this.attach(`Usuario dinamico sin roles: id=${this.usuario.id} (${this.usuario.nombre})`, 'text/plain');
});

When('consulto sus roles en el módulo Roles', async function (this: LeilaWorld) {
  await this.roles.open();
  await this.roles.searchUser(this.usuario!.id);
});

When('filtro el módulo Reportes por ese usuario', async function (this: LeilaWorld) {
  await this.reportes.open();
  await this.reportes.filterByUser(this.usuario!.id);
});

When('filtro el módulo Reportes por el usuarioId {string}', async function (this: LeilaWorld, usuarioId: string) {
  await this.reportes.open();
  await this.reportes.filterByUser(usuarioId);
});

Then('veo el título {string} con el nombre del usuario', async function (this: LeilaWorld, prefijo: string) {
  await expect(this.roles.title).toHaveText(`${prefijo} ${this.usuario!.nombre}`);
});

Then('el rol {string} figura como {string}', async function (this: LeilaWorld, rol: string, estado: string) {
  const roleId = await this.api.rolId(rol);
  await expect(this.roles.rowForRole(roleId).locator('td').nth(2)).toHaveText(estado);
});

Then('todos los roles figuran como {string}', async function (this: LeilaWorld, estado: string) {
  await expect(this.roles.rows.first()).toBeVisible();
  const estados = await this.roles.rows.locator('td:nth-child(3)').allInnerTexts();
  expect(estados.length).toBeGreaterThan(0);
  expect(estados.map(e => e.trim())).toEqual(estados.map(() => estado));
});

Then('la cantidad de movimientos coincide con el resumen de la API', async function (this: LeilaWorld) {
  const { cantidad_movimientos } = await this.api.resumen(this.usuario!.id);
  this.attach(`API /reportes/resumen -> cantidad_movimientos=${cantidad_movimientos}`, 'text/plain');
  await expect.poll(() => this.reportes.movimientos(), { timeout: 15_000 }).toBe(cantidad_movimientos);
});

Then('veo el mensaje {string}', async function (this: LeilaWorld, mensaje: string) {
  await expect(this.reportes.emptyMessage).toHaveText(mensaje);
});

Then('la cantidad de movimientos mostrada es {int}', async function (this: LeilaWorld, esperado: number) {
  await expect.poll(() => this.reportes.movimientos(), { timeout: 15_000 }).toBe(esperado);
});
