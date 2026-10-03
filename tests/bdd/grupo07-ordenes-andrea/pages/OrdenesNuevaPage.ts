// OrdenesNuevaPage — RF-G7-02: /ordenes/new crea una orden.
//
// `usuarioId` viene precargado con "1" (verificado 2026-10-02), así que el
// escenario no lo tipea: usa el valor que el front propone.

import { expect, type Page } from '@playwright/test';

export class OrdenesNuevaPage {
  constructor(private readonly page: Page) {}

  private get form() {
    return this.page.getByTestId('ordenes-form');
  }

  /** Completa el primer ítem del formulario. */
  async completarItem(producto: string, cantidad: number, precioUnitario: number): Promise<void> {
    await this.form.getByTestId('ordenes-field-items-0-producto').fill(producto);
    await this.form.getByTestId('ordenes-field-items-0-cantidad').fill(String(cantidad));
    await this.form.getByTestId('ordenes-field-items-0-precioUnitario').fill(String(precioUnitario));
  }

  /**
   * Confirma y espera la redirección al detalle de la orden creada.
   * El front responde con un id en la URL; ese id es el que después se
   * verifica contra la API y se limpia.
   */
  async confirmar(): Promise<string> {
    await this.form.getByTestId('ordenes-submit').click();
    await this.page.waitForURL(/\/ordenes\/\d+/, { timeout: 30_000 });
    return this.idDeLaUrl();
  }

  /** Id de la orden en la URL actual: /ordenes/{id}. */
  idDeLaUrl(): string {
    const match = /\/ordenes\/(\d+)/.exec(this.page.url());
    if (!match) throw new Error(`No se pudo leer el id de la orden en la URL: ${this.page.url()}`);
    return match[1];
  }

  async expectDetalleVisible(): Promise<void> {
    await expect(this.page.getByTestId('ordenes-detail')).toBeVisible();
  }
}