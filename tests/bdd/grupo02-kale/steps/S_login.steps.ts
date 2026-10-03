import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { Grupo02World } from '../support/world';

Given('que estoy en el inicio de sesión del curso de automatización', async function (this: Grupo02World) {
  await this.curso.elegirCursoAutomatizacion();
});

Given('que obtengo de la base de datos un usuario activo con cuentas', async function (this: Grupo02World) {
  this.usuario = await this.db.usuarioActivoConCuentas();
});

When('ingreso con el email {string}', async function (this: Grupo02World, email: string) {
  await this.login.ingresarCon(email);
});

When('ingreso con el email de ese usuario', async function (this: Grupo02World) {
  if (!this.usuario) throw new Error('No se obtuvo un usuario de la BD');
  await this.login.ingresarCon(this.usuario.email);
});

Then('veo el mensaje de error {string}', async function (this: Grupo02World, mensaje: string) {
  await expect(this.login.error).toHaveText(mensaje);
});

Then('veo la bienvenida con su nombre', async function (this: Grupo02World) {
  if (!this.usuario) throw new Error('No se obtuvo un usuario de la BD');
  await expect(this.home.bienvenida(this.usuario.nombre)).toBeVisible();
});

// Paso compuesto reutilizado como Antecedente del feature de transferencias.
Given('que inicié sesión con un usuario activo de la base de datos', async function (this: Grupo02World) {
  this.usuario = await this.db.usuarioActivoConCuentas();
  await this.curso.elegirCursoAutomatizacion();
  await this.login.ingresarCon(this.usuario.email);
  await expect(this.home.bienvenida(this.usuario.nombre)).toBeVisible();
});
