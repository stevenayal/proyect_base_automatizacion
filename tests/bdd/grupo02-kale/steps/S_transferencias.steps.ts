import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { Grupo02World } from '../support/world';

function nuevaDescripcion(tag: string): string {
  return `G02-WEB-${tag}-${Date.now()}`;
}

Given('que obtengo de la base de datos dos cuentas activas en {string}', async function (this: Grupo02World, moneda: string) {
  [this.cuentaOrigen, this.cuentaDestino] = await this.db.dosCuentasActivas(moneda);
});

Given('que estoy en la pantalla de nueva transferencia', async function (this: Grupo02World) {
  await this.transferencias.abrir();
});

When('transfiero {int} desde la cuenta origen hacia la cuenta destino', async function (this: Grupo02World, monto: number) {
  this.descripcion = nuevaDescripcion('OK');
  await this.transferencias.completar({
    origen: this.cuentaOrigen!.id,
    destino: this.cuentaDestino!.id,
    monto,
    descripcion: this.descripcion,
  });
  await this.transferencias.enviar();
  this.transferenciaId = await this.detalle.idDesdeUrl();
});

When('transfiero {int} desde la cuenta origen hacia la misma cuenta origen', async function (this: Grupo02World, monto: number) {
  this.descripcion = nuevaDescripcion('MISMA');
  this.totalAntes = await this.db.contarPorDescripcion(this.descripcion);
  await this.transferencias.completar({
    origen: this.cuentaOrigen!.id,
    destino: this.cuentaOrigen!.id,
    monto,
    descripcion: this.descripcion,
  });
  await this.transferencias.enviar();
});

When('intento transferir {int} desde la cuenta origen hacia la cuenta destino', async function (this: Grupo02World, monto: number) {
  this.descripcion = nuevaDescripcion('MONTO');
  this.totalAntes = await this.db.contarPorDescripcion(this.descripcion);
  await this.transferencias.completar({
    origen: this.cuentaOrigen!.id,
    destino: this.cuentaDestino!.id,
    monto,
    descripcion: this.descripcion,
  });
  await this.transferencias.enviar();
});

When('vuelvo a la pantalla de transferencias y filtro por la cuenta origen', async function (this: Grupo02World) {
  await this.transferencias.abrir();
  await this.transferencias.filtrarPorOrigen(this.cuentaOrigen!.id);
});

Then('veo el comprobante {string}', async function (this: Grupo02World, texto: string) {
  await expect(this.detalle.exito).toHaveText(texto);
});

Then('el comprobante muestra el estado {string}', async function (this: Grupo02World, estado: string) {
  await expect(this.detalle.campo('Estado')).toHaveText(estado);
});

Then('la base de datos registra la transferencia con el monto {int} en estado {string}', async function (this: Grupo02World, monto: number, estado: string) {
  const fila = await this.db.transferencia(this.transferenciaId!);
  expect(fila, 'La transferencia no se encontró en la BD').toBeTruthy();
  expect(Number(fila!.cuenta_origen_id)).toBe(Number(this.cuentaOrigen!.id));
  expect(Number(fila!.cuenta_destino_id)).toBe(Number(this.cuentaDestino!.id));
  expect(Number(fila!.monto)).toBe(monto);
  expect(fila!.estado).toBe(estado);
  expect(fila!.descripcion).toBe(this.descripcion);
});

Then('veo un error de validación que menciona {string}', async function (this: Grupo02World, texto: string) {
  await expect(this.transferencias.error).toContainText(texto);
  await expect(this.page).toHaveURL(/\/transferencias$/);
});

Then('el formulario no se envía y el campo monto queda inválido', async function (this: Grupo02World) {
  // min="0.01" en el input: el navegador bloquea el submit (validación HTML5).
  const valido = await this.transferencias.monto.evaluate((el) => (el as HTMLInputElement).checkValidity());
  expect(valido).toBe(false);
  await expect(this.page).toHaveURL(/\/transferencias$/);
});

Then('la base de datos no registra ninguna transferencia nueva', async function (this: Grupo02World) {
  const despues = await this.db.contarPorDescripcion(this.descripcion!);
  expect(despues).toBe(this.totalAntes ?? 0);
  expect(despues).toBe(0);
});

Then('la transferencia creada aparece en la lista', async function (this: Grupo02World) {
  await expect(this.transferencias.fila(this.transferenciaId!)).toBeVisible();
  await expect(this.transferencias.fila(this.transferenciaId!)).toContainText(this.descripcion!);
});
