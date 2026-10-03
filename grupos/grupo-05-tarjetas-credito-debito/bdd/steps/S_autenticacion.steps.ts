// S_autenticacion.steps.ts — glue del acceso del cliente.
// Un step = una llamada a LoginPage; los locators viven en el Page Object.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Grupo05World } from '../support/world';

Given('que el cliente abre la pantalla de login del curso {string}',
  async function (this: Grupo05World, curso: string) {
    await this.login.open(curso);
  });

When('el cliente ingresa el email {string}', async function (this: Grupo05World, email: string) {
  await this.login.fillEmail(email);
});

When('el cliente inicia sesión con el email {string}', async function (this: Grupo05World, email: string) {
  await this.login.loginWith(email);
  await this.login.expectSesionIniciada();
});

When('el cliente envía el formulario de login', async function (this: Grupo05World) {
  await this.login.submit();
});

Then('el botón de ingresar está deshabilitado', async function (this: Grupo05World) {
  await this.login.expectSubmitDisabled();
});

Then('el botón de ingresar está habilitado', async function (this: Grupo05World) {
  expect(await this.login.isSubmitEnabled()).toBe(true);
});

Then('el sistema muestra el error de login {string}', async function (this: Grupo05World, texto: string) {
  await this.login.expectEmailError(texto);
});
