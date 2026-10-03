// OrdenesListadoPage — RF-G7-01: /ordenes lista las órdenes en una tabla.

import { expect, type Page } from '@playwright/test';

export class OrdenesListadoPage {
  constructor(private readonly page: Page) {}

  private get tabla() {
    return this.page.getByTestId('ordenes-list');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/ordenes');
    await this.expectListadoVisible();
  }

  async expectListadoVisible(): Promise<void> {
    await expect(this.tabla).toBeVisible();
  }

  /** Columnas de la tabla, en el orden en que las renderiza el front. */
  async columnas(): Promise<string[]> {
    const cabeceras = this.tabla.locator('thead th');
    return (await cabeceras.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  async cantidadFilas(): Promise<number> {
    return this.tabla.locator('[data-testid^="ordenes-row-"]').count();
  }

  /**
   * Monto de una fila leído del ATRIBUTO `data-value`, nunca del texto.
   * En pantalla el monto sale con formato local ("320,98"); comparar texto
   * fallaría siempre. Verificado el 2026-10-02: data-value="320.98".
   */
  async montoDeFila(id: string): Promise<number> {
    const valor = await this.tabla
      .getByTestId(`ordenes-row-${id}`)
      .locator('[data-value]')
      .first()
      .getAttribute('data-value');
    if (valor === null) throw new Error(`La fila ${id} no expone el atributo data-value del monto`);
    return Number(valor);
  }
}