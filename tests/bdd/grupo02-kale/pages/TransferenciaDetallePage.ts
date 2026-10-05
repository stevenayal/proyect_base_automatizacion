import type { Locator, Page } from '@playwright/test';

/** /transferencias/{id}: comprobante de la transferencia creada. */
export class TransferenciaDetallePage {
  constructor(private readonly page: Page) {}

  get exito(): Locator { return this.page.getByTestId('transferencias-success'); }
  get detalle(): Locator { return this.page.getByTestId('transferencias-detail'); }

  campo(etiqueta: string): Locator {
    return this.detalle.locator('div', { has: this.page.locator('dt', { hasText: etiqueta }) }).locator('dd');
  }

  /** Id de la transferencia tomado de la URL /transferencias/{id}. */
  async idDesdeUrl(): Promise<number> {
    await this.page.waitForURL(/\/transferencias\/\d+$/);
    const match = this.page.url().match(/\/transferencias\/(\d+)$/);
    if (!match) throw new Error(`URL inesperada: ${this.page.url()}`);
    return Number(match[1]);
  }
}
