import { Given, When, Then } from '@cucumber/cucumber';
import { Semana06World } from '../../support/semana-06/world';

Given('el navegador esta abierto en el sandbox AIQUAA', function (this: Semana06World) {
  if (!this.loginPage) throw new Error('El navegador y el Page Object deben inicializarse en Before');
});
Given('el usuario navega a la pagina de seleccion de curso', async function (this: Semana06World) {
  await this.loginPage!.navigate();
});
When('selecciona el curso {string}', async function (this: Semana06World, curso: string) {
  await this.loginPage!.selectCurso(curso);
});
When('presiona el boton Continuar', async function (this: Semana06World) {
  await this.loginPage!.clickContinuar();
});
When('ingresa el email {string}', async function (this: Semana06World, email: string) {
  await this.loginPage!.fillEmail(email);
});
When('presiona el boton Ingresar', async function (this: Semana06World) {
  await this.loginPage!.submit();
});
When('presiona el boton Ingresar sin completar el email', async function (this: Semana06World) {
  await this.loginPage!.submitEmpty();
});
Then('el sistema debe mostrar un mensaje de error', async function (this: Semana06World) {
  await this.loginPage!.assertError();
});
Then('el usuario permanece en la pagina de login', async function (this: Semana06World) {
  await this.loginPage!.assertOnLogin();
});
Then('el sistema debe impedir el envio del formulario', async function (this: Semana06World) {
  await this.loginPage!.assertSubmissionPrevented();
});

Then('el sistema debe autenticar al usuario activo', async function (this: Semana06World) {
  await this.loginPage!.assertAuthenticated();
});
Then('el usuario accede a la pagina de inicio con su sesion', async function (this: Semana06World) {
  await this.loginPage!.assertOnHomeWithSession();
});
