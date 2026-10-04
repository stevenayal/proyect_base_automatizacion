import type { Locator, Page } from '@playwright/test';

/** Modulo Reportes (/reportes): resumen de movimientos filtrable por usuarioId. */
export class ReportesPage {
  constructor(private readonly page: Page) {}

  get detail(): Locator { return this.page.getByTestId('reportes-detail'); }
  get emptyMessage(): Locator { return this.page.getByTestId('reportes-movimientos-empty'); }
  get movimientosValue(): Locator {
    return this.detail.locator('div').filter({ has: this.page.locator('dt', { hasText: /^Movimientos$/ }) }).locator('dd');
  }

  async open(): Promise<void> {
    await this.page.goto('/reportes');
  }

  async filterByUser(usuarioId: string | number): Promise<void> {
    await this.page.getByTestId('reportes-field-usuarioId').fill(String(usuarioId));
  }

  /** Lee el numero de movimientos ("1.234" -> 1234). */
  async movimientos(): Promise<number> {
    const text = await this.movimientosValue.innerText();
    return Number(text.replace(/\D/g, ''));
  }
}
