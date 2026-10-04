import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../../../playwright/pages/BasePage';

export class ReportesPage extends BasePage {
  readonly page: Page;

  // Filtros
  readonly filtroTitular: Locator;
  readonly filtroDesde: Locator;
  readonly filtroHasta: Locator;
  readonly botonAplicarFiltros: Locator;

  // Indicadores del resumen
  readonly cardCantidadMovimientos: Locator;
  readonly cardTotalMovimientos: Locator;
  readonly cardPrimero: Locator;
  readonly cardUltimo: Locator;

  // Tabla de desglose
  readonly tablaDesglose: Locator;
  readonly filasDesglose: Locator;

  // Estados
  readonly estadoVacio: Locator;
  readonly loader: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    // Filtros
    this.filtroTitular = page.getByLabel(/titular/i);
    this.filtroDesde = page.getByLabel(/desde/i);
    this.filtroHasta = page.getByLabel(/hasta/i);
    this.botonAplicarFiltros = page.getByRole('button', { name: /aplicar|filtrar/i });

    // Resumen
    this.cardCantidadMovimientos = page.getByTestId('resumen-cantidad');
    this.cardTotalMovimientos = page.getByTestId('resumen-total');
    this.cardPrimero = page.getByTestId('resumen-primero');
    this.cardUltimo = page.getByTestId('resumen-ultimo');

    // Tabla
    this.tablaDesglose = page.getByRole('table');
    this.filasDesglose = this.tablaDesglose.getByRole('row');

    // Estados
    this.estadoVacio = page.getByText(/no hay (datos|resultados|movimientos)/i);
    this.loader = page.getByTestId('loader');
  }

  async goto() {
    await this.page.goto('/reportes');
    await this.esperarCarga();
  }

  async esperarCarga() {
    // Espera a que desaparezca el loader si existe
    if (await this.loader.count() > 0) {
      await this.loader.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  async aplicarFiltroPorTitular(usuarioId: number | string) {
    await this.filtroTitular.fill(String(usuarioId));
    await this.botonAplicarFiltros.click();
    await this.esperarCarga();
  }

  async aplicarFiltroPorFecha(desde: string, hasta: string) {
    await this.filtroDesde.fill(desde);
    await this.filtroHasta.fill(hasta);
    await this.botonAplicarFiltros.click();
    await this.esperarCarga();
  }

  async obtenerFilasDesglose(): Promise<{ tipo: string; cantidad: number; total: number }[]> {
    const filas = await this.filasDesglose.all();
    const resultado: { tipo: string; cantidad: number; total: number }[] = [];

    // Saltear la primera fila (encabezado)
    for (let i = 1; i < filas.length; i++) {
      const celdas = await filas[i].getByRole('cell').allTextContents();
      if (celdas.length >= 3) {
        resultado.push({
          tipo: celdas[0].trim(),
          cantidad: parseInt(celdas[1].trim(), 10),
          total: parseFloat(celdas[2].trim()),
        });
      }
    }
    return resultado;
  }

  async expectResumenVisible() {
    await expect(this.cardCantidadMovimientos).toBeVisible();
    await expect(this.cardTotalMovimientos).toBeVisible();
  }

  async expectEstadoVacio() {
    await expect(this.estadoVacio).toBeVisible();
  }
}
