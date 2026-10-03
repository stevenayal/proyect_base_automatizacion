// S_ORDENES_ENLAZADO_ANDREA.steps.ts — pasos en lenguaje de negocio del escenario
// OE-G07-01 (Grupo 07, Andrea Escurra).
//
// Regla de la skill: los pasos son GLUE. Acá no hay ningun locator y ningun
// `page.*` de UI: los pasos delegan a un Page Object o a la API del sandbox.
//
// Excepcion documentada: quedan tres `page.goto` / `page.url` de navegacion
// pura (`navego a`, entrada al formulario y lectura de la URL tras el submit).
// La propia skill lista "navegacion" como parte de la whitelist de `pages/`,
// pero moverlos exigiria un metodo `navegarA()` generico que no aporta valor
// con un solo escenario. Si manana hay mas escenarios que navegan a rutas
// distintas, conviene entonces si.

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { Grupo07World } from '../support/world';

// Dato de prueba. El uuid en el producto es obligatorio: el sandbox es
// compartido y tiene miles de órdenes, así que un nombre fijo chocaría con
// datos de otros grupos.
const PRODUCTO_BASE = 'Teclado';
const CANTIDAD = 2;
const PRECIO_UNITARIO = 119.99;

Given('que obtengo un usuario activo del sandbox', async function (this: Grupo07World) {
  this.activeUser = await this.usuarios.primerActivo();
});

Given('que estoy autenticado en el sandbox como ese usuario', async function (this: Grupo07World) {
  if (!this.activeUser) throw new Error('No se consultó un usuario activo del sandbox');
  await this.curso.elegirCursoAutomatizacion();
  await this.login.ingresarCon(this.activeUser.email);
  // El front confirma el acceso con un encabezado de bienvenida; esperarlo acá
  // hace que el fallo sea del login y no del primer paso de órdenes.
  await this.login.expectBienvenida(this.activeUser.nombre);
});

When('navego a {string}', async function (this: Grupo07World, ruta: string) {
  await this.page.goto(ruta);
});

Then('veo el listado de órdenes con sus columnas', async function (this: Grupo07World) {
  await this.listado.expectListadoVisible();
  const columnas = await this.listado.columnas();
  expect(columnas.length, 'El listado debe mostrar columnas').toBeGreaterThan(0);
  expect(columnas.join(' ').toLowerCase(), 'El listado debe traer una columna de monto').toContain('monto');
});

When('creo una orden con un ítem válido', async function (this: Grupo07World) {
  const producto = `G7-T6-${randomUUID().slice(0, 8)}-${PRODUCTO_BASE}`;
  this.productoInventado = producto;
  this.ordenCreada = {
    id: '',
    producto,
    cantidad: CANTIDAD,
    precioUnitario: PRECIO_UNITARIO,
  };

  await this.page.goto('/ordenes/new');
  await this.nueva.completarItem(producto, CANTIDAD, PRECIO_UNITARIO);
  const id = await this.nueva.confirmar();
  // El id queda registrado para verificar contra la API y para la limpieza.
  this.ordenCreada!.id = id;
});

Then('soy redirigido al detalle de la orden creada', async function (this: Grupo07World) {
  expect(this.ordenCreada?.id, 'No se registró el id de la orden creada').toBeTruthy();
  expect(this.page.url()).toContain(`/ordenes/${this.ordenCreada!.id}`);
  await this.nueva.expectDetalleVisible();
});

Then('veo el detalle de la orden con cabecera e ítems', async function (this: Grupo07World) {
  if (!this.ordenCreada) throw new Error('No se creó ninguna orden en este escenario');
  await this.detalle.expectCabeceraYItems(this.ordenCreada.id);
});

Then('el detalle muestra el producto que invoqué', async function (this: Grupo07World) {
  if (!this.ordenCreada) throw new Error('No se creó ninguna orden en este escenario');
  const aparece = await this.detalle.contieneProducto(this.ordenCreada.id, this.ordenCreada.producto);
  expect(aparece, `El detalle de la orden ${this.ordenCreada.id} debe listar el producto creado`).toBe(true);
});

Then('el monto del detalle coincide con el del servidor', async function (this: Grupo07World) {
  if (!this.ordenCreada) throw new Error('No se creó ninguna orden en este escenario');
  const delDetalle = await this.detalle.monto();
  const delServidor = await this.ordenes.obtener(this.ordenCreada.id);

  expect(delServidor, `La orden ${this.ordenCreada.id} debe existir en la API`).toBeTruthy();
  // Se compara contra el servidor y NO contra la suma de subtotales: el
  // `subtotal` que guarda la API es el precio unitario, no cantidad × precio.
  expect(delDetalle, 'El monto del detalle debe coincidir con el de la API').toBeCloseTo(
    Number(delServidor!.monto),
    2,
  );
});

Then('el estado de la orden es {string}', async function (this: Grupo07World, estado: string) {
  const estadoVisible = await this.detalle.estado();
  expect(estadoVisible.toLowerCase()).toBe(estado.toLowerCase());
});

Then('la orden existe en la base de datos', async function (this: Grupo07World) {
  if (!this.ordenCreada) throw new Error('No se creó ninguna orden en este escenario');
  const orden = await this.ordenes.obtener(this.ordenCreada.id);

  expect(orden, `La orden ${this.ordenCreada.id} debe existir en la base`).toBeTruthy();
  expect(orden!.activo, 'La orden creada debe estar activa').toBe(true);
  expect(orden!.producto, 'El producto guardado debe ser el que se invocó').toBe(this.ordenCreada.producto);
  expect(orden!.items?.length, 'La orden debe tener al menos un ítem').toBeGreaterThan(0);
});