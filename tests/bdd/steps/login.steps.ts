// login.steps.ts — steps del flujo de acceso, apoyados en el Page Object LoginPage.
// Se diferencian de web.steps.ts en que no exponen `data-testid` en el Gherkin:
// el escenario habla en lenguaje de negocio y el POM resuelve los selectores.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { LoginPage } from '../../../playwright/pages/LoginPage';
import { AiquaaWorld } from '../support/world';

function loginPage(world: AiquaaWorld): LoginPage {
  if (!world.loginPage) {
    world.loginPage = new LoginPage(world.page!);
  }
  return world.loginPage;
}

Given('que el cliente abre la pantalla de login del curso {string}',
  async function (this: AiquaaWorld, curso: string) {
    await loginPage(this).open(curso);
  });

When('el cliente ingresa el email {string}',
  async function (this: AiquaaWorld, email: string) {
    await loginPage(this).fillEmail(email);
  });

When('el cliente inicia sesión con el email {string}',
  async function (this: AiquaaWorld, email: string) {
    const login = loginPage(this);
    await login.loginWith(email);
    await login.expectSesionIniciada();
  });

When('el cliente envía el formulario de login', async function (this: AiquaaWorld) {
  await loginPage(this).submit();
});

Then('el botón de ingresar está deshabilitado', async function (this: AiquaaWorld) {
  await loginPage(this).expectSubmitDisabled();
});

Then('el botón de ingresar está habilitado', async function (this: AiquaaWorld) {
  expect(await loginPage(this).isSubmitEnabled()).toBe(true);
});

Then('el sistema muestra el error de login {string}',
  async function (this: AiquaaWorld, texto: string) {
    await loginPage(this).expectEmailError(texto);
  });
