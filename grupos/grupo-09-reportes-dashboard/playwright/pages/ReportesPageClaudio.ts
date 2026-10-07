import { BasePage } from '../../../../playwright/pages/BasePage';

/**
 * Pantalla de Reportes (/reportes): muestra una tabla con el resumen de
 * movimientos agrupados por tipo (cargo_tarjeta, compra_ecommerce, etc).
 */
export class ReportesPage extends BasePage {
  async open(): Promise<void> {
    await this.navigate('/reportes');
  }

  async getResultsCount(): Promise<number> {
    const rows = this.page.locator('table tbody tr');
    await rows
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {
        // si no hay filas, count() de abajo va a devolver 0 igual
      });
    return rows.count();
  }
}
