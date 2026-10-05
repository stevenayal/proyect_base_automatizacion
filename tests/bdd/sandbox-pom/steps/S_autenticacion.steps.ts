import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { SandboxUsersApi } from '../support/sandbox-users-api';
import type { SandboxWorld } from '../support/world';

Given('que estoy en el inicio de sesión del sandbox', async function (this: SandboxWorld) {
  await this.course.chooseAutomationCourse();
});

Given('que obtengo un usuario activo desde la API del sandbox', async function (this: SandboxWorld) {
  if (!this.api) throw new Error('Falta el contexto de API');
  this.activeUser = await new SandboxUsersApi(this.api).firstActiveUser();
});

When('ingreso con el email inexistente {string}', async function (this: SandboxWorld, email: string) {
  await this.login.signInWith(email);
});

When('ingreso con el usuario activo consultado', async function (this: SandboxWorld) {
  if (!this.activeUser) throw new Error('No se consultó un usuario activo');
  await this.login.signInWith(this.activeUser.email);
});

Then('veo el mensaje de acceso {string}', async function (this: SandboxWorld, message: string) {
  await expect(this.login.error).toHaveText(message);
});

Then('veo la bienvenida del usuario activo', async function (this: SandboxWorld) {
  if (!this.activeUser) throw new Error('No se consultó un usuario activo');
  await expect(this.page.getByRole('heading', { name: `Bienvenido, ${this.activeUser.nombre}` })).toBeVisible();
});
