import type { Locator, Page } from '@playwright/test';

/**
 * Contrato de testids de /reportes verificado contra el código real de
 * aiquaa-sandbox-web (app/reportes/page.tsx + lib/testids.ts), no inventado.
 */
const ids = {
  field: (name: string) => `reportes-field-${name}`,
  loading: 'reportes-loading',
  error: 'reportes-error',
  detail: 'reportes-detail',
};

const movimientosIds = {
  loading: 'reportes-movimientos-loading',
  error: 'reportes-movimientos-error',
  empty: 'reportes-movimientos-empty',
  count: 'reportes-movimientos-count',
  list: 'reportes-movimientos-list',
  row: (tipo: string) => `reportes-movimientos-row-${tipo}`,
};

export class ReportesPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/reportes');
  }

  async filtrarPorUsuario(usuarioId: string): Promise<void> {
    await this.page.getByTestId(ids.field('usuarioId')).fill(usuarioId);
  }

  get resumen(): Locator {
    return this.page.getByTestId(ids.detail);
  }

  get resumenCargando(): Locator {
    return this.page.getByTestId(ids.loading);
  }

  get resumenError(): Locator {
    return this.page.getByTestId(ids.error);
  }

  get listaMovimientos(): Locator {
    return this.page.getByTestId(movimientosIds.list);
  }

  get movimientosVacio(): Locator {
    return this.page.getByTestId(movimientosIds.empty);
  }

  get movimientosError(): Locator {
    return this.page.getByTestId(movimientosIds.error);
  }

  filaDeTipo(tipo: string): Locator {
    return this.page.getByTestId(movimientosIds.row(tipo));
  }

  /** Espera a que tanto el resumen como el desglose terminen de cargar (éxito o error). */
  async esperarCargaCompleta(): Promise<void> {
    await Promise.race([
      this.resumen.waitFor({ state: 'visible' }),
      this.resumenError.waitFor({ state: 'visible' }),
    ]);
    await Promise.race([
      this.listaMovimientos.waitFor({ state: 'visible' }),
      this.movimientosVacio.waitFor({ state: 'visible' }),
      this.movimientosError.waitFor({ state: 'visible' }),
    ]);
  }

  /** Lee la cantidad de movimientos del resumen (dt "Movimientos" + dd). */
  async cantidadMovimientos(): Promise<number> {
    const texto = await this.resumen.locator('dt:text-is("Movimientos") + dd').innerText();
    return Number(texto.trim());
  }

  /** Lee la cantidad de la fila del desglose para un tipo de movimiento dado. */
  async cantidadEnFila(tipo: string): Promise<number> {
    const texto = await this.filaDeTipo(tipo).locator('td').nth(1).innerText();
    return Number(texto.trim());
  }
}
