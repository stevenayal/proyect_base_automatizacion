import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { SandboxUsersApi } from '../support/sandbox-users-api';
import { SandboxReportesApi } from '../support/sandbox-reportes-api';
import { SandboxMovimientosApi, type TipoMovimiento } from '../support/sandbox-movimientos-api';
import type { SandboxWorld } from '../support/world';

Given('que inicio sesión en el sandbox con un usuario activo', async function (this: SandboxWorld) {
  await this.course.chooseAutomationCourse();
  if (!this.api) throw new Error('Falta el contexto de API');
  this.activeUser = await new SandboxUsersApi(this.api).firstActiveUser();
  await this.login.signInWith(this.activeUser.email);
  await expect(this.page.getByRole('heading', { name: `Bienvenido, ${this.activeUser.nombre}` })).toBeVisible();
});

Given('que obtengo el resumen y el desglose actuales de ese usuario', async function (this: SandboxWorld) {
  if (!this.api || !this.activeUser) throw new Error('Falta el usuario activo o el contexto de API');
  const reportesApi = new SandboxReportesApi(this.api);
  this.resumenPrevio = await reportesApi.resumen(Number(this.activeUser.id));
  this.cantidadPreviaPorTipo = await reportesApi.cantidadPorTipo(Number(this.activeUser.id), 'transferencia');
});

Given(
  'que registro un movimiento de tipo {string} por {string} para ese usuario',
  async function (this: SandboxWorld, tipo: string, monto: string) {
    if (!this.api || !this.activeUser) throw new Error('Falta el usuario activo o el contexto de API');
    this.movimientoId = await new SandboxMovimientosApi(this.api).crear(
      Number(this.activeUser.id),
      tipo as TipoMovimiento,
      Number(monto),
      `BDD reportes run ${Date.now()}`,
    );
  },
);

Given('doy de baja ese movimiento', async function (this: SandboxWorld) {
  if (!this.api || !this.movimientoId) throw new Error('Falta el movimiento creado');
  await new SandboxMovimientosApi(this.api).darDeBaja(this.movimientoId);
});

When('abro el reporte de ese usuario', async function (this: SandboxWorld) {
  if (!this.activeUser) throw new Error('Falta el usuario activo');
  await this.reportes.open();
  await this.reportes.filtrarPorUsuario(String(this.activeUser.id));
  await this.reportes.esperarCargaCompleta();
});

Then('veo el resumen de movimientos del usuario', async function (this: SandboxWorld) {
  await expect(this.reportes.resumen).toBeVisible();
});

Then('veo el desglose de movimientos por tipo', async function (this: SandboxWorld) {
  const hayTabla = await this.reportes.listaMovimientos.isVisible().catch(() => false);
  const sinResultados = await this.reportes.movimientosVacio.isVisible().catch(() => false);
  expect(hayTabla || sinResultados, 'El desglose debe mostrar la tabla o el estado "Sin resultados."').toBeTruthy();
});

Then('el resumen cuenta un movimiento más que antes', async function (this: SandboxWorld) {
  if (!this.resumenPrevio) throw new Error('Falta el resumen previo');
  const cantidadActual = await this.reportes.cantidadMovimientos();
  expect(
    cantidadActual,
    'El movimiento dado de baja debe seguir contando en el resumen (los reportes no filtran por "activo")',
  ).toBe(this.resumenPrevio.cantidad_movimientos + 1);
});

Then('el desglose por tipo {string} cuenta un movimiento más que antes', async function (this: SandboxWorld, tipo: string) {
  if (this.cantidadPreviaPorTipo === undefined) throw new Error('Falta la cantidad previa por tipo');
  const cantidadActual = await this.reportes.cantidadEnFila(tipo);
  expect(
    cantidadActual,
    `El movimiento dado de baja debe seguir contando en el desglose de "${tipo}" (los reportes no filtran por "activo")`,
  ).toBe(this.cantidadPreviaPorTipo + 1);
});
