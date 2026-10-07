// S_roles.steps.ts — pasos de negocio de la pantalla Roles (Grupo 10).
// Cada paso es una línea que delega en un Page Object; las comprobaciones viven aquí.

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AiquaaWorld } from '../../../../tests/bdd/support/world';
import { LoginPage } from '../../playwright/pages/LoginPage';
import { RolesPage, ROLES, comoRol } from '../../playwright/pages/RolesPage';
// El sandbox corre en Vercel (arranque en frío) y varios pasos esperan respuestas de la API:
// los 5 s por defecto de Cucumber no alcanzan. Playwright mantiene sus propios límites.
setDefaultTimeout(60_000);

interface UsuarioPrueba {
  id: number;
  email: string;
}

// Datos de cada escenario, sin tocar el World compartido del proyecto base.
const usuarios = new WeakMap<AiquaaWorld, UsuarioPrueba>();

function usuarioDe(world: AiquaaWorld): UsuarioPrueba {
  const usuario = usuarios.get(world);
  if (!usuario) throw new Error('Falta el paso "que existe un usuario de prueba".');
  return usuario;
}

// --- Preparación (una llamada por la API de la web, sin claves) ---

Given('que existe un usuario de prueba', async function (this: AiquaaWorld) {
  const marca = Date.now(); // email y documento únicos en cada escenario
  const email = `qa.s6roles.${marca}@example.com`;
  const respuesta = await this.page!.request.post('/api/proxy/usuarios', {
    data: {
      nombre: 'Usuario BDD Roles',
      email,
      documentoTipo: 'CI',
      documentoNumero: String(marca).slice(-8),
    },
  });
  expect(respuesta.status(), 'crear el usuario de prueba').toBe(201);
  const cuerpo = (await respuesta.json()) as { data: { id: number | string } };
  usuarios.set(this, { id: Number(cuerpo.data.id), email });
});

Given('que el usuario de prueba tiene el rol {string}', async function (this: AiquaaWorld, rol: string) {
  const { id } = usuarioDe(this);
  const respuesta = await this.page!.request.post(`/api/proxy/usuarios/${id}/roles`, {
    data: { roleId: ROLES[comoRol(rol)] },
  });
  expect([200, 201], 'asignar el rol de partida').toContain(respuesta.status());
});

Given('que inicio sesión con el usuario de prueba', async function (this: AiquaaWorld) {
  const login = new LoginPage(this.page!);
  await login.abrir();
  await login.ingresar(usuarioDe(this).email);
});

Given('que estoy en la pantalla de roles', async function (this: AiquaaWorld) {
  await new RolesPage(this.page!).abrir();
});

// --- Acciones ---

When('asigno el rol {string}', async function (this: AiquaaWorld, rol: string) {
  await new RolesPage(this.page!).asignar(comoRol(rol));
});

When('revoco el rol {string}', async function (this: AiquaaWorld, rol: string) {
  await new RolesPage(this.page!).revocar(comoRol(rol));
});

When('confirmo la revocación del rol {string}', async function (this: AiquaaWorld, rol: string) {
  await new RolesPage(this.page!).confirmarRevocacion(comoRol(rol));
});

When('cancelo la revocación del rol {string}', async function (this: AiquaaWorld, rol: string) {
  await new RolesPage(this.page!).cancelarRevocacion(comoRol(rol));
});

// --- Comprobaciones ---

Then('veo el mensaje {string}', async function (this: AiquaaWorld, texto: string) {
  await expect(new RolesPage(this.page!).mensajeExito).toContainText(texto, { timeout: 15_000 });
});

Then('el rol {string} figura como {string}', async function (this: AiquaaWorld, rol: string, estado: string) {
  await expect(new RolesPage(this.page!).fila(comoRol(rol))).toContainText(estado, { timeout: 15_000 });
});

Then('no veo ningún mensaje de éxito', async function (this: AiquaaWorld) {
  await expect(new RolesPage(this.page!).mensajeExito).toHaveCount(0, { timeout: 15_000 });
});