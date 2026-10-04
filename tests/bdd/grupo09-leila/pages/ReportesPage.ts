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

  /**
   * Si la web recibio un 429 de la API compartida, el filtro no muestra datos:
   * se recarga la pagina y se vuelve a filtrar hasta que aparezca el resultado.
   */
  async filterUntil(usuarioId: string | number, ready: () => Promise<boolean>, attempts = 4): Promise<void> {
    for (let i = 1; i <= attempts; i++) {
      await this.open();
      await this.filterByUser(usuarioId);
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if (await ready().catch(() => false)) return;
        await this.page.waitForTimeout(1_000);
      }
      await this.page.waitForTimeout(i * 10_000);
    }
  }

  /** Lee el numero de movimientos ("1.234" -> 1234). */
  async movimientos(): Promise<number> {
    const text = await this.movimientosValue.innerText();
    return Number(text.replace(/\D/g, ''));
  }
}
