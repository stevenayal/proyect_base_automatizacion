// OrdenesDetallePage — RF-G7-03: /ordenes/{id} muestra la orden con sus ítems.
//
// La cabecera es un <dl> y sus <dd> NO tienen data-testid: hay que scopearlos
// por el <dt> que los precede. Las etiquetas reales son:
//   Usuario | Producto principal | Monto | Estado   (verificado 2026-10-02)

import { expect, type Locator, type Page } from '@playwright/test';

export class OrdenesDetallePage {
  constructor(private readonly page: Page) {}

  private get cabecera() {
    return this.page.getByTestId('ordenes-detail');
  }

  /** El <dd> que corresponde a una etiqueta de la cabecera. */
  private campo(etiqueta: string): Locator {
    return this.cabecera
      .locator('div')
      .filter({ has: this.page.locator('dt', { hasText: etiqueta }) })
      .locator('dd')
      .first();
  }

  /** Tabla de ítems de la orden indicada. */
  tablaItems(id: string): Locator {
    return this.page.getByTestId(`ordenes-row-${id}-items`);
  }

  async abrir(id: string): Promise<void> {
    await this.page.goto(`/ordenes/${id}`);
    await this.expectCabeceraYItems(id);
  }

  async expectCabeceraYItems(id: string): Promise<void> {
    await expect(this.cabecera).toBeVisible();
    await expect(this.tablaItems(id)).toBeVisible();
  }

  /**
   * Monto leído del atributo `data-value`, no del texto.
   * En pantalla sale "320,98" (formato local) y el atributo trae "320.98".
   */
  async monto(): Promise<number> {
    const crudo = await this.campo('Monto').locator('[data-value]').getAttribute('data-value');
    if (crudo === null) throw new Error('El detalle no expone el atributo data-value del monto');
    return Number(crudo);
  }

  async estado(): Promise<string> {
    return (await this.campo('Estado').innerText()).trim();
  }

  async productoPrincipal(): Promise<string> {
    return (await this.campo('Producto principal').innerText()).trim();
  }

  /** ¿La tabla de ítems contiene el producto buscado? */
  async contieneProducto(id: string, producto: string): Promise<boolean> {
    return (await this.tablaItems(id).getByText(producto, { exact: false }).count()) > 0;
  }

  /** Etiquetas de la cabecera, útil para diagnóstico. */
  async etiquetasCabecera(): Promise<string[]> {
    return (await this.cabecera.locator('dt').allInnerTexts()).map((t) => t.trim());
  }
}