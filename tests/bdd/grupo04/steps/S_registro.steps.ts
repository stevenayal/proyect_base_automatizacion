import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Grupo04World } from '../support/world';

function datosNuevos() {
  return { nombre: 'QA BDD Grupo04', email: `qa.g04.${randomUUID()}@example.com`, documento: `${Date.now()}${Math.floor(Math.random() * 10000)}` };
}
Given('que el operador está en el formulario de nuevo usuario', async function (this: Grupo04World) {
  await this.usuarios.abrir();
});
When('registra un usuario nuevo con datos obligatorios válidos', async function (this: Grupo04World) {
  this.datos = datosNuevos();
  await this.usuarios.registrar(this.datos);
});
When('registra un usuario nuevo incluyendo los datos opcionales', async function (this: Grupo04World) {
  this.datos = { ...datosNuevos(), nacimiento: '1995-06-15', direccion: 'Direccion ficticia QA 04' };
  await this.usuarios.registrar(this.datos);
});
Then('la ficha muestra los datos del usuario registrado', async function (this: Grupo04World) {
  this.ficha = await this.usuarios.leerFicha();
  expect(this.ficha.nombre).toBe(this.datos.nombre);
  expect(this.ficha.email).toBe(this.datos.email);
  expect(this.ficha.documento).toBe(this.datos.documento);
  expect(this.postAltas).toBe(1);
});
Then('la ficha conserva la fecha de nacimiento y la dirección', async function (this: Grupo04World) {
  expect(this.ficha?.nacimiento).toBe(this.datos.nacimiento);
  expect(this.ficha?.direccion).toBe(this.datos.direccion);
});
When('intenta registrar un usuario con correo inválido', async function (this: Grupo04World) {
  this.datos = { ...datosNuevos(), email: 'correo-invalido' };
  await this.usuarios.registrar(this.datos);
});
Then('el correo es inválido y el formulario impide el alta', async function (this: Grupo04World) {
  expect(await this.usuarios.validacionCorreo()).toEqual({ formatoInvalido: true, formularioValido: false });
  expect(await this.usuarios.formularioVisible()).toBe(true);
  expect(this.postAltas).toBe(0);
});
When('intenta registrar un usuario sin completar los campos obligatorios', async function (this: Grupo04World) {
  await this.usuarios.enviar();
});
Then('los campos obligatorios están pendientes y el formulario impide el alta', async function (this: Grupo04World) {
  expect(await this.usuarios.camposPendientes()).toEqual([true, true, true]);
  expect(await this.usuarios.formularioVisible()).toBe(true);
  expect(this.postAltas).toBe(0);
});
